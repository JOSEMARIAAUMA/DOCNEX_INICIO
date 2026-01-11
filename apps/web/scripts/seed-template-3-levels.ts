
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env
const envFiles = ['.env.local', '.env', 'apps/web/.env.local'];
const webDir = path.join(process.cwd(), 'apps/web');
const rootDir = process.cwd();

[...envFiles.map(f => path.join(webDir, f)), ...envFiles.map(f => path.join(rootDir, f))].forEach(filePath => {
    if (fs.existsSync(filePath)) {
        console.log(`Loading env from ${filePath}`);
        dotenv.config({ path: filePath });
    }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedTemplate() {
    console.log("🚀 Creating 'PLANTILLA 3 NIVELES'...");

    // 0. Get Workspace
    const { data: wo } = await supabase.from('workspaces').select('id').limit(1).single();
    if (!wo) throw new Error("No workspace found.");
    console.log(`Using Workspace: ${wo.id}`);

    // 1. Create Project
    const { data: project, error: pError } = await supabase
        .from('projects')
        .insert({
            name: 'PLANTILLA 3 NIVELES',
            description: 'Proyecto de prueba para verificar jerarquía de 3 niveles',
            workspace_id: wo.id
        })
        .select()
        .single();

    if (pError) throw new Error(`Error creating project: ${pError.message}`);
    console.log(`✅ Project created: ${project.id}`);

    // 2. Create Document
    const { data: doc, error: dError } = await supabase
        .from('documents')
        .insert({
            project_id: project.id,
            title: 'Documento Ejemplo Jerarquía',
            status: 'active'
        })
        .select()
        .single();

    if (dError) throw new Error(`Error creating document: ${dError.message}`);
    console.log(`✅ Document created: ${doc.id}`);

    // 3. Create Blocks
    // Level 0: TITULO 1
    const { data: b1, error: b1Error } = await supabase
        .from('document_blocks')
        .insert({
            document_id: doc.id,
            title: 'TITULO 1',
            content: 'Contenido del Título 1...',
            order_index: 0,
            block_type: 'section', // default
            tags: ['TÍTULO']
        })
        .select()
        .single();
    if (b1Error) throw b1Error;
    console.log(`  - Block 1 (Root): ${b1.title} (${b1.id})`);

    // Level 1: CAPITULO 1 (Child of TITULO 1)
    const { data: b2, error: b2Error } = await supabase
        .from('document_blocks')
        .insert({
            document_id: doc.id,
            title: 'CAPITULO 1',
            content: 'Contenido del Capítulo 1...',
            parent_block_id: b1.id,
            order_index: 0,
            block_type: 'section',
            tags: ['CAPÍTULO']
        })
        .select()
        .single();
    if (b2Error) throw b2Error;
    console.log(`  - Block 2 (Child): ${b2.title} (Parent: ${b1.title})`);

    // Level 2: ARTICULO 1 (Child of CAPITULO 1)
    const { data: b3, error: b3Error } = await supabase
        .from('document_blocks')
        .insert({
            document_id: doc.id,
            title: 'ARTICULO 1',
            content: 'Contenido del Artículo 1...',
            parent_block_id: b2.id,
            order_index: 0,
            block_type: 'section',
            tags: ['ARTÍCULO']
        })
        .select()
        .single();
    if (b3Error) throw b3Error;
    console.log(`  - Block 3 (Grandchild): ${b3.title} (Parent: ${b2.title})`);

    // 4. Create Semantic Links for Hierarchy (Optional but good for graph)
    const links = [
        { source: b1.id, target: b2.id },
        { source: b2.id, target: b3.id }
    ];

    for (const link of links) {
        await supabase.from('semantic_links').insert({
            source_block_id: link.source,
            target_block_id: link.target,
            target_document_id: doc.id,
            link_type: 'hierarchy',
            metadata: { reason: 'Structure Template' }
        });
    }
    console.log(`✅ Hierarchy links created.`);
    console.log(`\n✨ DONE! Please open Project: 'PLANTILLA 3 NIVELES' -> Document: 'Documento Ejemplo Jerarquía'`);
}

seedTemplate().catch(console.error);
