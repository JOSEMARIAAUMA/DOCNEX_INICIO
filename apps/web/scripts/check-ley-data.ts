
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

async function checkHierarchy() {
    console.log('--- Checking Hierarchy for Ley 5/2025 ---');

    // 1. Find Document
    const { data: docs, error: docError } = await supabase
        .from('documents')
        .select('id, title')
        .ilike('title', '%Ley 5%')
        .limit(1);

    if (!docs || docs.length === 0) {
        console.error('Document not found');
        return;
    }

    const docId = docs[0].id;
    console.log(`Document Found: ${docs[0].title} (${docId})`);

    // 2. Count Blocks by Level
    const { data: blocks } = await supabase
        .from('document_blocks')
        .select('id, title, parent_block_id, content')
        .eq('document_id', docId)
        .eq('is_deleted', false)
        .order('order_index');

    if (!blocks) return;

    const roots = blocks.filter(b => !b.parent_block_id);
    const children = blocks.filter(b => b.parent_block_id);

    console.log(`Total Blocks: ${blocks.length}`);
    console.log(`Root Blocks (parent=null): ${roots.length}`);
    console.log(`Child Blocks (parent!=null): ${children.length}`);

    console.log('\n--- Sample Roots ---');
    roots.slice(0, 5).forEach(b => console.log(`[ROOT] ${b.title}`));

    console.log('\n--- Sample Children ---');
    if (children.length > 0) {
        children.slice(0, 5).forEach(b => {
            const parent = blocks.find(p => p.id === b.parent_block_id);
            console.log(`[CHILD] ${b.title} -> Parent: ${parent?.title || 'UNKNOWN'}`);
        });
    } else {
        console.log('NO CHILDREN FOUND! The fix script failed or data was overwritten.');
    }
}

checkHierarchy();
