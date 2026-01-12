
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

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkRGLISTA() {
    console.log('--- Checking Status: REGLAMENTO GENERAL DE LA LEY LISTA (Decreto 550/2022) ---');

    // 1. Find Document or Global Resource
    const { data: resources } = await supabase
        .from('resources')
        .select('id, title, status, meta')
        .ilike('title', '%Reglamento%LISTA%');

    if (!resources || resources.length === 0) {
        console.log('Resource not found in Library (Global Repository)');
    } else {
        resources.forEach(r => {
            console.log(`Found Library Resource: ${r.title} [Status: ${r.status}]`);
            console.log(`Meta:`, r.meta);
        });
    }

    // 2. Search for Document in Workspace Projects
    const { data: docs } = await supabase
        .from('documents')
        .select('id, title, project_id')
        .ilike('title', '%Reglamento%LISTA%');

    if (!docs || docs.length === 0) {
        console.log('Document not found in Projects');
    } else {
        for (const doc of docs) {
            const { data: blocks } = await supabase
                .from('document_blocks')
                .select('id, title, parent_block_id')
                .eq('document_id', doc.id);

            const roots = blocks?.filter(b => !b.parent_block_id) || [];
            const l2 = blocks?.filter(b => b.parent_block_id && !blocks.find(p => p.id === b.parent_block_id)?.parent_block_id) || [];
            const l3 = blocks?.filter(b => b.parent_block_id && blocks.find(p => p.id === b.parent_block_id)?.parent_block_id) || [];

            console.log(`Found Workspace Document: ${doc.title} (ID: ${doc.id})`);
            console.log(`Total blocks: ${blocks?.length || 0}`);
            console.log(`- Level 1 (Roots/Títulos): ${roots.length}`);
            console.log(`- Level 2 (Capítulos): ${l2.length}`);
            console.log(`- Level 3 (Artículos): ${l3.length}`);

            if (roots.length > 0) console.log(`Sample Level 1: ${roots[0].title}`);
            if (l3.length > 0) console.log(`Sample Level 3: ${l3[0].title}`);
        }
    }
}

checkRGLISTA();
