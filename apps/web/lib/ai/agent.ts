
import { splitByHeader, splitBySemanticsMock, splitByPattern, buildHierarchy } from './classifiers';
import { ImportItem, SplitStrategy } from './types';

export class AIAgent {
    async processText(
        text: string,
        strategy: SplitStrategy,
        options: {
            headerLevel?: number,
            customPattern?: string,
            childPattern?: string,
            isHierarchical?: boolean
        } = {}
    ): Promise<ImportItem[]> {
        const { headerLevel = 2, customPattern = '', childPattern = '', isHierarchical = false } = options;

        if (isHierarchical && (strategy === 'header' || strategy === 'custom')) {
            const pPattern = strategy === 'header' ? `^#{${headerLevel}}\\s+(.+)` : customPattern;
            const cPattern = childPattern || `^#{${headerLevel + 1}}\\s+(.+)`;
            return buildHierarchy(text.split('\n'), pPattern, cPattern);
        }

        switch (strategy) {
            case 'header':
                return splitByHeader(text, headerLevel);
            case 'custom':
                return splitByPattern(text, customPattern);
            case 'semantic':
                return splitBySemanticsMock(text);
            case 'manual':
            default:
                // Treat whole text as one block
                return [{
                    id: crypto.randomUUID(),
                    title: 'Imported Text',
                    content: text,
                    target: 'active_version'
                }];
        }
    }

    async generatePatternsFromExamples(examples: string): Promise<{ parentPattern: string, childPattern: string }> {
        // AI logic to deduce pattern from user examples
        const trimmed = examples.trim();
        const low = trimmed.toLowerCase();
        if (trimmed.length < 1) return { parentPattern: '', childPattern: '' };

        // 1. Structural Detection: Markdown Headers (e.g., "# Header")
        const headerMatch = trimmed.match(/^(#{1,6})\s+/);
        if (headerMatch) {
            const hashes = headerMatch[1];
            // We escape the hashes for regex and create a pattern that matches that header level
            return { parentPattern: `^${hashes}\\s+.+`, childPattern: '' };
        }

        // 2. Structural Detection: Known structured patterns
        if (low.includes('a)') || low.includes('b)')) {
            return { parentPattern: '^\\d+\\.', childPattern: '^[a-z]\\)' };
        }
        if (/^t[íi]tulo/i.test(low)) {
            return { parentPattern: '^T[ÍI]TULO\\s+[IVX0-9]+', childPattern: '^CAP[ÍI]TULO\\s+\\d+' };
        }
        if (/^cap[íi]tulo/i.test(low)) {
            return { parentPattern: '^CAP[ÍI]TULO\\s+\\d+', childPattern: '^ART[ÍI]CULO\\s+\\d+' };
        }

        // 3. Structural Detection: Numbering (e.g., "1. Introduction")
        if (/^\d+[\.\)]/.test(trimmed)) {
            const separator = trimmed.match(/^\d+([\.\)])/)?.[1] || '.';
            return { parentPattern: `^\\d+\\${separator}`, childPattern: '' };
        }

        // 4. Structural Detection: Uppercase Titles (e.g., "INTRODUCTION")
        // If it's a single line and mostly uppercase letters
        if (trimmed.split('\n').length === 1 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
            // Pattern for lines that are only uppercase, numbers and spaces
            return { parentPattern: '^[A-ZÁÉÍÓÚÑ0-9\\s]{3,}$', childPattern: '' };
        }

        // 5. Fallback: Generic pattern deduction
        const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let pattern = `^${escaped}`;

        // If it starts with a number, generalize it
        if (/^\d+/.test(trimmed)) {
            pattern = pattern.replace(/^\d+/, '\\d+');
        } else if (/^[A-Z]\./.test(trimmed)) {
            pattern = pattern.replace(/^[A-Z]/, '[A-Z]');
        }

        return { parentPattern: pattern, childPattern: '' };
    }

    // Placeholder for real LLM integration
    async suggestTarget(content: string): Promise<'active_version' | 'reference' | 'note'> {
        // Mock logic: if short -> 'note', if long -> 'active_version'
        return content.length < 200 ? 'note' : 'active_version';
    }
}

export const aiAgent = new AIAgent();
