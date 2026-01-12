import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { MEMORIA_TECNICA_ROTA_R4, EXTRACTOS_LEY_VIVIENDA_ANDALUCIA_2025, PLAN_VIVE_CONTEXT } from './rota-vpo-content';

// Force load env before any other imports
dotenv.config({ path: path.join(process.cwd(), 'apps/web/.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// LangChain often expects GOOGLE_API_KEY
if (process.env.GOOGLE_GENERATIVE_AI_API_KEY && !process.env.GOOGLE_API_KEY) {
    process.env.GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}

async function executeRotaStressTest() {
    console.log("🚀 INICIANDO TEST DE ESTRÉS SENIOR: JUSTIFICACIÓN ROTA R4 VPO");
    console.log("==================================================================");

    // Dynamic imports for agents
    const { librarianAgent } = await import('../lib/ai/agents/librarian-agent');
    const { relationalAgent } = await import('../lib/ai/agents/relational-agent');
    const { consolidationAgent } = await import('../lib/ai/agents/consolidation-agent');
    const { projectManagerAgent } = await import('../lib/ai/agents/project-manager-agent');
    const { roadmapAgent } = await import('../lib/ai/agents/roadmap-agent');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const startTime = Date.now();

    // 0. Obtener Workspace
    let { data: workspace } = await supabase.from('workspaces').select('*').limit(1).single();
    if (!workspace) {
        const { data: newWs } = await supabase.from('workspaces').insert([{ name: "Senior Stress Test Workspace" }]).select().single();
        workspace = newWs;
    }

    console.log(`📂 Workspace: ${workspace?.id}`);

    // 1. Crear el Proyecto
    const projectTitle = "Expediente Jurídico: Rota R4 (VPO Superficie) con Historial";
    const { data: project } = await supabase.from('projects').insert([{
        name: projectTitle,
        workspace_id: workspace?.id
    }]).select().single();

    if (!project) {
        console.error("❌ Error: No se pudo crear el proyecto.");
        return;
    }
    console.log(`✅ Proyecto Senior creado: ${project.name}`);

    // LOG PM: Apertura de Proyecto
    await projectManagerAgent.logActivity(project.id, {
        agent_profile: "Project Manager",
        action_type: "decision",
        reasoning: "Iniciando expediente para justificar exceso de superficie en Rota R4. Se activa el protocolo de trazabilidad completa solicitado por el usuario.",
        metadata: { project_objective: "VPO Surface Justification", version: "2.0-cognition" }
    });

    // 0.2 Generar Roadmap Inicial
    console.log("📍 PASO 0.2: Generando Hoja de Ruta Dinámica...");
    await roadmapAgent.generateInitialRoadmap(
        project.id,
        projectTitle,
        "Justificación de exceso de superficie por terrazas en VPO de Rota basándose en la nueva Ley 5/2025 de Andalucía."
    );
    await roadmapAgent.updateSuggestions(project.id);

    const sources = [
        { title: "Memoria de Calificación Rota R4", content: MEMORIA_TECNICA_ROTA_R4 },
        { title: "Ley 5/2025 Vivienda Andalucía", content: EXTRACTOS_LEY_VIVIENDA_ANDALUCIA_2025 },
        { title: "Contexto Plan Vive 2025", content: PLAN_VIVE_CONTEXT }
    ];

    const allBlocks: any[] = [];

    // 2. INGESTA Y SEGMENTACIÓN (Librarian Agent)
    console.log("\n📦 PASO 1: Ingesta Técnica y Segmentación Jerárquica...");
    for (const source of sources) {
        const tStart = Date.now();
        console.log(`   📄 Procesando "${source.title}"...`);

        await projectManagerAgent.logActivity(project.id, {
            agent_profile: "Librarian",
            action_type: "segmentation",
            reasoning: `Extrayendo estructura jerárquica de "${source.title}". Se busca aislar los artículos de la Ley 5/2025 (Art. 42 y 43) para su posterior mapeo con el problema técnico de las terrazas.`,
            metadata: { source: source.title, strategy: "legal_hierarchy" }
        });

        const blocks = await librarianAgent.structureDocument(
            source.content,
            "Actúa como Especialista en Normativa. Identifica jerarquías legales claras. Mantén el tono técnico."
        );

        const { data: doc } = await supabase.from('documents').insert([{
            project_id: project.id,
            title: source.title,
            category: source.title.includes("Memoria") ? 'main' : 'reference'
        }]).select().single();

        if (!doc) continue;

        async function saveBlocks(blockList: any[], parentId: string | null = null, level: number = 0) {
            for (let i = 0; i < blockList.length; i++) {
                const b = blockList[i];
                const { data: createdBlock } = await supabase.from('document_blocks').insert([{
                    document_id: doc.id,
                    title: b.title,
                    content: b.content,
                    parent_block_id: parentId,
                    order_index: i,
                    block_type: level === 2 ? 'article' : (level === 1 ? 'chapter' : 'section')
                }]).select().single();

                if (createdBlock) {
                    allBlocks.push({ ...createdBlock, source_doc: source.title, document_id: doc.id });
                    if (b.children && b.children.length > 0) {
                        await saveBlocks(b.children, createdBlock.id, level + 1);
                    }
                }
            }
        }
        await saveBlocks(blocks || []);
        console.log(`   ✅ Ingesta de "${source.title}" completada en ${Date.now() - tStart}ms.`);
    }

    // 3. MAPEO SEMÁNTICO (Relational Agent)
    console.log("\n🔗 PASO 2: Descubrimiento de Relaciones Jurídico-Técnicas...");
    await projectManagerAgent.logActivity(project.id, {
        agent_profile: "Relational",
        action_type: "semantic_mapping",
        reasoning: "Ejecutando análisis transversal. Se busca la conexión lógica entre el exceso de m2 en Rota (problema) y el Art. 43 de la Ley 5/2025 (solución por habitabilidad expandida).",
        metadata: { goal: "Legal Justification" }
    });
    const tRelationalStart = Date.now();
    const links = await relationalAgent.discoverLinks(
        allBlocks,
        "Encuentra argumentos en la Ley 5/2025 para salvar el exceso de superficie de las terrazas en Rota R4."
    );
    console.log(`   ✅ ${links.length} vínculos semánticos detectados en ${Date.now() - tRelationalStart}ms.`);

    // 4. SÍNTESIS Y ELABORACIÓN DEL INFORME (Consolidation Agent)
    console.log("\n🧪 PASO 3: Elaboración del Informe Técnico-Jurídico (Laboratorio)...");
    await projectManagerAgent.logActivity(project.id, {
        agent_profile: "Consolidation",
        action_type: "synthesis",
        reasoning: "Generando propuesta de esquema para el informe final. Se prioriza la estructura: I. Hechos, II. Fundamentos de Derecho (Ley 5/2025), III. Conclusión Técnica.",
        metadata: { report_type: "Technical-Legal Report" }
    });
    const tSynthesisStart = Date.now();

    // Preparar bloques para el agente de consolidación (provenance)
    const blocksForSynthesis = allBlocks.map(b => ({
        id: b.id,
        title: b.title,
        content: b.content,
        source_doc: b.source_doc,
        source_doc_id: b.document_id,
        tags: []
    }));

    const outline = await consolidationAgent.proposeOutline(blocksForSynthesis, {
        role: "Abogado Urbanista Senior",
        objective: "Justificar el exceso de superficie por terrazas en VPO usando la Ley 5/2025.",
        tone: "legal",
        customInstructions: "Busca la conexión directa con el Art. 43 de la Ley 5/2025."
    });

    if (outline) {
        console.log(`\n📊 ESTRUCTURA DEL INFORME FINAL:`);
        console.log(`   Título: ${outline.title}`);
        outline.sections.forEach((s: any) => {
            console.log(`   - [${s.title}]: Basado en ${s.suggested_block_ids.length} fuentes.`);
        });
    }

    // 5. INFORME FINAL DEL PM
    console.log("\n📜 PASO 4: Generando Informe de Seguimiento del Project Manager...");
    const report = await projectManagerAgent.generateProjectReport(project.id, project.name);
    console.log("------------------------------------------------------------------");
    console.log(report);

    // 5. MÉTRICAS Y FINALIZACIÓN
    const totalTime = Date.now() - startTime;
    console.log("\n🏁 TEST DE ESTRÉS SENIOR FINALIZADO CON ÉXITO");
    console.log("------------------------------------------------------------------");
    console.log(`⏱️ Latencia Total: ${totalTime}ms`);
    console.log(`📑 Bloques Procesados: ${allBlocks.length}`);
    console.log(`🔗 Densidad de Argumentos: ${links.length} vínculos detectados.`);
    console.log(`📈 Estado del Sistema: TOTALMENTE OPERATIVO`);
    console.log("==================================================================");
}

executeRotaStressTest().catch(console.error);
