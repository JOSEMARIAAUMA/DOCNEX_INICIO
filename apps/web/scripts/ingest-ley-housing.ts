
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Config
const HTML_FILE = path.resolve('C:\\Dev\\DOCNEX AI\\DOCNEX_INICIO\\jm_normativa\\Ley 5_2025, de 16 de diciembre, de Vivienda de Andalucía..html');
const DOCUMENT_ID = '31f327db-df14-4d2d-b2b7-6d4c0e453cea';

function normalizeSpanish(text: string): string {
    return text
        .replace(/[^\x00-\x7F]/g, (match, offset, str) => {
            // Context-based replacement for common Spanish words in legal texts
            const segment = str.substring(Math.max(0, offset - 5), Math.min(str.length, offset + 6)).toLowerCase();
            if (segment.includes('art')) return 'í'; // Artículo
            if (segment.includes('t') && segment.includes('tulo')) return 'Í'; // TÍTULO
            if (segment.includes('cap') && segment.includes('tulo')) return 'Í'; // CAPÍTULO
            if (segment.includes('acci') || segment.includes('sesi') || segment.includes('secci')) return 'ó'; // Sección, Sesión
            if (segment.includes('aut')) return 'ó'; // Autónoma
            if (segment.includes('andaluc')) return 'í'; // Andalucía
            if (segment.includes('p') && segment.includes('blica')) return 'ú'; // Pública
            if (segment.includes('disposici')) return 'ó'; // Disposición
            if (segment.includes('ordenaci')) return 'ó'; // Ordenación
            if (segment.includes('planificaci')) return 'ó'; // Planificación
            if (segment.includes('edificaci')) return 'ó'; // Edificación
            if (segment.includes('urban') && segment.includes('stica')) return 'í'; // Urbanística

            // Default fallbacks (educated guesses)
            return 'í';
        })
        // Handle common entities if any escaped through stripTags
        .replace(/&iacute;/g, 'í')
        .replace(/&oacute;/g, 'ó')
        .replace(/&uacute;/g, 'ú')
        .replace(/&aacute;/g, 'á')
        .replace(/&eacute;/g, 'é')
        .replace(/&Ntilde;/g, 'Ñ')
        .replace(/&ntilde;/g, 'ñ');
}

async function importLey() {
    console.log(`Reading file: ${HTML_FILE}...`);
    // Read as buffer to handle potential encoding issues manually if needed
    const buffer = fs.readFileSync(HTML_FILE);
    let html = buffer.toString('latin1'); // Likely encoding for BOJA HTMLs with 

    // If latin1 doesn't look right (too many ), fallback to utf8
    if (html.includes('')) {
        html = buffer.toString('utf8');
    }

    const pMatches = html.match(/<p>([\s\S]*?)<\/p>/g) || [];
    let lines = pMatches.map(m => m.replace(/<p>|<\/p>/g, '').trim())
        .map(l => l.replace(/&nbsp;/g, ' '))
        .map(l => l.replace(/<[^>]+>/g, ''))
        .map(l => normalizeSpanish(l))
        .filter(l => l.length > 0);

    console.log(`Extracted ${lines.length} lines.`);

    let realStart = lines.findIndex(l => l === 'LEY DE VIVIENDA DE ANDALUCÍA');
    let startIndex = realStart !== -1 ? realStart : 0;

    const finalLines = lines.slice(startIndex);

    interface Block {
        title: string;
        content: string[];
        level: number;
        children: Block[];
        id?: string;
        parent_block_id?: string | null;
    }

    const roots: Block[] = [];
    let currentTitulo: Block | null = null;
    let currentCapitulo: Block | null = null;
    let currentArticulo: Block | null = null;
    let currentTarget: Block | null = null;

    for (const line of finalLines) {
        const cleanLine = line.trim();

        const isTituloNum = /^(T[ÍI]TULO|Disposici[óo]n (Adicional|Transitoria|Derogatoria|Final))/i.test(cleanLine);
        const isCapitulo = /^CAP[ÍI]TULO/i.test(cleanLine);
        const isArticulo = /^(Art[íi]culo \d+\.)/i.test(cleanLine);

        if (isTituloNum) {
            currentTitulo = { title: cleanLine, content: [], level: 0, children: [] };
            roots.push(currentTitulo);
            currentCapitulo = null;
            currentArticulo = null;
            currentTarget = currentTitulo;
        } else if (isCapitulo && currentTitulo) {
            currentCapitulo = { title: cleanLine, content: [], level: 1, children: [] };
            currentTitulo.children.push(currentCapitulo);
            currentArticulo = null;
            currentTarget = currentCapitulo;
        } else if (isArticulo) {
            currentArticulo = { title: cleanLine, content: [], level: 2, children: [] };
            if (currentCapitulo) {
                currentCapitulo.children.push(currentArticulo);
            } else if (currentTitulo) {
                currentTitulo.children.push(currentArticulo);
            } else {
                currentArticulo.level = 0;
                roots.push(currentArticulo);
            }
            currentTarget = currentArticulo;
        } else {
            if (currentTarget) {
                currentTarget.content.push(cleanLine);
            } else {
                const preBlock = { title: 'Preámbulo', content: [cleanLine], level: 0, children: [] };
                roots.push(preBlock);
                currentTarget = preBlock;
            }
        }
    }

    const toInsert: any[] = [];
    let order_index = 0;

    function processBlock(b: Block, parent_id: string | null = null) {
        const my_id = crypto.randomUUID();
        b.id = my_id;
        const type = b.level === 0 ? 'titulo' : b.level === 1 ? 'capitulo' : 'articulo';

        toInsert.push({
            id: my_id,
            document_id: DOCUMENT_ID,
            parent_block_id: parent_id,
            title: b.title,
            content: b.content.join('\n\n'),
            block_type: type,
            order_index: order_index++,
            tags: [],
            is_deleted: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        for (const child of b.children) {
            processBlock(child, my_id);
        }
    }

    for (const root of roots) {
        processBlock(root);
    }

    console.log(`Total blocks to insert: ${toInsert.length}`);

    await supabase.from('document_blocks').delete().eq('document_id', DOCUMENT_ID);

    const batchSize = 100;
    for (let i = 0; i < toInsert.length; i += batchSize) {
        await supabase.from('document_blocks').insert(toInsert.slice(i, i + batchSize));
        console.log(`Inserted batch ${i / batchSize + 1}`);
    }

    await supabase.from('documents').update({ title: 'Ley 5/2025 de Vivienda de Andalucía', updated_at: new Date().toISOString() }).eq('id', DOCUMENT_ID);

    console.log('DONE!');
}

importLey();
