
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function cleanupTitles() {
    console.log('--- CLEANING UP TITITULO TYPOS ---');

    // Fetch all blocks with messed up titles
    const { data: blocks } = await supabase
        .from('document_blocks')
        .select('id, title')
        .or('title.ilike.%TÍTÍTULO%,title.ilike.%CAPÍTÍTULO%,title.ilike.%TITITULO%,title.ilike.%CAPITITULO%');

    if (!blocks || blocks.length === 0) {
        console.log('No blocks with TITITULO found.');
        return;
    }

    console.log(`Found ${blocks.length} blocks to fix.`);
    let count = 0;

    for (const block of blocks) {
        let newTitle = block.title;

        // Replace TÍTÍTULO -> TÍTULO
        newTitle = newTitle.replace(/T[ÍI]T[ÍI]TULO/gi, 'TÍTULO');
        newTitle = newTitle.replace(/TITITULO/gi, 'TÍTULO');

        // Replace CAPÍTÍTULO -> CAPÍTULO
        newTitle = newTitle.replace(/CAP[ÍI]T[ÍI]TULO/gi, 'CAPÍTULO');
        newTitle = newTitle.replace(/CAPITITULO/gi, 'CAPÍTULO');

        if (newTitle !== block.title) {
            const { error } = await supabase
                .from('document_blocks')
                .update({ title: newTitle })
                .eq('id', block.id);

            if (!error) count++;
        }
    }

    console.log(`Fixed ${count} titles.`);
}

cleanupTitles();
