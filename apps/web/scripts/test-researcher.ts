
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'apps/web/.env.local' });

async function stressTestResearcher() {
    const { ResearcherAgent } = await import('../lib/ai/agents/researcher-agent');
    console.log("🚀 INICIANDO PRUEBA DEL AGENTE INVESTIGADOR");
    console.log("------------------------------------------");

    const agent = new ResearcherAgent();

    const mockContent = `
        PROYECTO: Nuevo Polígono Industrial Los Olivos.
        
        Se propone una edificación con una altura máxima de 4 plantas (15 metros) en parcelas colindantes con suelo rústico.
        La gestión de residuos se realizará de forma centralizada sin tratamiento previo en parcela.
        Nota: Se ha revisado la Ley LISTA pero hay dudas sobre la compatibilidad con el Decreto-ley 3/2024 de simplificación.
    `;

    const mockProjectID = '67689f0d-4015-4f81-bb47-096f9a0d6cba'; // MAESTRÍA URBANÍSTICA

    console.log("🧠 El Investigador está analizando el impacto normativo y buscando precedentes...");

    try {
        const insights = await agent.runAnalysis(mockContent, mockProjectID);

        console.log("\n🔍 HALLAZGOS DEL INVESTIGADOR:");
        console.log(JSON.stringify(insights, null, 2));

        const compliance = insights.filter(i => i.type === 'compliance');
        const analogies = insights.filter(i => i.type === 'analogy');

        console.log(`\n📊 MÉTTRICAS DE ANÁLISIS:`);
        console.log(`- Alertas de Cumplimiento: ${compliance.length}`);
        console.log(`- Analogías Encontradas: ${analogies.length}`);

        if (compliance.length > 0) {
            console.log("✅ ÉXITO: El agente detectó puntos de fricción normativa.");
        }
        if (analogies.length > 0) {
            console.log("✅ ÉXITO: El agente encontró referencias cruzadas en el repositorio.");
        }

    } catch (error) {
        console.error("❌ ERROR EN LA PRUEBA:", error);
    }
}

stressTestResearcher();
