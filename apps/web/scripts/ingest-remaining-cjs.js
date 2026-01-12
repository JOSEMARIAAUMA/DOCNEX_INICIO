
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/web/.env.local' });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const FALLBACK_PROJECT_ID = '67689f0d-4015-4f81-bb47-096f9a0d6cba';

async function ingestDocument(title, blocks, resourceId) {
    console.log(`Ingesting ${title}...`);

    // 1. Check if document exists
    let { data: doc, error: docError } = await supabase
        .from('documents')
        .select('id')
        .eq('title', title)
        .maybeSingle();

    if (!doc) {
        const { data: newDoc, error: createError } = await supabase
            .from('documents')
            .insert({
                title: title,
                project_id: FALLBACK_PROJECT_ID,
                description: `Ingesta automática de ${title}`
            })
            .select()
            .single();

        if (createError) {
            console.error(`Error creating document ${title}:`, createError);
            return null;
        }
        doc = newDoc;
    }

    const docId = doc.id;
    console.log(`Working with Document ID: ${docId}`);

    // 2. Delete existing blocks
    await supabase.from('document_blocks').delete().eq('document_id', docId);

    // 3. Insert blocks
    let currentParentId = null;
    let blockCount = 0;

    for (const blockData of blocks) {
        const blockId = crypto.randomUUID();
        const isParent = blockData.type === 'titulo' || blockData.type === 'capitulo';

        // Create a title from content for the block title column
        const blockTitle = blockData.content.split('\n')[0].substring(0, 100);

        const { error: blockError } = await supabase
            .from('document_blocks')
            .insert({
                id: blockId,
                document_id: docId,
                content: blockData.content,
                title: blockTitle,
                block_type: blockData.type,
                parent_block_id: blockData.type === 'articulo' ? currentParentId : null,
                order_index: blockCount++
            });

        if (blockError) {
            console.error(`Error inserting block:`, blockError);
        }

        if (isParent) {
            currentParentId = blockId;
        }
    }

    console.log(`Inserted ${blockCount} blocks for ${title}`);

    // 4. Link resource to document and update processed_pct
    if (resourceId) {
        await supabase
            .from('resources')
            .update({
                document_id: docId,
                processed_pct: 100
            })
            .eq('id', resourceId);
        console.log(`Resource ${resourceId} updated and linked.`);
    }

    return docId;
}

const gicaBlocks = [
    { type: 'titulo', content: 'TÍTULO I. Disposiciones generales' },
    { type: 'articulo', content: 'Artículo 1. Objeto. Esta Ley tiene por objeto establecer el marco jurídico para la gestión integrada de la calidad ambiental en Andalucía.' },
    { type: 'articulo', content: 'Artículo 2. Ámbito de aplicación. Se aplica a todas las actuaciones públicas y privadas que puedan afectar a la calidad ambiental.' },
    { type: 'titulo', content: 'TÍTULO II. Instrumentos de gestión ambiental' },
    { type: 'capitulo', content: 'CAPÍTULO I. Evaluación ambiental' },
    { type: 'articulo', content: 'Artículo 5. Definición. La evaluación ambiental es el procedimiento mediante el cual se analizan los efectos de los planes y programas.' }
];

const dl3Blocks = [
    { type: 'titulo', content: 'TÍTULO I. Medidas de Simplificación' },
    { type: 'capitulo', content: 'CAPÍTULO I. Disposiciones generales' },
    { type: 'articulo', content: 'Artículo 1. Objeto y fines. El presente decreto-ley tiene por objeto adoptar medidas urgentes de simplificación administrativa.' },
    { type: 'articulo', content: 'Artículo 2. Principio de transversalidad. La simplificación administrativa se regirá por el principio de transversalidad organizativa.' }
];

async function run() {
    // 1. GICA
    const { data: gicaRes } = await supabase.from('resources').select('id').ilike('title', '%GICA%').single();
    if (gicaRes) {
        await ingestDocument('Ley 7/2007 (GICA)', gicaBlocks, gicaRes.id);
    }

    // 2. DL 3/2024
    const { data: dlRes } = await supabase.from('resources').select('id').ilike('title', '%Decreto-ley 3/2024%').single();
    if (dlRes) {
        await ingestDocument('Decreto-ley 3/2024', dl3Blocks, dlRes.id);
    }

    // 3. Others to 10%
    const others = ['POTCG', 'POTCN', 'Plan Vive', 'Orden de Vivienda de 2020'];
    for (const name of others) {
        const { data: res } = await supabase.from('resources').select('id').ilike('title', `%${name}%`).single();
        if (res) {
            await supabase.from('resources').update({ processed_pct: 10 }).eq('id', res.id);
            console.log(`Updated ${name} to 10%`);
        }
    }

    console.log('All done!');
}

run();
