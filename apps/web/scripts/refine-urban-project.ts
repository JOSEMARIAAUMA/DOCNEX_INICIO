import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function refineProject() {
    console.log("🔍 Refinando Proyecto Maestro con Inteligencia Semántica...");

    // 1. Get Project
    const { data: project } = await supabase.from('projects').select('id').eq('name', "MAESTRÍA URBANÍSTICA: ESTUDIO DE DETALLE (LISTA + DL 1/2025)").single();
    if (!project) return;

    // 2. Get Blocks
    const { data: blocks } = await supabase.from('document_blocks').select('*').eq('document_id', (await supabase.from('documents').select('id').eq('project_id', project.id).eq('title', "ED-01: Memoria de Información y Ordenación").single()).data?.id);
    const { data: normBlocks } = await supabase.from('document_blocks').select('*').eq('document_id', (await supabase.from('documents').select('id').eq('project_id', project.id).eq('title', "NORM-01: Compendio Normativo LISTA/RGLISTA").single()).data?.id);

    if (!blocks || !normBlocks) return;

    // Simulate Agent "Observer": Creation of Notes
    console.log("📝 Agente Observer: Generando notas de auditoría...");
    const blockToAnnotate = blocks.find(b => b.title.includes("OBJETO Y ALCANCE"));
    if (blockToAnnotate) {
        await supabase.from('block_comments').insert([{
            block_id: blockToAnnotate.id,
            content: "AUDITORÍA IA: Se recomienda verificar la compatibilidad del Art. 71 con la nueva redacción del DL 1/2025 sobre simplificación administrativa. El borrador actual usa terminología de la LOUA en algunos párrafos técnicos (ej. 'aprovechamiento medio' vs 'aprovechamiento preexistente').",
            comment_type: 'review',
            resolved: false
        }]);
    }

    // Simulate Agent "Analyst": Creation of Semantic Links
    console.log("🔗 Agente Analyst: Estableciendo vínculos semánticos...");
    const sourceBlock = blocks.find(b => b.title.includes("JUSTIFICACIÓN DE LA NECESIDAD"));
    const targetNorm = normBlocks.find(b => b.title.includes("ARTÍCULO 62 LISTA"));

    if (sourceBlock && targetNorm) {
        // We link these two
        // table semantic_links usually has: source_block_id, target_block_id, relation_type, confidence
        await supabase.from('semantic_links').insert([{
            source_block_id: sourceBlock.id,
            target_block_id: targetNorm.id,
            source_document_id: sourceBlock.document_id,
            target_document_id: targetNorm.document_id,
            relation_type: 'justifies',
            description: "Justificación legal directa de la necesidad de este Estudio de Detalle basada en el Art. 62 de la LISTA."
        }]);
    }

    console.log("✅ Refinamiento completado. El proyecto ahora tiene 'memoria' y 'conciencia' de sus debilidades.");
}

refineProject().catch(console.error);
