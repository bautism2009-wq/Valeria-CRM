import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { scrapeInstagramProfile } from './scraper.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Configuración recomendada para permitir peticiones del frontend en Vite
app.use(cors({
  origin: '*', // En producción podrías restringir esto a tu domino específico
  methods: ['GET', 'POST'],
}));

app.use(express.json());

// Inicializar Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Usamos el modelo que estaba en tu App.jsx
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" }); 
// Note: App.jsx was calling "gemini-flash-latest", we'll match that if needed, 
// let's actually use gemini-1.5-flash as the equivalent modern version
const flashModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend Valeria funcionando' });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { contents, system_instruction, tools, generationConfig, instagramUrl } = req.body;

    if (!contents) {
      return res.status(400).json({ error: 'Faltan contenidos en la solicitud' });
    }

    // Convertir el system_instruction string que pasaban en frontend
    let systemInstructionContent = system_instruction?.parts?.[0]?.text || "";

    if (instagramUrl) {
      const scrapedData = await scrapeInstagramProfile(instagramUrl);
      if (scrapedData) {
        systemInstructionContent += "\n\n" + scrapedData;
      }
    }
    
    // Simplificamos los tools para evitar errores de esquema en el SDK de Node
    // Si el frontend envía google_search, nos aseguramos que el SDK lo entienda
    let modelTools = [];
    if (tools && tools.length > 0) {
      modelTools = tools.map(t => {
        if (t.google_search) return { googleSearchRetrieval: {} };
        return t;
      });
    }

    const configuredModel = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      systemInstruction: systemInstructionContent,
      // tools: modelTools, // <-- COMENTADO TEMPORALMENTE para evitar gasto de cuota de búsqueda
    });

    const result = await configuredModel.generateContent({
      contents: contents.map(content => ({
        role: content.role,
        parts: content.parts.map(part => {
          if (part.inlineData) {
            return {
              inlineData: {
                data: part.inlineData.data,
                mimeType: part.inlineData.mimeType
              }
            };
          }
          return { text: part.text };
        })
      })),
      generationConfig: {
        maxOutputTokens: generationConfig?.maxOutputTokens || 1200,
        temperature: generationConfig?.temperature || 0.75,
      },
    });
    
    const response = await result.response;
    const text = response.text();
    
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

    res.json({
      success: true,
      data: {
        text: text,
        groundingMetadata: groundingMetadata
      }
    });

  } catch (error) {
    console.error('❌ ERROR GEMINI:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: "Revisá la consola del backend para más info" 
    });
  }
});

// === UNIFICACIÓN DE FRONTEND Y BACKEND PARA HOSTING ===
// Servimos los archivos estáticos de la carpeta `dist` de React
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

app.use(express.static(distPath));

// Cualquier otra ruta que no sea de API, devuelve el index.html para que el router de React funcione.
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`🚀 Computadora de Valeria encendida en el puerto ${port}`);
});
