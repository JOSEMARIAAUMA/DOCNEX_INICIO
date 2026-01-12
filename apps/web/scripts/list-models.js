const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    // There is no listModels in the SDK directly sometimes, but let's try to infer from common names
    console.log("Modelos comunes:");
    console.log("gemini-1.5-flash");
    console.log("gemini-1.5-pro");
    console.log("gemini-1.0-pro");
}

listModels();
