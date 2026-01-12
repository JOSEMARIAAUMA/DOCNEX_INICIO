
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listResources() {
    const { data, error } = await supabase
        .from('resources')
        .select('id, title, document_id, source_uri')
        .is('project_id', null);

    if (error) {
        console.error(error);
        return;
    }

    console.log('--- GLOBAL RESOURCES ---');
    data?.forEach(r => {
        console.log(`[${r.document_id ? 'HAS DOC' : 'NO DOC'}] ${r.title} | ID: ${r.id} | DocID: ${r.document_id}`);
    });
}

listResources();
