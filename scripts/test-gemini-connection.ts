
import * as dotenv from 'dotenv';
import path from 'path';

async function run() {
    dotenv.config({ path: path.join(__dirname, '../apps/web/.env.local') });
    const { geminiClient } = await import('../apps/web/lib/ai/gemini-client');

    console.log('🔍 THE SKEPTIC - Testing Gemini Connection\n');
    console.log('='.repeat(60));

    console.log('\n[1/4] Checking API Key...');
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error('❌ FAILED: No API key found');
        process.exit(1);
    }

    console.log('✅ API key found:', apiKey.slice(0, 10) + '...');

    console.log('\n[2/4] Testing Basic Chat...');
    try {
        const start = Date.now();
        const response = await geminiClient.chat('Hola, ¿estás funcionando?');
        const duration = Date.now() - start;
        console.log('✅ Chat response received in', duration, 'ms');
        console.log('   Response:', response.slice(0, 100) + '...');
    } catch (error: any) {
        console.error('❌ FAILED:', error.message);
    }
}

run().catch(console.error);
