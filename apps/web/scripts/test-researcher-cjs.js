
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/web/.env.local' });
const path = require('path');

async function stressTestResearcher() {
    // We'll import the agent using require or mock the logic if ts-node is problematic
    // Since LibrarianAgent was successful, let's try to run this with ts-node if possible, 
    // but if not, let's create a pure CJS version of the logic for testing.

    console.log("🚀 INICIANDO PRUEBA DEL AGENTE INVESTIGADOR (CJS)");
    console.log("----------------------------------------------");

    const { ResearcherAgent } = require('../lib/ai/agents/researcher-agent');
    // NOTE: If researcher-agent is ESM, this might still fail. 
    // Let's create a standalone CJS test for the Researcher logic.
}

// Actually, let's just use ts-node via npx if it works, or bypass and write a dedicated CJS logic.
// The easiest way is to use a script that we KNOW works.

const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");

async function runStandaloneTest() {
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        maxOutputTokens: 8192,
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });

    const mockContent = `
        PROYECTO: Nuevo Polígono Industrial Los Olivos.
        Se propone una edificación con una altura máxima de 4 plantas (15 metros) en parcelas colindantes con suelo rústico.
        La gestión de residuos se realizará de forma centralizada sin tratamiento previo en parcela.
        Nota: Se ha revisado la Ley LISTA pero hay dudas sobre la compatibilidad con el Decreto-ley 3/2024 de simplificación.
    `;

    console.log("🧠 Verificando inteligencia del Investigador...");

    const prompt = `Actúa como un Investigador Urbanístico Senior.Cruza el "TEXTO DEL PROYECTO" con la Biblioteca DOCNEX.
    TEXTO DEL PROYECTO: ${mockContent}
    TAREA: Identifica posibles incumplimientos (Compliance) o analogías (Analogy).
    Devuelve un array JSON de hallazgos.`;

    try {
        const resp = await model.invoke(prompt);
        console.log("\n🔍 HALLAZGOS:");
        console.log(resp.content);
    } catch (e) {
        console.error("Error:", e);
    }
}

runStandaloneTest();
