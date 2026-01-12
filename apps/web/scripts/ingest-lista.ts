
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const HTML_FILE = 'C:\\Dev\\DOCNEX AI\\DOCNEX_INICIO\\jm_normativa\\BOE-A-2021-20916 Ley 7_2021_LISTA.html';
const FALLBACK_PROJECT_ID = '67689f0d-4015-4f81-bb47-096f9a0d6cba'; // MAESTRÍA URBANÍSTICA

function cleanText(text: string): string {
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

    // Find the main text container
    const startIdx = html.indexOf('<div id="textoxslt">');
    if (startIdx === -1) throw new Error('Could not find div#textoxslt');
    const mainText = html.substring(startIdx);

    interface rawBlock {
        type: 'titulo' | 'capitulo' | 'seccion' | 'articulo' | 'disposicion';
        title: string;
        content: string[];
        offset: number;
        length: number;
    }

    const blocks: rawBlock[] = [];

    // Titles (TÍTULO I, etc)
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

    // Chapters (CAPÍTULO I, etc)
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

    // Sections (Sección 1, etc)
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

    // Articles (Artículo 1, etc)
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

    // Sort blocks by offset
    blocks.sort((a, b) => a.offset - b.offset);

    // Extract content for each block
    for (let i = 0; i < blocks.length; i++) {
        const start = blocks[i].offset + blocks[i].length;
        const end = (i < blocks.length - 1) ? blocks[i + 1].offset : mainText.lastIndexOf('</div>');
        const rawContent = mainText.substring(start, end);

        // Match paragraphs
        const pMatches = rawContent.match(/<p class="parrafo(_\d)?">([\s\S]*?)<\/p>/g) || [];
        blocks[i].content = pMatches.map(p => cleanText(p)).filter(t => t.length > 0);
    }

    console.log(`Detected ${blocks.length} elements in LISTA.`);

    // 1. Create/Update Document
    console.log('Ensuring Document exists...');
    const { data: existingDoc } = await supabase.from('documents').select('id').ilike('title', 'Ley 7/2021 (LISTA)%').single();
    let docId: string;

    if (existingDoc) {
        docId = existingDoc.id;
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

    // 2. Link Resource
    console.log('Linking Resource...');
    const { data: res } = await supabase.from('resources').select('id').ilike('title', 'Ley 7/2021 (LISTA)%').single();
    if (res) {
        await supabase.from('resources').update({ document_id: docId }).eq('id', res.id);
        console.log('Linked existing resource to document.');
    } else {
        console.log('Warning: No resource found for LISTA to link.');
    }

    // 3. Clear and Insert Blocks
    console.log('Inserting blocks...');
    await supabase.from('document_blocks').delete().eq('document_id', docId);

    const toInsert: any[] = [];
    let curL0Id: string | null = null; // Título
    let curL1Id: string | null = null; // Capítulo
    let order_index = 0;

    for (const b of blocks) {
        const my_id = crypto.randomUUID();
        let parent_id: string | null = null;
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
            db_type = 'capitulo'; // Map section to capítulo level for simple 3-level UI
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

    // Batch insert
    const batchSize = 50;
    for (let i = 0; i < toInsert.length; i += batchSize) {
        const batch = toInsert.slice(i, i + batchSize);
        const { error } = await supabase.from('document_blocks').insert(batch);
        if (error) {
            console.error('Error in batch:', error);
            // Log first item of failing batch
            console.log('First item of failing batch:', JSON.stringify(batch[0], null, 2));
        }
    }

    console.log('SUCCESS! Ingested Ley 7/2021 (LISTA).');
}

ingestLISTA().catch(console.error);
