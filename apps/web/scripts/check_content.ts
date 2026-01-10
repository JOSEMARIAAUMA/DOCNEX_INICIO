import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from apps/web/.env.local (assuming script is in apps/web/scripts)
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vmygukjccbxyrwcwmeus.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZteWd1a2pjY2J4eXJ3Y3dtZXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYwMzU2NzIsImV4cCI6MjA1MTYxMTY3Mn0.u6T7s_V5Xv3_2i7_b3Z2_y6_h3_t7_g5_f4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkContent() {
    console.log('Checking Strategy Documents...');

    // 1. Get Docs
    const { data: docs, error } = await supabase
        .from('documents')
        .select('*')
        .ilike('title', 'ESTRATEGIA:%');

    if (error) {
        console.error('Error fetching docs:', error);
        return;
    }

    if (!docs || docs.length === 0) {
        console.log('No strategy documents found.');
        return;
    }

    console.log(`Found ${docs.length} strategy documents.`);

    for (const doc of docs) {
        console.log(`\nDocument: ${doc.title} (${doc.id})`);

        // 2. Count blocks
        // Using explicit count query for accuracy
        const { count, error: countErr } = await supabase
            .from('document_blocks')
            .select('*', { count: 'exact', head: true })
            .eq('document_id', doc.id)
            .eq('is_deleted', false); // Important: check if they are deleted

        if (countErr) {
            console.error('Error counting blocks:', countErr);
        } else {
            console.log(`   Active Block Count: ${count}`);
        }

        // 3. First block preview
        const { data: blocks } = await supabase
            .from('document_blocks')
            .select('content')
            .eq('document_id', doc.id)
            .eq('is_deleted', false)
            .limit(1);

        if (blocks && blocks.length > 0) {
            console.log(`   First Block Preview: ${blocks[0].content.substring(0, 50)}...`);
        } else {
            console.log(`   NO ACTIVE BLOCKS FOUND.`);
        }
    }
}

checkContent();
