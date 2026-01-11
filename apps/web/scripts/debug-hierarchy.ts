
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env
const envFiles = ['.env.local', '.env', 'apps/web/.env.local'];
for (const file of envFiles) {
    const p = path.join(process.cwd(), file);
    if (fs.existsSync(p)) {
        console.log(`Loading ${p}`);
        dotenv.config({ path: p });
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHierarchy() {
    console.log("🔍 Checking Document Hierarchy...");

    // Find the document
    const { data: doc } = await supabase.from('documents')
        .select('id, title')
        .ilike('title', '%Ley 5/2025%')
        .maybeSingle();

    if (!doc) {
        console.error("❌ Document not found by partial title search.");
        console.log("📂 Listing all documents:");
        const { data: allDocs } = await supabase.from('documents').select('id, title');
        if (allDocs) {
            allDocs.forEach(d => console.log(` - [${d.id}] ${d.title}`));
        }
        return;
    }

    console.log(`📄 Document: ${doc.title} (${doc.id})`);

    const { data: blocks } = await supabase.from('document_blocks')
        .select('id, title, parent_block_id, block_type')
        .eq('document_id', doc.id)
        .order('order_index');

    if (!blocks) {
        console.log("❌ No blocks found.");
        return;
    }

    console.log(`🧱 Total Blocks: ${blocks.length}`);

    const roots = blocks.filter(b => !b.parent_block_id);
    const children = blocks.filter(b => b.parent_block_id);

    console.log(`Roots (Level 0): ${roots.length}`);
    console.log(`Children (Level >0): ${children.length}`);

    if (roots.length > 0) {
        console.log("Example Roots:", roots.slice(0, 3).map(b => b.title));
    }
    if (children.length > 0) {
        console.log("Example Children:", children.slice(0, 3).map(b => `${b.title} (Parent: ${b.parent_block_id})`));
    } else {
        console.log("⚠️ ALL BLOCKS ARE ROOTS! HIERARCHY IS MISSING.");
    }
}

checkHierarchy().catch(console.error);
