
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Load environment variables - mimicking Next.js priority
const envFiles = [
    '.env',
    '.env.local',
    '.env.development',
    '.env.development.local'
];

const webDir = path.join(process.cwd(), 'apps/web');

envFiles.forEach(file => {
    const filePath = path.join(webDir, file);
    if (fs.existsSync(filePath)) {
        console.log(`Loading env from ${filePath}`);
        dotenv.config({ path: filePath });
    }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
// Search for any key looking like a Supabase Anon or Service key
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY!;

console.log(`Checking Env: URL found? ${!!supabaseUrl}, Key found? ${!!supabaseKey}`);
if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials. Env content keys:", Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    throw new Error("Supabase Credentials Missing");
}
const supabase = createClient(supabaseUrl, supabaseKey);

const FILE_PATH = path.join(process.cwd(), 'apps', 'web', 'boe_vivienda.html');

// Mappings for manual corrections only if needed (UTF-8 should mostly work)
const REPLACEMENTS: Record<string, string> = {
    // Basic fixes just in case
    '&nbsp;': ' ',
    '&quot;': '"',
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    // Latin1 artifacts fixes (if any persist despite utf8 reading)
    'T?TULO': 'TÍTULO',
    'CAP?TULO': 'CAPÍTULO',
    'ART?CULO': 'ARTÍCULO',
    'SECCI?N': 'SECCIÓN'
};

function cleanText(text: string): string {
    let cleaned = text;
    for (const [key, val] of Object.entries(REPLACEMENTS)) {
        cleaned = cleaned.replace(new RegExp(key, 'g'), val);
    }
    return cleaned.trim();
}

async function fixDecretoImport() {
    console.log("🛠️ Starting DECRETO 5/2025 Repair (Index-Based)...");

    // 1. Read File as UTF-8
    let html = fs.readFileSync(FILE_PATH, 'utf-8');
    console.log(`📂 Read file: ${html.length} bytes`);

    // 2. Extract Index to build Skeleton
    console.log("📑 Extraction Index Hierarchy...");
    const indexRegex = /<ul id="lista-marcadores">([\s\S]*?)<\/ul>/i;
    const indexMatch = html.match(indexRegex);

    if (!indexMatch) {
        console.error("❌ Could not find index 'lista-marcadores'");
        return;
    }

    const indexHtml = indexMatch[1];
    const linkRegex = /<li><a href="#([^"]+)">([\s\S]*?)<\/a><\/li>/g;
    let linkMatch;

    interface Node {
        id: string; // The HTML anchor ID (e.g. "a1", "ti")
        title: string;
        level: number; // 0=Title, 1=Chapter, 2=Article/Section
        children: Node[];
        parentId: string | null; // ID of parent HTML anchor
        content?: string;
        type: string;
        dbId?: string; // Assigned after insertion
    }

    const nodes: Node[] = [];
    let lastTitleId: string | null = null;
    let lastChapterId: string | null = null;

    // Scan index to build hierarchy
    while ((linkMatch = linkRegex.exec(indexHtml)) !== null) {
        const id = linkMatch[1];
        const rawText = cleanText(linkMatch[2]);
        let title = rawText;

        let level = 2; // Default to article
        let type = 'clause';
        let parentId: string | null = null;

        const upper = title.toUpperCase();

        if (upper.startsWith('TÍTULO')) {
            level = 0;
            type = 'heading_1';
            lastTitleId = id;
            lastChapterId = null; // Reset chapter when new title starts
            parentId = null;
        }
        else if (upper.startsWith('CAPÍTULO')) {
            level = 1;
            type = 'heading_2';
            lastChapterId = id;
            parentId = lastTitleId; // Parent is current Title
        }
        else if (upper.startsWith('SECCIÓN')) {
            // Treat Section as a subtitle within Chapter (level 1 sibling or level 2 grouping?)
            // If user strict about 3 levels (Title/Chapter/Article), Sections are tricky.
            // Let's treat them as headings (Level 2) but acting as parents for articles?
            // OR simpler: Treat as just another block under Chapter.
            // Let's keep them as children of Chapter, siblings of Articles.
            level = 2;
            type = 'heading_3';
            parentId = lastChapterId || lastTitleId;
        }
        else if (title.startsWith('Artículo') || title.includes('Disposición')) {
            level = 2;
            type = 'clause';
            // Parent is Chapter if exists, else Title, else Root
            parentId = lastChapterId || lastTitleId;
        }
        else {
            // Preambulo, etc.
            level = 0;
            type = 'text';
            parentId = null;
        }

        nodes.push({ id, title, level, children: [], parentId, type });
    }

    console.log(`🌳 Constructed Hierarchy Skeleton: ${nodes.length} nodes from Index`);

    // 3. Extract Block Content
    // We map HTML IDs to content
    const blockRegex = /<div class="bloque" id="([^"]+)">([\s\S]*?)<\/div>/g;
    let blockMatch;
    const contentMap = new Map<string, string>();

    while ((blockMatch = blockRegex.exec(html)) !== null) {
        const id = blockMatch[1];
        let content = blockMatch[2];

        // Clean content
        content = content
            .replace(/<p class="bloque">[\s\S]*?<\/p>/g, '') // Remove [Bloque...] anchor
            .replace(/<h[45][^>]*?>[\s\S]*?<\/h[45]>/gi, '') // Remove Headers (we have them in title)
            .replace(/&nbsp;/g, ' ')
            .trim();

        contentMap.set(id, content);
    }

    // 4. Delete Old Blocks
    // Find document by title/content signature or hardcoded ID if we know it
    // The previous script used doc titled "Ley 5/2025..."
    // 4. Find ALL matches (Ley OR Decreto)
    const SEARCH_TERMS = ['Ley 5/2025', 'Decreto 5/2025'];
    console.log(`🔎 Searching for documents matching: ${SEARCH_TERMS.join(' OR ')}...`);

    const { data: foundDocs } = await supabase.from('documents')
        .select('id, project_id, title')
        .or(`title.ilike.%${SEARCH_TERMS[0]}%,title.ilike.%${SEARCH_TERMS[1]}%`);

    let docsToProcess = foundDocs || [];

    if (docsToProcess.length === 0) {
        console.log("⚠️ No document found. Creating one...");
        const { data: newDoc } = await supabase.from('documents').insert({
            project_id: '257507f4-c5ec-4054-ac3c-ec38803ddc9f',
            title: "Ley 5/2025, de 16 de diciembre, de Vivienda de Andalucía",
            status: 'active'
        }).select().single();
        if (newDoc) docsToProcess.push(newDoc);
    }

    console.log(`📌 Found ${docsToProcess.length} documents to repair.`);

    for (const doc of docsToProcess) {
        console.log(`\n==================================================`);
        console.log(`🛠️ Processing Document: ${doc.title} (${doc.id})`);

        console.log(`🗑️ Cleaning old blocks...`);
        await supabase.from('semantic_links').delete().eq('target_document_id', doc.id);
        await supabase.from('document_blocks').delete().eq('document_id', doc.id);

        console.log(`🚀 Inserting new structured blocks...`);
        const htmlIdToDbId = new Map<string, string>();
        let insertCount = 0;

        for (let i = 0; i < nodes.length; i++) {
            // Logic repeated from original script - safe to just let it run inside loop
            // But existing code uses `doc.id`. So `doc` variable must be in scope.
            // I will replace the outer scope block.

            // ... inner loop logic for nodes ...
            // Since I can't easily replace just the loop wrapper without rewriting the whole inner logic in `replace_file_content` (too large),
            // I will refactor to loop logic in the replacement content provided here.

            const node = nodes[i];
            const content = contentMap.get(node.id) || "";
            let parentDbId = node.parentId ? (htmlIdToDbId.get(node.parentId) || null) : null;

            const { data: insertedBlock, error } = await supabase.from('document_blocks').insert({
                document_id: doc.id,
                title: node.title,
                content: content,
                order_index: i,
                parent_block_id: parentDbId,
                block_type: node.type,
                tags: ['Ley 5/2025', 'Andalucía', node.level === 0 ? 'TÍTULO' : (node.level === 1 ? 'CAPÍTULO' : 'ARTÍCULO')]
            }).select('id').single();

            if (!error && insertedBlock) {
                htmlIdToDbId.set(node.id, insertedBlock.id);
                insertCount++;
                if (parentDbId) {
                    await supabase.from('semantic_links').insert({
                        source_block_id: parentDbId,
                        target_block_id: insertedBlock.id,
                        target_document_id: doc.id,
                        link_type: 'hierarchy',
                        metadata: { reason: 'Structure Hierarchy' }
                    });
                }
            }
            if (i % 20 === 0) process.stdout.write('.');
        }
        console.log(`\n✅ Processed ${doc.id}: Inserted ${insertCount} blocks.`);
    }

    console.log(`\n✅ Finished all documents.`);
    console.log("✨ 3-Level Hierarchy (Index-Based) is now live.");
}

fixDecretoImport().catch(console.error);
