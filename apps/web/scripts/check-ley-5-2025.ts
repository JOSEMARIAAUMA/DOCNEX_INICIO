
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeyHousing() {
    const { data: resource } = await supabase
        .from('resources')
        .select('*')
        .ilike('title', '%Ley 5/2025%')
        .single();

    if (!resource) {
        console.log('Resource Ley 5/2025 not found');
        return;
    }

    console.log(`Found Resource: ${resource.title} | ID: ${resource.id} | DocID: ${resource.document_id}`);

    if (resource.document_id) {
        const { count, error } = await supabase
            .from('document_blocks')
            .select('*', { count: 'exact', head: true })
            .eq('document_id', resource.document_id);

        console.log(`Blocks in document: ${count}`);

        const { data: rootBlocks } = await supabase
            .from('document_blocks')
            .select('id, title, hierarchy_level')
            .eq('document_id', resource.document_id)
            .is('parent_id', null)
            .order('order_index');

        console.log('Root Blocks:');
        rootBlocks?.forEach(b => console.log(`- [${b.hierarchy_level}] ${b.title}`));
    }
}

checkLeyHousing();
