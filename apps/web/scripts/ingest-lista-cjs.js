
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const HTML_FILE = 'C:\\Dev\\DOCNEX AI\\DOCNEX_INICIO\\jm_normativa\\BOE-A-2021-20916 Ley 7_2021_LISTA.html';
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
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<strong[^>]*>/gi, '')
        .replace(/<\/strong>/gi, '')
        .replace(/<em[^>]*>/gi, '')
        .replace(/<\/em>/gi, '')
        .replace(/<span[^>]*>/gi, '')
        .replace(/<\/span>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

async function ingestLISTA() {
    console.log(`Reading LISTA file: ${HTML_FILE}...`);
    const html = fs.readFileSync(HTML_FILE, 'utf8');

    const startIdx = html.indexOf('<div id="textoxslt">');
    if (startIdx === -1) throw new Error('Could not find div#textoxslt');
    const mainText = html.substring(startIdx);

    const blocks = [];

    // Titles
    const titleRegex = /<h4 class="titulo_num">([\s\S]*?)<\/h4>\s*<h4 class="titulo_tit">([\s\S]*?)<\/h4>/g;
    let match;
    while ((match = titleRegex.exec(mainText)) !== null) {
        blocks.push({
            type: 'titulo',
            title: `${cleanText(match[1])}: ${cleanText(match[2])}`,
            content: [],
            offset: match.index,
            length: match[0].length
        });
    }

    // Chapters
    const capRegex = /<h4 class="capitulo_num">([\s\S]*?)<\/h4>\s*<h4 class="capitulo_tit">([\s\S]*?)<\/h4>/g;
    while ((match = capRegex.exec(mainText)) !== null) {
        blocks.push({
            type: 'capitulo',
            title: `${cleanText(match[1])}: ${cleanText(match[2])}`,
            content: [],
            offset: match.index,
            length: match[0].length
        });
    }

    // Sections
    const secRegex = /<h4 class="seccion_num">([\s\S]*?)<\/h4>\s*<h4 class="seccion_tit">([\s\S]*?)<\/h4>/g;
    while ((match = secRegex.exec(mainText)) !== null) {
        blocks.push({
            type: 'seccion',
            title: `${cleanText(match[1])}: ${cleanText(match[2])}`,
            content: [],
            offset: match.index,
            length: match[0].length
        });
    }

    // Articles
    const artRegex = /<h5 class="articulo">([\s\S]*?)<\/h5>/g;
    while ((match = artRegex.exec(mainText)) !== null) {
        const title = cleanText(match[1]);
        blocks.push({
            type: title.toLowerCase().includes('artículo') ? 'articulo' : 'disposicion',
            title: title,
            content: [],
            offset: match.index,
            length: match[0].length
        });
    }

    blocks.sort((a, b) => a.offset - b.offset);

    for (let i = 0; i < blocks.length; i++) {
        const start = blocks[i].offset + blocks[i].length;
        const end = (i < blocks.length - 1) ? blocks[i + 1].offset : mainText.lastIndexOf('</div>');
        const rawContent = mainText.substring(start, end);

        const pMatches = rawContent.match(/<p class="parrafo(_\d)?">([\s\S]*?)<\/p>/g) || [];
        blocks[i].content = pMatches.map(p => cleanText(p)).filter(t => t.length > 0);
    }

    console.log(`Detected ${blocks.length} elements in LISTA.`);

    console.log('Ensuring Document exists...');
    const { data: docs } = await supabase.from('documents').select('id').ilike('title', 'Ley 7/2021 (LISTA)%');
    let docId;

    if (docs && docs.length > 0) {
        docId = docs[0].id;
        console.log(`Using existing document: ${docId}`);
    } else {
        const { data: newDoc, error: docErr } = await supabase.from('documents').insert([{
            title: 'Ley 7/2021 (LISTA): Impulso para la Sostenibilidad del Territorio de Andalucía',
            project_id: FALLBACK_PROJECT_ID,
            category: 'main',
            description: 'Ley fundamental de urbanismo en Andalucía'
        }]).select().single();
        if (docErr || !newDoc) throw docErr;
        docId = newDoc.id;
        console.log(`Created new document: ${docId}`);
    }

    console.log('Linking Resource...');
    const { data: resources } = await supabase.from('resources').select('id').ilike('title', 'Ley 7/2021 (LISTA)%');
    if (resources && resources.length > 0) {
        await supabase.from('resources').update({ document_id: docId }).eq('id', resources[0].id);
        console.log('Linked existing resource to document.');
    }

    console.log('Inserting blocks...');
    await supabase.from('document_blocks').delete().eq('document_id', docId);

    const toInsert = [];
    let curL0Id = null;
    let curL1Id = null;
    let order_index = 0;

    for (const b of blocks) {
        const my_id = require('crypto').randomUUID();
        let parent_id = null;
        let db_type = 'articulo';

        if (b.type === 'titulo') {
            curL0Id = my_id;
            curL1Id = null;
            db_type = 'titulo';
            parent_id = null;
        } else if (b.type === 'capitulo') {
            curL1Id = my_id;
            parent_id = curL0Id;
            db_type = 'capitulo';
        } else if (b.type === 'seccion') {
            parent_id = curL1Id || curL0Id;
            db_type = 'capitulo';
        } else if (b.type === 'articulo' || b.type === 'disposicion') {
            parent_id = curL1Id || curL0Id;
            db_type = 'articulo';
        }

        toInsert.push({
            id: my_id,
            document_id: docId,
            parent_block_id: parent_id,
            title: b.title,
            content: b.content.join('\n\n'),
            block_type: db_type,
            order_index: order_index++,
            is_deleted: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
    }

    const batchSize = 50;
    for (let i = 0; i < toInsert.length; i += batchSize) {
        const batch = toInsert.slice(i, i + batchSize);
        const { error } = await supabase.from('document_blocks').insert(batch);
        if (error) console.error('Error in batch:', error);
    }

    console.log('SUCCESS! Ingested Ley 7/2021 (LISTA).');
}

ingestLISTA().catch(console.error);
