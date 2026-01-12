
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: blocks } = await supabase.from('document_blocks').select('*').limit(1);
    console.log('Document Blocks Columns:', Object.keys(blocks[0] || {}));

    const { data: resources } = await supabase.from('resources').select('*').limit(1);
    console.log('Resources Columns:', Object.keys(resources[0] || {}));
}

run();
