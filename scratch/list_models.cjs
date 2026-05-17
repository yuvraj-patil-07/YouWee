const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenAI({ apiKey });

async function listModels() {
  try {
    const models = await genAI.models.listModels();
    console.log('Available models:');
    models.forEach(m => console.log(`- ${m.name}`));
  } catch (err) {
    console.error('Error listing models:', err.message);
  }
}

listModels();
