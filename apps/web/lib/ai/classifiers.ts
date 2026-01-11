
import { ImportItem, ClassificationResult, SplitStrategy } from './types';

function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'id-' + Math.random().toString(36).substr(2, 9);
}

export function splitByHeader(text: string, level: number): ImportItem[] {
    // Detect HTML content
    if (text.trim().startsWith('<')) {
        return splitHtmlByHeader(text, level);
    }
    const pattern = `^#{${level}}\\s+(.+)`;
    return splitByPattern(text, pattern, level);
}

function splitHtmlByHeader(html: string, level: number): ImportItem[] {
    const items: ImportItem[] = [];
    const headerRegex = new RegExp(`<h${level}[^>]*>(.*?)<\/h${level}>`, 'gi');

    // Find all headers
    let match;
    let lastIndex = 0;

    // Check for pre-content (before first header)
    const firstMatch = headerRegex.exec(html);
    if (firstMatch && firstMatch.index > 0) {
        items.push({
            id: generateId(),
            title: 'Introducción / Portada',
            content: html.substring(0, firstMatch.index).trim(),
            target: 'active_version',
            level: level
        });
        // Reset regex state
        headerRegex.lastIndex = 0;
    }

    // Iterate headers
    while ((match = headerRegex.exec(html)) !== null) {
        // match[0] is full tag, match[1] is inner text (Title)
        const title = match[1].replace(/<[^>]+>/g, '').trim(); // Strip tags from title
        const startOfContent = headerRegex.lastIndex;

        // Find end of this section (start of next header or end of string)
        const nextRegex = new RegExp(`<h${level}[^>]*>`, 'gi');
        nextRegex.lastIndex = startOfContent;
        const nextMatch = nextRegex.exec(html);

        const endOfContent = nextMatch ? nextMatch.index : html.length;
        const content = html.substring(startOfContent, endOfContent).trim();

        items.push({
            id: generateId(),
            title: title || 'Sin Título',
            content: content, // Keep HTML content
            target: 'active_version',
            level: level
        });

        // Move main loop index (though regex handles it)
        // We need to set lastIndex manually? No, exec() loop handles it.
        // But we need to ensure we don't skip?
        // Actually, my manual lookahead `nextRegex` is fine, but the main `headerRegex` loop will find the next header naturally.
    }

    return items;
}

export function splitByPattern(text: string, patternStr: string, level?: number): ImportItem[] {
    const lines = text.split('\n');
    const items: ImportItem[] = [];
    const regex = new RegExp(patternStr);

    let currentTitle = '';
    let currentContent: string[] = [];

    for (const line of lines) {
        const match = line.match(regex);
        if (match) {
            if (currentTitle || currentContent.length > 0) {
                items.push({
                    id: generateId(),
                    title: currentTitle || (items.length === 0 ? 'Contenido Inicial / Portada' : 'Sin Título'),
                    content: currentContent.join('\n').trim(),
                    target: 'active_version',
                    level: level
                });
            }
            currentTitle = (match[1] || match[0]).trim();
            currentContent = [];
        } else {
            currentContent.push(line);
        }
    }

    if (currentTitle || currentContent.length > 0) {
        items.push({
            id: generateId(),
            title: currentTitle || 'Untitled',
            content: currentContent.join('\n').trim(),
            target: 'active_version',
            level: level
        });
    }

    return items;
}

export function buildHierarchy(allLines: string[], parentPattern: string, childPattern: string): ImportItem[] {
    const pRegex = new RegExp(parentPattern);
    const cRegex = new RegExp(childPattern);

    const rootItems: ImportItem[] = [];
    let currentParent: ImportItem | null = null;
    let currentTitle = '';
    let currentContent: string[] = [];
    let currentItemType: 'parent' | 'child' | null = null;

    function flush() {
        if (!currentTitle && currentContent.length === 0) return;

        const item: ImportItem = {
            id: generateId(),
            title: currentTitle || 'Untitled',
            content: currentContent.join('\n').trim(),
            target: 'active_version',
            children: []
        };

        if (currentItemType === 'parent') {
            rootItems.push(item);
            currentParent = item;
        } else if (currentItemType === 'child' && currentParent) {
            currentParent.children = currentParent.children || [];
            currentParent.children.push(item);
        } else {
            // If no parent yet, add to root
            rootItems.push(item);
        }
    }

    for (const line of allLines) {
        const pMatch = line.match(pRegex);
        const cMatch = line.match(cRegex);

        if (pMatch) {
            // If we have content before any parent match, it's pre-content
            if (!currentParent && !currentTitle && currentContent.length > 0) {
                currentItemType = null;
                currentTitle = 'Contenido Inicial / Portada';
            }
            flush();
            currentItemType = 'parent';
            currentTitle = pMatch[1] || pMatch[0];
            currentContent = [];
        } else if (cMatch) {
            // Same for child match if no parent yet
            if (!currentParent && !currentTitle && currentContent.length > 0) {
                currentItemType = null;
                currentTitle = 'Contenido Inicial / Portada';
            }
            flush();
            currentItemType = 'child';
            currentTitle = cMatch[1] || cMatch[0];
            currentContent = [];
        } else {
            currentContent.push(line);
        }
    }
    flush();

    return rootItems;
}

export async function splitBySemanticsMock(text: string): Promise<ImportItem[]> {
    // Mock artificial delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Just a mock implementation that roughly splits by paragraphs for now to simulate "topics"
    const paragraphs = text.split(/\n\s*\n/);

    return paragraphs.map((para, index) => ({
        id: generateId(),
        title: `Topic ${index + 1}: ${para.slice(0, 30)}...`,
        content: para.trim(),
        target: 'active_version' as const
    })).filter(item => item.content.length > 0);
}
