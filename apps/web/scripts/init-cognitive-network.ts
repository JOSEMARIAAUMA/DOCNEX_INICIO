import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Import extractKeywords directly since we are in a script context
// We'll reimplement it slightly or just use the logic if we can't easily import from apps/web/lib/ai/keyword-extractor
// Actually, I'll just copy the core logic to ensure it works in standalone mode.

dotenv.config({ path: path.join(process.cwd(), 'apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const IGNORED = new Set([
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'e', 'o', 'u',
    'a', 'ante', 'bajo', 'cabe', 'con', 'contra', 'de', 'desde', 'durante', 'en',
    'entre', 'hacia', 'hasta', 'mediante', 'para', 'por', 'según', 'sin', 'so',
    'sobre', 'tras', 'versus', 'vía', 'que', 'quien', 'donde', 'como', 'cuando', 'cual'
]);

function getKeywords(content: string): string[] {
    const keywords = new Set<string>();
    const cleanContent = content.replace(/<[^>]*>?/gm, ' '); // Strip HTML

    // Simple logic: Capitalized words (Proper nouns/Terms)
    const matches = cleanContent.match(/\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\b/g);
    if (matches) {
        matches.forEach(m => {
            if (!IGNORED.has(m.toLowerCase()) && m.length > 3) keywords.add(m);
        });
    }

    // Technical terms
    const technical = ['Sostenibilidad', 'Jurídico', 'Arquitectura', 'Urbanismo', 'Eficiencia', 'Patrimonio', 'Contrato', 'Demanda', 'Estructura'];
    technical.forEach(t => {
        if (cleanContent.toLowerCase().includes(t.toLowerCase())) keywords.add(t);
    });

    return Array.from(keywords).slice(0, 8);
}

async function initializeCognitiveNetwork() {
    console.log("🧠 Iniciando Procesamiento Cognitivo Automático...");

    // 1. Get blocks from EXAM workspace
    const { data: workspace } = await supabase.from('workspaces').select('id').eq('name', 'EXAM').single();
    if (!workspace) {
        console.error("❌ Workspace EXAM no encontrado.");
        return;
    }

    const { data: projects } = await supabase.from('projects').select('id').eq('workspace_id', workspace.id);
    if (!projects || projects.length === 0) return;

    const projectIds = projects.map(p => p.id);
    const { data: documents } = await supabase.from('documents').select('id').in('project_id', projectIds);
    if (!documents || documents.length === 0) return;

    const docIds = documents.map(d => d.id);
    const { data: blocks } = await supabase.from('document_blocks').select('*').in('document_id', docIds);

    if (!blocks || blocks.length === 0) {
        console.log("No hay bloques para procesar.");
        return;
    }

    console.log(`🔍 Procesando ${blocks.length} bloques...`);

    // 2. Auto-tagging
    for (const block of blocks) {
        const tags = getKeywords(block.content);
        if (tags.length > 0) {
            await supabase.from('document_blocks').update({ tags }).eq('id', block.id);
            console.log(`✅ Tags generados para [${block.title}]: ${tags.join(', ')}`);
        }
    }

    // 3. Semantic Links Generation (Tag Similarity)
    console.log("\n🔗 Generando vínculos semánticos...");
    const { data: updatedBlocks } = await supabase.from('document_blocks').select('*').in('document_id', docIds);

    if (!updatedBlocks) return;

    for (let i = 0; i < updatedBlocks.length; i++) {
        const bA = updatedBlocks[i];
        if (!bA.tags || bA.tags.length === 0) continue;

        for (let j = i + 1; j < updatedBlocks.length; j++) {
            const bB = updatedBlocks[j];
            if (!bB.tags || bB.tags.length === 0) continue;

            const common = bA.tags.filter((t: string) => bB.tags.includes(t));
            if (common.length >= 1) {
                // Insert bidirectional or single link? The schema usually points A -> B
                await supabase.from('semantic_links').insert([
                    {
                        source_block_id: bA.id,
                        target_block_id: bB.id,
                        link_type: 'semantic_similarity',
                        metadata: {
                            common_tags: common,
                            auto_generated: true,
                            context: `Relación automática por conceptos comunes: ${common.join(', ')}`
                        }
                    }
                ]);
                console.log(`📍 Vínculo creado: [${bA.title}] <-> [${bB.title}] (via ${common[0]})`);
            }
        }
    }

    console.log("\n✨ Red cognitiva inicializada con éxito.");
}

initializeCognitiveNetwork().catch(console.error);
