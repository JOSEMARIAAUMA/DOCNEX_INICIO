const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function runStandaloneStressTest() {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    // Use the model name that is most likely to work in this environment
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    console.log("🚀 Iniciando Test de Estrés Independiente: Informe Ley de Vivienda...");

    const reportObjective = `Redactar un informe completo sobre las novedades que aporta la nueva ley de vivienda (Ley 5/2025 de Andalucía) desde el punto de vista de los promotores inmobiliarios de proyectos residenciales y los arquitectos. 
Foco en: oportunidades de negocio, mejora de proyectos, optimización de trámites, reducción de plazos. 
Incluir: novedades en tramitación y contenido de los proyectos.`;

    // 1. Generate Report
    console.log("📝 Pasillo 1: Generando contenido del informe...");
    const reportPrompt = `Genera un informe profesional y detallado en español sobre la Ley 5/2025 (Ley de Vivienda de Andalucía).
${reportObjective}
Divide el informe en secciones claras con títulos en negrita y tablas si es necesario. Estilo ejecutivo de consultoría.`;

    try {
        const result = await model.generateContent(reportPrompt);
        const reportContent = result.response.text();

        // 2. Generate External Briefing (NotebookLM)
        console.log("🔎 Pasillo 2: Generando Briefing para NotebookLM...");
        const briefingPrompt = `Actúa como un Director de Estrategia IA. Analiza este informe y genera un "EXTERNAL INTELLIGENCE BRIEFING" para que un usuario lo use en NotebookLM.
    INFORME:
    ${reportContent.slice(0, 3000)}

    TAREA:
    Genera un prompt de alta ingeniería (The Master Prompt) para que el usuario lo use fuera de la app con documentos adicionales (BOJA, Informes de Mercado).`;

        const briefingResult = await model.generateContent(briefingPrompt);
        const briefingText = briefingResult.response.text();

        // 3. Generate Visual Annex (Image AI)
        console.log("🎨 Pasillo 3: Generando Anexo de Síntesis Visual...");
        const visualPrompt = `Genera 4 prompts detallados en inglés para Midjourney o DALL-E 3 que ilustren este informe de la Ley de Vivienda.
    ESTILO: Técnico moderno, arquitectónico, minimalista, profesional, 8k, photorealistic, infographic style.
    INFORME:
    ${reportContent.slice(0, 2000)}`;

        const visualResult = await model.generateContent(visualPrompt);
        const visualText = visualResult.response.text();

        console.log("\n--- RESULTADO DEL TEST DE ESTRÉS ---\n");

        // Save to a result file for the user to see
        const output = `
# INFORME DE ESTRÉS: LEY DE VIVIENDA 5/2025
${reportContent}

---
# BRIEFING DE INVESTIGACIÓN EXTERNA (NOTEBOOK LM)
${briefingText}

---
# ANEXO DE SÍNTESIS VISUAL (IMAGE AI PROMPTS)
${visualText}
`;
        fs.writeFileSync('ley_vivienda_stress_test_result.md', output);
        console.log("\n✅ Resultado guardado en 'ley_vivienda_stress_test_result.md'");
    } catch (e) {
        if (e.message.includes("404")) {
            console.log("⚠️ El modelo gemini-1.5-flash dio 404. Reintentando con gemini-pro...");
            const modelPro = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result = await modelPro.generateContent(reportPrompt);
            const reportContent = result.response.text();
            fs.writeFileSync('ley_vivienda_stress_test_result.md', reportContent);
            console.log("✅ Resultado parcial guardado (solo informe) usando gemini-pro.");
        } else {
            throw e;
        }
    }
}

runStandaloneStressTest().catch(console.error);
