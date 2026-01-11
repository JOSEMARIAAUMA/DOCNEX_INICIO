
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function debugTitulo1() {
    console.log('--- DEBUG TÍTULO I HIERARCHY ---');

    // 1. Find Ley 5/2025
    const { data: docs } = await supabase.from('documents').select('id').ilike('title', '%Ley 5%').limit(1);
    if (!docs || !docs.length) return console.log('Doc not found');
    const docId = docs[0].id;

    // 2. Find Título I block
    const { data: blocks } = await supabase
        .from('document_blocks')
        .select('id, title, parent_block_id, order_index')
        .eq('document_id', docId)
        .order('order_index');

    if (!blocks) return;

    const titulo1 = blocks.find(b => b.title.includes('TÍTULO I') || b.title.includes('TITULO I'));
    if (!titulo1) return console.log('TÍTULO I not found');

    console.log(`[TÍTULO I] ${titulo1.title} (ID: ${titulo1.id})`);

    // 3. Find Children of Título I
    const children = blocks.filter(b => b.parent_block_id === titulo1.id);
    console.log(`Direct Children of TÍTULO I (${children.length}):`);
    children.forEach(c => {
        console.log(`  - [${c.title}] (ID: ${c.id})`);
    });

    // 4. Check specific Chapter I
    const capitulo1 = blocks.find(b => b.title.includes('CAPÍTULO I') || b.title.includes('CAPITULO I'));
    if (capitulo1) {
        console.log(`\n[CAPÍTULO I] (ID: ${capitulo1.id}) - Parent matches TÍTULO I? ${capitulo1.parent_block_id === titulo1.id}`);
        const capChildren = blocks.filter(b => b.parent_block_id === capitulo1.id);
        console.log(`Direct Children of CAPÍTULO I (${capChildren.length}):`);
        capChildren.slice(0, 5).forEach(c => console.log(`    - [${c.title}]`));
    }
}

debugTitulo1();
