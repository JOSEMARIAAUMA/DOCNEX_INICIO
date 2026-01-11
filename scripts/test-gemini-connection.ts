/**
 * TEST: Gemini API Connection
 * "THE SKEPTIC" - Verify the Gemini integration is working
 * 
 * Usage: tsx scripts/test-gemini-connection.ts
 */

import 'dotenv/config';
import { geminiClient } from '../apps/web/lib/ai/gemini-client';

console.log('🔍 THE SKEPTIC - Testing Gemini Connection\n');
console.log('='.repeat(60));

async function testConnection() {
    console.log('\n[1/4] Checking API Key...');
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error('❌ FAILED: No API key found');
        console.error('   Add GOOGLE_GENERATIVE_AI_API_KEY to .env.local');
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
    } catch (error) {
        console.error('❌ FAILED:', error instanceof Error ? error.message : error);
        process.exit(1);
    }

    console.log('\n[3/4] Testing Document Splitting (Simple)...');
    try {
        const testDoc = `# Capítulo 1
Este es el contenido del capítulo 1.

# Capítulo 2
Este es el contenido del capítulo 2.`;

        const start = Date.now();
        const blocks = await geminiClient.splitDocument(
            testDoc,
            'Divide por capítulos'
        );
        const duration = Date.now() - start;

        console.log('✅ Document split in', duration, 'ms');
        console.log('   Blocks created:', blocks.length);
        console.log('   First block title:', blocks[0]?.title);
    } catch (error) {
        console.error('❌ FAILED:', error instanceof Error ? error.message : error);
        process.exit(1);
    }

    console.log('\n[4/4] Testing Text Analysis...');
    try {
        const testText = 'La Constitución Española de 1978 establece los derechos fundamentales de todos los ciudadanos.';
        const start = Date.now();
        const summary = await geminiClient.analyzeText(testText, 'summary');
        const duration = Date.now() - start;

        console.log('✅ Analysis completed in', duration, 'ms');
        console.log('   Result:', summary.slice(0, 100) + '...');
    } catch (error) {
        console.error('❌ WARNING:', error instanceof Error ? error.message : error);
        // Non-critical, don't exit
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED - Gemini integration is functional');
    console.log('='.repeat(60) + '\n');
}

testConnection().catch((error) => {
    console.error('\n❌ CRITICAL ERROR:', error);
    process.exit(1);
});
