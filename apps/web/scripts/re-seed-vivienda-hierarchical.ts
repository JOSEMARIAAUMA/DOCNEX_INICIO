import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const DOC_ID = "31f327db-df14-4d2d-b2b7-6d4c0e453cea";
const LAW_RESOURCE_ID = "aae619a1-fa6b-43a8-ae97-cbda513ce835";
const PROJECT_ID = "257507f4-c5ec-4054-ac3c-ec38803ddc9f";

async function ingestHierarchicalLawV4() {
    console.log("🌳 Iniciando Ingesta Jerárquica v7 (HTML Preservativo + Encoding Fix)...");

    const { data: existingResources } = await supabase.from('resources').select('id, title, source_uri');
    const resourceMap = new Map<string, string>();
    existingResources?.forEach(r => {
        if (r.source_uri) {
            const uri = r.source_uri.split('#')[0].replace(/&amp;/g, '&');
            resourceMap.set(uri, r.id);
            resourceMap.set(uri.replace('https://www.boe.es', ''), r.id);
        }
    });

    const filePath = path.join(process.cwd(), 'boe_vivienda.html');
    let html = fs.readFileSync(filePath, 'latin1');

    // Fix encoding artifacts in Latin1 string if any
    html = html.replace(/T\?TULO/g, 'TÍTULO')
        .replace(/CAP\?TULO/g, 'CAPÍTULO')
        .replace(/SECCI\?N/g, 'SECCIÓN')
        .replace(/ART\?CULO/g, 'ARTÍCULO')
        .replace(/est\?ndares/g, 'estándares')
        .replace(/m\?s/g, 'más')
        .replace(/Andaluc\?a/g, 'Andalucía')
        .replace(/Comunidad Aut\?noma/g, 'Comunidad Autónoma')
        .replace(/\?mbito/g, 'ámbito')
        .replace(/p\?blico/g, 'público')
        .replace(/p\?rrafo/g, 'párrafo')
        .replace(/competenc\?a/g, 'competencia')
        .replace(/garantiz\?/g, 'garantizá')
        .replace(/continu\?/g, 'continuó')
        .replace(/propus\?/g, 'propuso')
        .replace(/atenci\?n/g, 'atención')
        .replace(/t\?rminos/g, 'términos')
        .replace(/t\?tulo/g, 'título')
        .replace(/cap\?tulo/g, 'capítulo')
        .replace(/secci\?n/g, 'sección')
        .replace(/art\?culo/g, 'artículo');

    const blockRegex = /<div class="bloque" id="([^"]+)">([\s\S]*?)<\/div>/g;
    let match;
    const rawHierarchy: any[] = [];

    while ((match = blockRegex.exec(html)) !== null) {
        const bloqueId = match[1];
        const bloqueHtml = match[2];

        let level = 'article';
        let title = "";

        const h4NumMatch = bloqueHtml.match(/<h4 class="titulo_num">([\s\S]*?)<\/h4>/i);
        const h4TitMatch = bloqueHtml.match(/<h4 class="titulo_tit">([\s\S]*?)<\/h4>/i);
        const h5ArtMatch = bloqueHtml.match(/<h5 class="articulo">([\s\S]*?)<\/h5>/i);

        if (h4NumMatch) {
            title = h4NumMatch[1].replace(/<[^>]+>/g, ' ').trim();
            if (h4TitMatch) {
                const titText = h4TitMatch[1].replace(/<[^>]+>/g, ' ').trim();
                if (titText) title += ". " + titText;
            }
        } else if (h5ArtMatch) {
            title = h5ArtMatch[1].replace(/<[^>]+>/g, ' ').trim();
        } else {
            const rawText = bloqueHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            const boeHeaderMatch = rawText.match(/^\[Bloque \d+: #[a-z0-9-]+\]\s*(.*?\.?)(?:\n|<|$)/i);
            if (boeHeaderMatch) title = boeHeaderMatch[1].trim();
            else title = "Fragmento " + bloqueId;
        }

        const upperTitle = title.toUpperCase();
        if (upperTitle.includes('TÍTULO')) level = 'title';
        else if (upperTitle.includes('CAPÍTULO')) level = 'chapter';
        else if (upperTitle.includes('SECCIÓN')) level = 'section';
        else if (upperTitle.includes('ARTÍCULO')) level = 'article';
        else if (upperTitle.includes('DISPOSICIÓN')) level = 'provision';
        else if (upperTitle.includes('PREÁMBULO')) level = 'preamble';

        // PRESERVE HTML but clean the [Bloque] part
        let contentHtml = bloqueHtml
            .replace(/<p class="bloque">[\s\S]*?<\/p>/g, '') // Remove [Bloque...]
            .replace(/<h[45][^>]*?>[\s\S]*?<\/h[45]>/gi, '') // Remove Header from content
            .replace(/<a\s+[^>]*?href="([^"]+)"[^>]*?>([\s\S]*?)<\/a>/g, (m, href, text) => {
                // Keep links as HTML a tags for TipTap
                return `<a href="${href.replace(/&amp;/g, '&')}">${text}</a>`;
            })
            .trim();

        const blockLinks: string[] = [];
        const linkRegex = /<a\s+[^>]*?href="([^"]+)"[^>]*?>([\s\S]*?)<\/a>/g;
        let lMatch;
        while ((lMatch = linkRegex.exec(bloqueHtml)) !== null) {
            let href = lMatch[1].split('#')[0].replace(/&amp;/g, '&');
            const cleanHref = href.startsWith('/') ? 'https://www.boe.es' + href : href;
            if (resourceMap.has(cleanHref)) blockLinks.push(resourceMap.get(cleanHref)!);
        }

        rawHierarchy.push({
            level,
            title,
            content: contentHtml,
            blockLinks,
            tags: []
        });
    }

    console.log(`📦 Se han extraído ${rawHierarchy.length} unidades estructurales.`);
    console.log("🗑️ Limpiando infraestructura previa...");

    // Clear efficiently
    const { data: bIds } = await supabase.from('document_blocks').select('id').eq('document_id', DOC_ID);
    if (bIds && bIds.length > 0) {
        const ids = bIds.map(b => b.id);
        await supabase.from('block_resource_links').delete().in('block_id', ids);
    }
    await supabase.from('semantic_links').delete().eq('target_document_id', DOC_ID);
    await supabase.from('document_blocks').delete().eq('document_id', DOC_ID);

    let lastTitleId: string | null = null;
    let lastChapterId: string | null = null;
    let lastSectionId: string | null = null;
    let orderIndex = 0;

    for (const item of rawHierarchy) {
        let parentId: string | null = null;
        let block_type = 'standard';

        if (item.level === 'title') {
            parentId = null;
            block_type = 'heading_1';
        } else if (item.level === 'chapter') {
            parentId = lastTitleId;
            block_type = 'heading_2';
        } else if (item.level === 'section') {
            parentId = lastChapterId || lastTitleId;
            block_type = 'heading_3';
        } else {
            parentId = lastSectionId || lastChapterId || lastTitleId;
            block_type = item.level === 'article' ? 'clause' : 'standard';
        }

        const { data: bData, error: bError } = await supabase.from('document_blocks').insert({
            document_id: DOC_ID,
            title: item.title,
            content: item.content,
            order_index: orderIndex++,
            parent_block_id: parentId,
            block_type: block_type,
            tags: item.tags
        }).select().single();

        if (bError) {
            console.error(`❌ Error en bloque ${item.title}:`, bError);
            continue;
        }

        const blockData = bData as any;
        if (item.level === 'title') {
            lastTitleId = blockData.id;
            lastChapterId = null;
            lastSectionId = null;
        } else if (item.level === 'chapter') {
            lastChapterId = blockData.id;
            lastSectionId = null;
        } else if (item.level === 'section') {
            lastSectionId = blockData.id;
        }

        const links: any[] = [];
        links.push({ block_id: blockData.id, resource_id: LAW_RESOURCE_ID, relation: 'reference' });
        if (parentId) {
            await supabase.from('semantic_links').insert({
                source_block_id: parentId,
                target_block_id: blockData.id,
                target_document_id: DOC_ID,
                link_type: 'hierarchy'
            });
        }
        if (item.blockLinks.length > 0) {
            item.blockLinks.forEach((rid: string) => {
                links.push({ block_id: blockData.id, resource_id: rid, relation: 'cites' });
            });
        }
        if (links.length > 0) await supabase.from('block_resource_links').insert(links);
    }

    await supabase.from('documents').update({ status: 'active', updated_at: new Date() }).eq('id', DOC_ID);
    console.log("✨ Mapeo JERÁRQUICO v7 completado.");
}

ingestHierarchicalLawV4().catch(console.error);
