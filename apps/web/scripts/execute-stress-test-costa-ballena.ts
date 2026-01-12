import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Force load env before any other imports
dotenv.config({ path: path.join(process.cwd(), 'apps/web/.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// LangChain often expects GOOGLE_API_KEY
if (process.env.GOOGLE_GENERATIVE_AI_API_KEY && !process.env.GOOGLE_API_KEY) {
    process.env.GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}

async function executeCompleteStressTest() {
    console.log("🔥 INICIANDO TEST DE ESTRÉS INTEGRAL: PROYECTO COSTA BALLENA H1");
    console.log("===============================================================");

    // Dynamic imports
    const { librarianAgent } = await import('../lib/ai/agents/librarian-agent');
    const { relationalAgent } = await import('../lib/ai/agents/relational-agent');
    const { consolidationAgent } = await import('../lib/ai/agents/consolidation-agent');
    const { projectManagerAgent } = await import('../lib/ai/agents/project-manager-agent');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const startTime = Date.now();

    // 0. Obtener Workspace
    let { data: workspace } = await supabase.from('workspaces').select('*').limit(1).single();
    if (!workspace) {
        const { data: newWs } = await supabase.from('workspaces').insert([{ name: "Stress Test Workspace" }]).select().single();
        workspace = newWs;
    }

    console.log(`📂 Workspace vinculado: ${workspace?.id}`);

    // 1. DEFINICIÓN DE CONTENIDO REALISTA
    const docContent = `
ESTUDIO DE DETALLE - COSTA BALLENA PARCELA H1
MEMORIA JUSTIFICATIVA

TÍTULO I. INTRODUCCIÓN Y ANTECEDENTES
CAPÍTULO 1. IDENTIFICACIÓN
Artículo 1. Objeto.
El presente documento tiene por objeto justificar la reordenación detallada de la parcela H1, sita en Costa Ballena, Rota.
Artículo 2. Promotor.
Proyecto impulsado por NEXUS Desarrollos Urbanos S.L.
Artículo 3. Antecedentes Urbanísticos.
La parcela H1 deriva del Plan Parcial del Sector Costa Ballena, con uso pormenorizado hotelero.

TÍTULO II. CAMBIO DE USO BASADO EN DECRETO-LEY 1/2025
CAPÍTULO 1. JUSTIFICACIÓN TÉCNICA
Artículo 4. Aplicación del Art. 12 del DL 1/2025.
Se solicita el cambio de uso de hotelero a residencial plurifamiliar para la construcción de 200 viviendas protegidas (VPO). Esta medida se acoge a la simplificación administrativa para suelos improductivos de uso terciario.
Artículo 5. Interés Social.
La actuación garantiza el acceso a la vivienda a colectivos vulnerables, aportando 200 unidades al parque público/protegido de Rota.
Artículo 6. Compatibilidad Territorial.
La densificación resultante es compatible con las infraestructuras existentes en el Sector.

TÍTULO III. PARÁMETROS DE ORDENACIÓN
CAPÍTULO 1. VOLUMETRÍA Y ALTURAS
Artículo 7. Aumento de Planta.
Se establece una altura máxima de PB+3+Ático, justificándose en la necesidad de concentrar la edificabilidad para liberar suelo neto para dotaciones.
Artículo 8. Ocupación.
La ocupación máxima de parcela se fija en el 40%, permitiendo amplias zonas verdes privadas.
CAPÍTULO 2. RELACIÓN CON EL ENTORNO
Artículo 9. Margen al Campo de Golf.
Se reduce el retranqueo al lindero este (Campo de Golf) a 3 metros, compensándose con una barrera vegetal de 5 metros de ancho.
Artículo 10. Accesibilidad.
Se prevé un doble acceso rodado desde la calle perpendicular a la A-491.
`;

    console.log("🎯 Creando Proyecto...");
    const { data: project } = await supabase.from('projects').insert([{
        name: "Stress Test: Costa Ballena H1 - " + new Date().toLocaleTimeString(),
        workspace_id: workspace?.id
    }]).select().single();

    if (!project) return;
    console.log(`✅ Proyecto creado: ${project.name}`);

    // LOG PM: Inicio de Proyecto
    await projectManagerAgent.logActivity(project.id, {
        agent_profile: "Project Manager",
        action_type: "decision",
        reasoning: "Iniciando proyecto de reordenación Costa Ballena H1. El equipo se configura con perfil Senior para máxima precisión normativa.",
        metadata: { strategy: "Senior Urbanism" }
    });

    // 2. INGESTA (Librarian)
    console.log("\n📦 PASO 2: Ingesta Inteligente...");
    await projectManagerAgent.logActivity(project.id, {
        agent_profile: "Librarian",
        action_type: "segmentation",
        reasoning: "Segmentando memoria técnica usando jerarquía Título/Capítulo/Artículo para garantizar accesibilidad semántica.",
        metadata: { document: "Memoria H1" }
    });
    const blocksProposal = await librarianAgent.structureDocument(docContent, "Usa jerarquía estricta TÍTULO/CAPÍTULO/ARTÍCULO.");

    const { data: doc } = await supabase.from('documents').insert([{
        project_id: project.id,
        title: "Memoria de Ordenación H1",
        category: 'main'
    }]).select().single();

    if (!doc) return;

    const allCreatedBlocks: any[] = [];
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
                allCreatedBlocks.push(createdBlock);
                if (b.children && b.children.length > 0) {
                    await saveBlocks(b.children, createdBlock.id, level + 1);
                }
            }
        }
    }
    await saveBlocks(blocksProposal);
    console.log(`✅ ${allCreatedBlocks.length} bloques creados.`);

    // 3. RELACIÓN (Relational)
    console.log("\n🔗 PASO 3: Descubriendo Relaciones Semánticas...");
    await projectManagerAgent.logActivity(project.id, {
        agent_profile: "Relational",
        action_type: "semantic_mapping",
        reasoning: "Descubriendo vínculos entre el cambio de uso (Decreto 1/2025) y los parámetros de ocupación para validar la legalidad del proyecto.",
        metadata: { target: "Legal Compliance" }
    });
    const links = await relationalAgent.discoverLinks(allCreatedBlocks, "Costa Ballena Project");
    if (links.length > 0) {
        console.log(`✅ ${links.length} vínculos encontrados.`);
    }

    // 4. EDICIÓN (Laboratory Sim)
    console.log("\n✏️ PASO 4: Editando Artículo 7 (Optimización de Alturas)...");
    const art7 = allCreatedBlocks.find(b => b.title.includes("7"));
    if (art7) {
        await projectManagerAgent.logActivity(project.id, {
            agent_profile: "Laboratory",
            action_type: "decision",
            reasoning: "Ajustando altura máxima del Artículo 7 para optimizar el aprovechamiento urbanístico manteniendo la compatibilidad visual.",
            metadata: { change: "Height restriction update" }
        });
        const { error } = await supabase.from('document_blocks').update({
            content: art7.content + "\n\n[DATO TÉCNICO]: La altura total no superará los 14.50 metros."
        }).eq('id', art7.id);
        if (!error) console.log("✅ Artículo 7 actualizado.");
    }

    // 5. SÍNTESIS (Consolidation)
    console.log("\n🧪 PASO 5: Generando Propuesta de Síntesis Final...");
    await projectManagerAgent.logActivity(project.id, {
        agent_profile: "Consolidation",
        action_type: "synthesis",
        reasoning: "Compilando memoria final. Se prioriza la justificación normativa para evitar retrasos administrativos.",
        metadata: { objective: "Municipal presentation" }
    });
    const blocksForSynthesis = allCreatedBlocks.map(b => ({
        id: b.id,
        title: b.title,
        content: b.content,
        source_doc: "Memoria H1",
        source_doc_id: b.document_id,
        tags: []
    }));

    const outline = await consolidationAgent.proposeOutline(blocksForSynthesis, {
        role: "Director de Urbanismo",
        objective: "Sintetizar la propuesta para entrega municipal",
        tone: "legal",
        customInstructions: "Prioriza la síntesis de argumentos legales sobre el cambio de uso."
    });

    if (outline) {
        console.log(`\n📊 ESTRUCTURA DE COMPILACIÓN PROPUESTA:`);
        console.log(`   Título: ${outline.title}`);
        outline.sections.forEach((s: any) => console.log(`   - ${s.title} (${s.suggested_block_ids.length} fuentes)`));
    }

    console.log("\n🏁 TEST COMPLETADO EXITOSAMENTE");
    console.log(`⏱️ Tiempo Total: ${Date.now() - startTime}ms`);
}

executeCompleteStressTest().catch(console.error);
