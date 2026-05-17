import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.models) {
      console.log('Available models (v1beta):');
      data.models.forEach(m => {
        console.log(`- ${m.name} (Supports: ${m.supportedGenerationMethods.join(', ')})`);
      });
    } else {
      console.log('No models found or error:', data);
    }
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

listModels();
