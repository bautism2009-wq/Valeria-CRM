import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    const models = await genAI.getModels();
    console.log("Disponible:");
    models.forEach(model => {
      if (model.name.includes("generateContent")) {
         console.log(model.name);
      } else {
        console.log(model.name, " - ", model.supportedGenerationMethods.join(", "));
      }
    });
  } catch (err) {
    console.error("Error fetching models:", err);
  }
}

listModels();
