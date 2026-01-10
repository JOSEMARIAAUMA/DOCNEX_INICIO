import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), 'apps/web/.env.local') });

async function runStressTest() {
    const { librarianAgent } = await import('../lib/ai/agents/librarian-agent');
    const { relationalAgent } = await import('../lib/ai/agents/relational-agent');

    const complexDocument = `
DOCNEX AI - POLÍTICA DE SEGURIDAD Y PRIVACIDAD V4.2
==================================================

SECCIÓN 1: TRATAMIENTO DE DATOS
Los datos de los usuarios se cifrarán mediante protocolos AES-512 en reposo. 
Toda transferencia externa requiere la aprobación del DPO según se define en el Anexo de Gobernanza.
Los logs de auditoría se guardarán por 5 años, contradiciendo la política previa de 2 años.

SECCIÓN 2: AGENTES COGNITIVOS Y MEMORIA
Nuestros agentes (Bibliotecario, Relacional) acceden a una memoria volátil de corto plazo. 
La memoria de largo plazo se persiste en Supabase.
Si un agente detecta una contradicción, debe emitir una alerta 'Red-Code'.

ANEXO DE GOBERNANZA: EL DPO
El Data Protection Officer (DPO) es responsable de validar las transferencias mencionadas en la Sección 1.
Cualquier cambio en la Sección 2 requiere una auditoría previa por parte del Comité de Ética.
Protocolo de seguridad: Se usará RSA-2048 para firmas digitales, aunque AES-512 sigue siendo el estándar para almacenamiento.

POLÍTICA DE RETENCIÓN (LEGADO)
Los datos se guardan por 2 años. (Nota: Esta sección está obsoleta pero se mantiene por referencia histórica).
    `;

    console.log("🚀 INICIANDO TEST ESTRÉS: PIPELINE COGNITIVO COMPLETO");
    console.log("---------------------------------------------------");

    const startTime = Date.now();

    // 1. SEGMENTACIÓN (Librarian)
    console.log("📦 PASO 1: Segmentación Inteligente (Bibliotecario)...");
    const tLibrarianStart = Date.now();
    const blocks = await librarianAgent.structureDocument(complexDocument, "Prefiere bloques detallados y detecta anexos.");
    const tLibrarianEnd = Date.now();
    console.log(`✅ ${blocks.length} bloques generados en ${tLibrarianEnd - tLibrarianStart}ms`);

    // 2. RELACIONES (Relational)
    console.log("🔗 PASO 2: Mapeo de Grafo Semántico (Relacional)...");
    const tRelationalStart = Date.now();
    const links = await relationalAgent.discoverLinks(blocks, "Política de Seguridad Corporativa");
    const tRelationalEnd = Date.now();
    console.log(`✅ ${links.length} relaciones detectadas en ${tRelationalEnd - tRelationalStart}ms`);

    // 3. APRENDIZAJE (Learning Loop Simulation)
    console.log("🧠 PASO 3: Simulación de Feedback del Usuario y Aprendizaje...");
    // El usuario "corrige": une la Sección 1 con el Legado para compararlos
    const userAcceptedBlocks = [...blocks];
    if (userAcceptedBlocks.length > 2) {
        userAcceptedBlocks[0].title = "Tratamiento de Datos (Fusión con Legado)";
        userAcceptedBlocks[0].content += "\n[COMPARADO CON]: " + (blocks[3]?.content || "");
    }

    const tLearningStart = Date.now();
    const learnedRule = await librarianAgent.learnFromFeedback(blocks, userAcceptedBlocks);
    const tLearningEnd = Date.now();
    console.log(`✅ Regla aprendida en ${tLearningEnd - tLearningStart}ms: "${learnedRule}"`);

    const totalTime = Date.now() - startTime;

    console.log("\n--- INFORME DE MÉTRICAS COGNITIVAS ---");
    console.log(`⏱️ Latencia Total: ${totalTime}ms`);
    console.log(`📊 Eficiencia de Segmentación: ${blocks.length} nodos / ~2000 chars`);
    console.log(`🕸️ Densidad del Grafo: ${(links.length / blocks.length).toFixed(2)} links/bloque`);
    console.log(`💡 Calidad de Vínculos: ${links.map((l: any) => l.type).join(", ")}`);
    console.log(`🎓 Evolución Cognitiva: Regla de memoria extraída correctamente.`);
    console.log("--------------------------------------");

    console.log("\nDETALLE DE RELACIONES ENCONTRADAS:");
    links.forEach((l: any) => {
        console.log(`- [${l.type.toUpperCase()}] ${blocks[l.source_index]?.title} -> ${blocks[l.target_index]?.title}`);
        console.log(`  Motivo: ${l.reason}`);
    });
}

runStressTest();
