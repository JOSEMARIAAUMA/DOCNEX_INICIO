
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const FILE_PATH = path.join(process.cwd(), 'apps', 'web', 'boe_vivienda.html');
const FALLBACK_PROJECT_ID = '67689f0d-4015-4f81-bb47-096f9a0d6cba'; // MAESTRÍA URBANÍSTICA

function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/&nbsp;/g, ' ')
        .replace(/&aacute;/g, 'á')
        .replace(/&eacute;/g, 'é')
        .replace(/&iacute;/g, 'í')
        .replace(/&oacute;/g, 'ó')
        .replace(/&uacute;/g, 'ú')
        .replace(/&Aacute;/g, 'Á')
        .replace(/&Eacute;/g, 'É')
        .replace(/&Iacute;/g, 'Í')
        .replace(/&Oacute;/g, 'Ó')
        .replace(/&Uacute;/g, 'Ú')
        .replace(/&ntilde;/g, 'ñ')
        .replace(/&Ntilde;/g, 'Ñ')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

async function ingestVivienda() {
    console.log(`Reading Vivienda file: ${FILE_PATH}...`);
    const html = fs.readFileSync(FILE_PATH, 'utf8');

    // Extract Index to build Hierarchy
    const indexRegex = /<ul id="lista-marcadores">([\s\S]*?)<\/ul>/i;
    const indexMatch = html.match(indexRegex);
    if (!indexMatch) throw new Error("Could not find index 'lista-marcadores'");

    const indexHtml = indexMatch[1];
    const linkRegex = /<li><a href="#([^"]+)">([\s\S]*?)<\/a><\/li>/g;
    let linkMatch;

    const nodes = [];
    let lastLevel0Id = null;
    let lastLevel1Id = null;

    while ((linkMatch = linkRegex.exec(indexHtml)) !== null) {
        const id = linkMatch[1];
        const title = cleanText(linkMatch[2]);
        const upper = title.toUpperCase();

        let level = 2; // Default to article
        let type = 'articulo';

        if (upper.startsWith('TÍTULO')) {
            level = 0;
            type = 'titulo';
            lastLevel1Id = null;
        } else if (upper.startsWith('CAPÍTULO')) {
            level = 1;
            type = 'capitulo';
        } else if (upper.startsWith('SECCIÓN')) {
            level = 1; // Map section to level 1 (chapter level)
            type = 'capitulo';
        } else if (title.startsWith('Artículo') || title.includes('Disposición')) {
            level = 2;
            type = 'articulo';
        } else {
            level = 0;
            type = 'titulo'; // Default for preambulo etc
        }

        nodes.push({ id, title, level, type });
    }

    // Extract Block Content
    const blockRegex = /<div class="bloque" id="([^"]+)">([\s\S]*?)<\/div>/g;
    let blockMatch;
    const contentMap = new Map();

    while ((blockMatch = blockRegex.exec(html)) !== null) {
        const id = blockMatch[1];
        let content = blockMatch[2];

        // Remove headers and anchor text
        content = content
            .replace(/<p class="bloque">[\s\S]*?<\/p>/g, '')
            .replace(/<h[45][^>]*?>[\s\S]*?<\/h[45]>/gi, '')
            .replace(/<p class="nota_pie">[\s\S]*?<\/p>/g, '');

        contentMap.set(id, cleanText(content));
    }

    console.log(`Detected ${nodes.length} hierarchy elements for Vivienda.`);

    // Ensure Doc
    const docTitle = "Ley 5/2025, de Vivienda de Andalucía";
    const { data: existingDoc } = await supabase.from('documents').select('id').ilike('title', 'Ley 5/2025%').single();
    let docId;

    if (existingDoc) {
        docId = existingDoc.id;
        console.log(`Using existing doc: ${docId}`);
    } else {
        const { data: newDoc } = await supabase.from('documents').insert({
            title: docTitle,
            project_id: FALLBACK_PROJECT_ID,
            category: 'main'
        }).select().single();
        docId = newDoc.id;
        console.log(`Created doc: ${docId}`);
    }

    // Link Resource
    const { data: res } = await supabase.from('resources').select('id').ilike('title', '%Vivienda%Andalucía%').single();
    if (res) {
        await supabase.from('resources').update({ document_id: docId }).eq('id', res.id);
        console.log('Linked resource to doc.');
    }

    // Clear and Insert
    await supabase.from('document_blocks').delete().eq('document_id', docId);

    const toInsert = [];
    let curL0Id = null;
    let curL1Id = null;

    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const my_id = require('crypto').randomUUID();
        let parent_id = null;

        if (node.level === 0) {
            curL0Id = my_id;
            curL1Id = null;
            parent_id = null;
        } else if (node.level === 1) {
            curL1Id = my_id;
            parent_id = curL0Id;
        } else {
            parent_id = curL1Id || curL0Id;
        }

        toInsert.push({
            id: my_id,
            document_id: docId,
            parent_block_id: parent_id,
            title: node.title,
            content: contentMap.get(node.id) || "",
            block_type: node.type,
            order_index: i,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
    }

    const batchSize = 100;
    for (let i = 0; i < toInsert.length; i += batchSize) {
        const batch = toInsert.slice(i, i + batchSize);
        await supabase.from('document_blocks').insert(batch);
    }

    console.log('SUCCESS! Ingested Vivienda Law.');
}

ingestVivienda().catch(console.error);
