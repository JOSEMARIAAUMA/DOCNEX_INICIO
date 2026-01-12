
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function listModels() {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
    if (!apiKey) {
        console.error("No API key found");
        return;
    }
    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        // The SDK doesn't have a direct "listModels" easily exposed in all versions, 
        // but we can try to fetch it via the underlying REST if needed.
        // Or we can just try a few model names.

        const modelsToTry = [
            'gemini-1.5-flash',
            'gemini-2.5-flash',
            'gemini-3-flash',
            'gemini-3.0-flash',
            'gemini-3-pro',
            'gemini-2.0-flash'
        ];

        console.log("Testing model availability...");
        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1' });
                console.log(`Testing ${modelName} on v1...`);
                await model.generateContent("test");
                console.log(`✅ ${modelName} is AVAILABLE`);
            } catch (e: any) {
                console.log(`❌ ${modelName} failed: ${e.message}`);
            }
        }
    } catch (error) {
        console.error("List models failed", error);
    }
}

listModels();
