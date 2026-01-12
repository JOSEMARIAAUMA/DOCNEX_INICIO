
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeyHierarchy() {
    const docId = '31f327db-df14-4d2d-b2b7-6d4c0e453cea';
    const { data: blocks } = await supabase
        .from('document_blocks')
        .select('id, title, hierarchy_level, parent_id')
        .eq('document_id', docId);

    if (!blocks) return;

    console.log(`Total blocks: ${blocks.length}`);
    const levels = blocks.reduce((acc: any, b) => {
        acc[b.hierarchy_level] = (acc[b.hierarchy_level] || 0) + 1;
        return acc;
    }, {});
    console.log('Hierarchy levels count:', levels);

    const rootCount = blocks.filter(b => !b.parent_id).length;
    console.log('Blocks with no parent:', rootCount);

    if (rootCount > 0) {
        console.log('Sample root blocks:');
        blocks.filter(b => !b.parent_id).slice(0, 5).forEach(b => console.log(`- [${b.hierarchy_level}] ${b.title}`));
    }
}

checkLeyHierarchy();
