
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Config
const HTML_FILE = path.resolve('C:\\Dev\\DOCNEX AI\\DOCNEX_INICIO\\jm_normativa\\REGLAMENTO_LISTA.html');
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
        .replace(/<span[^>]*>/gi, '')
        .replace(/<\/span>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

async function ingestRGLISTA() {
    console.log(`Reading file: ${HTML_FILE}...`);
    const html = fs.readFileSync(HTML_FILE, 'utf8');

    const dTxTStart = html.indexOf('<div id="dTxT">');
    if (dTxTStart === -1) throw new Error('Could not find div#dTxT');
    const mainText = html.substring(dTxTStart);

    interface rawBlock {
        type: 'titulo' | 'capitulo' | 'seccion' | 'articulo';
        title: string;
        content: string[];
        originalText: string;
        offset: number;
    }

    const blocks: rawBlock[] = [];

    const h3Regex = /<h3 class="(ti|ca|se)">([\s\S]*?)<\/h3>/g;
    let match;
    while ((match = h3Regex.exec(mainText)) !== null) {
        const hType = match[1];
        const text = cleanText(match[2]);
        let type: 'titulo' | 'capitulo' | 'seccion' = 'titulo';
        if (hType === 'ca') type = 'capitulo';
        if (hType === 'se') type = 'seccion';

        blocks.push({ type, title: text, content: [], originalText: match[0], offset: match.index });
    }

    const artRegex = /<p class="a">([\s\S]*?)<\/p>/g;
    while ((match = artRegex.exec(mainText)) !== null) {
        const text = cleanText(match[1]);
        if (text.startsWith('Artículo') || text.startsWith('Disposición') || text.startsWith('Anexo')) {
            blocks.push({ type: 'articulo', title: text, content: [], originalText: match[0], offset: match.index });
        }
    }

    blocks.sort((a, b) => a.offset - b.offset);

    for (let i = 0; i < blocks.length; i++) {
        const start = blocks[i].offset + blocks[i].originalText.length;
        const end = (i < blocks.length - 1) ? blocks[i + 1].offset : mainText.length;
        const rawContent = mainText.substring(start, end);
        const pMatches = rawContent.match(/<(p|blockquote|ul|ol|li)>([\s\S]*?)<\/\1>/g) || [];
        blocks[i].content = pMatches.map(p => cleanText(p)).filter(t => t.length > 0);
    }

    console.log(`Detected ${blocks.length} hierarchical elements.`);

    // 4. Upsert Document
    console.log('Ensuring Document exists...');
    const { data: docs } = await supabase.from('documents').select('id').ilike('title', '%Reglamento%LISTA%');
    let docId: string;

    if (docs && docs.length > 0) {
        docId = docs[0].id;
        console.log(`Using existing document: ${docId}`);
    } else {
        const { data: newDoc, error: docErr } = await supabase.from('documents').insert([{
            title: 'Reglamento General de la LISTA (Decreto 550/2022)',
            project_id: FALLBACK_PROJECT_ID,
            category: 'main',
            description: 'Reglamento consolidado del BOJA'
        }]).select().single();
        if (docErr || !newDoc) throw docErr;
        docId = newDoc.id;
        console.log(`Created new document: ${docId}`);
    }

    // 5. Ensure Resource exists
    console.log('Ensuring Resource exists...');
    const { data: resources } = await supabase.from('resources').select('id').ilike('title', '%Reglamento%LISTA%');
    if (!resources || resources.length === 0) {
        const { error: resErr } = await supabase.from('resources').insert([{
            title: 'Reglamento General de la LISTA (Decreto 550/2022)',
            document_id: docId,
            status: 'ACTIVE',
            kind: 'pdf',
            theme: 'Urbanismo',
            meta: {
                area: 'Urbanismo',
                range: 'REGIONAL',
                jurisdiction: 'Andalucía',
                version_date: '2022-11-29'
            }
        }]);
        if (resErr) console.error('Error creating resource:', resErr);
        else console.log('Created missing resource.');
    } else {
        const { error: updErr } = await supabase.from('resources').update({
            document_id: docId,
            kind: 'pdf',
            theme: 'Urbanismo'
        }).eq('id', resources[0].id);
        if (updErr) console.error('Error updating resource:', updErr);
        else console.log('Updated existing resource link.');
    }

    // 6. Hierarchy construction
    console.log('Inserting blocks...');
    await supabase.from('document_blocks').delete().eq('document_id', docId);

    const toInsert: any[] = [];
    let curL0Id: string | null = null;
    let curL1Id: string | null = null;
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
        } else if (b.type === 'capitulo' || b.type === 'seccion') {
            curL1Id = my_id;
            parent_id = curL0Id;
            db_type = 'capitulo';
        } else {
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

    const batchSize = 100;
    for (let i = 0; i < toInsert.length; i += batchSize) {
        const batch = toInsert.slice(i, i + batchSize);
        const { error } = await supabase.from('document_blocks').insert(batch);
        if (error) console.error('Error batch:', error);
    }

    console.log('SUCCESS!');
}

ingestRGLISTA().catch(console.error);
