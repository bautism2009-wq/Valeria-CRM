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
  origin: '*',
  methods: ['GET', 'POST'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend Valeria funcionando' });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { contents, system_instruction, tools, generationConfig, instagramUrl } = req.body;

    if (!contents) {
      return res.status(400).json({ error: 'Faltan contenidos en la solicitud' });
    }

    // Extract system instruction
    let systemInstructionText = system_instruction?.parts?.[0]?.text || "";

    if (instagramUrl) {
      const scrapedData = await scrapeInstagramProfile(instagramUrl);
      if (scrapedData) {
        systemInstructionText += "\n\n" + scrapedData;
      }
    }

    // Configure model with system instruction
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      systemInstruction: systemInstructionText,
      generationConfig: {
        maxOutputTokens: generationConfig?.maxOutputTokens || 1200,
        temperature: generationConfig?.temperature || 0.75,
      }
    });

    // Convert contents to proper format
    const chatContents = contents.map(c => ({
      role: c.role === "assistant" ? "model" : "user",
      parts: c.parts.map(p => {
        if (p.inlineData) {
          return {
            inlineData: {
              data: p.inlineData.data,
              mimeType: p.inlineData.mimeType
            }
          };
        }
        return { text: p.text };
      })
    }));

    let result;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        console.log(`🔄 Intentando generación con Gemini (${attempts + 1}/${maxAttempts})...`);
        
        result = await model.generateContent({
          contents: chatContents,
        });

        const text = result.response.text();
        const groundingMetadata = result.response.candidates?.[0]?.groundingMetadata;

        console.log(`✅ Respuesta generada exitosamente`);

        res.json({
          success: true,
          data: {
            text: text,
            groundingMetadata: groundingMetadata
          }
        });
        return;

      } catch (error) {
        attempts++;
        console.error(`❌ Intento ${attempts} falló:`, error.message);

        const errorMessage = error.message || '';
        const is503 = errorMessage.includes('503') || errorMessage.includes('Service Unavailable') || errorMessage.includes('high demand');
        const is429 = errorMessage.includes('429') || errorMessage.includes('Too Many Requests');

        if ((is503 || is429) && attempts < maxAttempts) {
          const waitTime = is429 ? 5000 * attempts : 2000 * attempts;
          console.warn(`⚠️ Error temporal (${is503 ? '503' : '429'}). Reintentando en ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        throw error;
      }
    }

  } catch (error) {
    console.error('❌ ERROR en /api/chat:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
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
