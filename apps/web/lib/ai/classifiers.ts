
import { ImportItem, ClassificationResult, SplitStrategy } from './types';

function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'id-' + Math.random().toString(36).substr(2, 9);
}

export function splitByHeader(text: string, level: number): ImportItem[] {
    const pattern = `^#{${level}}\\s+(.+)`;
    return splitByPattern(text, pattern, level);
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
