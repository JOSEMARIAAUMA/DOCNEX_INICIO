
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function repairHierarchy() {
    console.log('--- REPAIRING LEGACY HIERARCHY FOR LEY 5/2025 ---');

    // 1. Find Document
    const { data: docs } = await supabase
        .from('documents')
        .select('id, title')
        .ilike('title', '%Ley 5%')
        .limit(1);

    if (!docs || docs.length === 0) {
        console.error('Document not found');
        return;
    }
    const docId = docs[0].id;
    console.log(`Target Document: ${docs[0].title} (${docId})`);

    // 2. Fetch all blocks
    // Note: We select just what we need.
    const { data: blocks, error } = await supabase
        .from('document_blocks')
        .select('id, title, parent_block_id')
        .eq('document_id', docId) // WARNING: Was 'document_id', make sure schema is correct. 'document_blocks' usually has 'document_id'.
        .eq('is_deleted', false)
        .order('order_index', { ascending: true }); // Crucial: Process in reading order

    if (error || !blocks) {
        console.error('Error fetching blocks:', error);
        return;
    }

    console.log(`Fetched ${blocks.length} blocks. Processing hierarchy...`);

    let currentTituloId = null;
    let currentCapituloId = null;
    let updates = 0;

    for (const block of blocks) {
        const title = block.title.trim();
        let newParentId = null;
        let newTags = [];

        // --- LOGIC ---
        // Use STRICT start anchors to avoid confusion between TÍTULO and CAPÍTÍTULO
        // Matches "TÍTÍTULO", "TITULO", etc. (Must start with T)
        const isTitulo = /^\s*T[IÍí].*T[UÚú]LO/i.test(title);
        // Matches "CAPÍTÍTULO", "CAPITULO", etc. (Must start with C)
        const isCapitulo = /^\s*C[Aa].*T[UÚú]LO/i.test(title);
        // Matches "ARTÍCULO", "ARTICULO" (Must start with A)
        const isArticulo = /^\s*ART[IÍí].*CULO/i.test(title);

        if (isTitulo) {
            // Level 0: Root
            currentTituloId = block.id;
            currentCapituloId = null; // Reset chapter when new title starts
            newParentId = null;
            newTags = ['TÍTULO'];
            console.log(`[TÍTULO] ${title} (ID: ${block.id})`);
        }
        else if (isCapitulo) {
            // Level 1: Child of Title
            newParentId = currentTituloId;
            currentCapituloId = block.id;
            newTags = ['CAPÍTULO'];
            console.log(`  [CAPÍTULO] ${title} -> Parent: ${currentTituloId ? 'OK' : 'NULL'}`);
        }
        else if (isArticulo) {
            // Level 2: Child of Chapter (or Title if no chapter)
            newParentId = currentCapituloId || currentTituloId;
            newTags = ['ARTÍCULO'];
            // Detailed log only for first few
            if (updates < 5) console.log(`    [ARTÍCULO] ${title} -> Parent: ${newParentId ? 'OK' : 'NULL'}`);
        }
        else if (title.startsWith('[Pre&aacute;mbulo]') || title.startsWith('Preámbulo')) {
            newParentId = null; // Root
        }
        else {
            // Normal text block or Disposición
            // usually child of current structure, OR root if it's "Disposición Adicional" etc.
            if (title.toUpperCase().includes('DISPOSICIÓN') || title.toUpperCase().includes('DISPOSICION')) {
                newParentId = null; // Usually roots at end
                currentTituloId = null; // Reset context
                currentCapituloId = null;
                console.log(`[ROOT-EXTRA] ${title}`);
            } else {
                // Default to current deepest active container
                newParentId = currentCapituloId || currentTituloId;
            }
        }

        // UPDATE DATABASE
        if (block.parent_block_id !== newParentId) {
            const { error: updateError } = await supabase
                .from('document_blocks')
                .update({
                    parent_block_id: newParentId,
                    tags: newTags.length > 0 ? newTags : undefined
                })
                .eq('id', block.id);

            if (updateError) console.error(`Failed to update ${block.id}:`, updateError);
            else updates++;
        }
    }

    console.log(`--- REPAIR COMPLETE ---`);
    console.log(`Updated ${updates} blocks with correct hierarchy links.`);
}

repairHierarchy();
