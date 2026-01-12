const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { briefingAgent } = require("../lib/ai/agents/briefing-agent");
const { researcherAgent } = require("../lib/ai/agents/researcher-agent");
const { librarianAgent } = require("../lib/ai/agents/librarian-agent");

// Simulated script to generate the massive report requested by the user
async function runStressTest() {
    const model = new ChatGoogleGenerativeAI({
        modelName: "gemini-1.5-flash",
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });

    console.log("🚀 Iniciando Test de Estrés: Informe Ley de Vivienda (Ley 5/2025)...");

    const reportObjective = `Redactar un informe completo sobre las novedades que aporta la nueva ley de vivienda desde el punto de vista de los promotores inmobiliarios de proyectos residenciales y los arquitectos. 
Foco en: oportunidades de negocio, mejora de proyectos, optimización de trámites, reducción de plazos. 
Incluir: novedades en tramitación y contenido de los proyectos.`;

    const targetAudience = "Promotores Inmobiliarios y Arquitectos Superiores.";

    // 1. Generate Report Content
    console.log("📝 Generando contenido del informe...");
    const reportPrompt = `Genera un informe profesional y detallado sobre la Ley 5/2025 (Ley de Vivienda de Andalucía).
${reportObjective}
Divide el informe en secciones claras:
1. Resumen Ejecutivo
2. Impacto para Promotores (Oportunidades y Negocio)
3. Impacto para Arquitectos (Diseño y Normativa)
4. Optimización Administrativa (Plazos y Silencio Administrativo)
5. Conclusiones Estratégicas`;

    const reportResp = await model.invoke(reportPrompt);
    const reportContent = reportResp.content.toString();

    // 2. Generate Research Briefing
    console.log("🔎 Generando Briefing para NotebookLM...");
    // Since this is CJS test, we'd need to adapt the import if it's TS, but for now let's use a simplified mock or direct call
    const briefingResult = await (new (require("../lib/ai/agents/briefing-agent").BriefingAgent)()).generateExternalBriefing({
        projectContext: reportContent,
        objective: reportObjective,
        targetAudience: targetAudience
    });

    // 3. Generate Visual Annex
    console.log("🎨 Generando Anexo Visual...");
    const visualResult = await (new (require("../lib/ai/agents/briefing-agent").BriefingAgent)()).generateVisualAnnex({
        projectContext: reportContent,
        objective: reportObjective,
        targetAudience: targetAudience
    });

    console.log("\n--- INFORME GENERADO ---\n");
    console.log(reportContent.slice(0, 500) + "...");

    console.log("\n--- BRIEFING EXTERNO (NOTEBOOK LM) ---\n");
    console.log(briefingResult.briefing);

    console.log("\n--- ANEXO VISUAL (IMAGE AI) ---\n");
    console.log(visualResult.imagePrompts);

    console.log("\n✅ Test de Estrés completado con éxito.");
}

runStressTest().catch(console.error);
