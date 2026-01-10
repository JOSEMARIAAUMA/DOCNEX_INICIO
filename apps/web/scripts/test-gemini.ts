// Test script for Gemini API connection
// Run with: npx tsx scripts/test-gemini.ts

import { config } from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { resolve } from 'path';

// Load .env.local explicitly
config({ path: resolve(__dirname, '../.env.local') });

async function testGemini() {
    console.log('🧪 Testing Gemini API Connection...\n');

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
        console.error('❌ ERROR: GOOGLE_GENERATIVE_AI_API_KEY not found in environment');
        console.log('   Add it to apps/web/.env.local');
        process.exit(1);
    }

    console.log('✓ API Key found');
    console.log(`  Key preview: ${apiKey.slice(0, 10)}...${apiKey.slice(-4)}\n`);

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        console.log('📡 Sending test prompt to Gemini 2.5 Flash...');

        const result = await model.generateContent('Responde solo con "OK" si me entiendes.');
        const response = result.response.text();

        console.log('✓ Response received:', response);
        console.log('\n✅ SUCCESS: Gemini API is working correctly!');
        console.log('   You can now use AI-powered document splitting.');
    } catch (error: any) {
        console.error('❌ ERROR:', error.message);
        if (error.message.includes('API_KEY_INVALID')) {
            console.log('   Your API key is invalid. Get a new one from:');
            console.log('   https://aistudio.google.com/app/apikey');
        }
        process.exit(1);
    }
}

testGemini();
