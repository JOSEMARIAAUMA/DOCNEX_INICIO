
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Using Anon Key
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("--- RESOURCES ---");
    const { data: resources } = await supabase.from('resources').select('id, title, document_id, kind, meta');
    resources?.sort((a, b) => a.title.localeCompare(b.title)).forEach(r => {
        console.log(`Resource: ${r.title} | ID: ${r.id} | DocID: ${r.document_id} | Kind: ${r.kind}`);
    });

    console.log("\n--- DOCUMENTS ---");
    const { data: docs } = await supabase.from('documents').select('id, title, project_id');
    docs?.sort((a, b) => a.title.localeCompare(b.title)).forEach(d => {
        console.log(`Doc: ${d.title} | ID: ${d.id} | ProjectID: ${d.project_id}`);
    });

    console.log("\n--- BLOCKS COUNT PER DOCUMENT ---");
    if (docs) {
        for (const d of docs) {
            const { count } = await supabase.from('document_blocks').select('*', { count: 'exact', head: true }).eq('document_id', d.id);
            console.log(`Doc: ${d.title} | Blocks: ${count}`);
        }
    }
}

check();
