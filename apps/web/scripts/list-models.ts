// List available Gemini models for your API key
import { config } from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

async function listModels() {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
        console.error('❌ API Key not found');
        process.exit(1);
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);

        console.log('📋 Fetching available models...\n');

        // Google AI Studio models endpoint
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const data = await response.json();

        console.log('✅ Available models for your API key:\n');
        data.models?.forEach((model: any) => {
            console.log(`  - ${model.name}`);
            console.log(`    Display Name: ${model.displayName}`);
            console.log(`    Supported methods: ${model.supportedGenerationMethods?.join(', ')}\n`);
        });

    } catch (error: any) {
        console.error('❌ ERROR:', error.message);
    }
}

listModels();
