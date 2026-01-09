export interface TextStyle {
    type: 'bold' | 'italic' | 'code' | 'highlight' | 'strikethrough' | 'underline' | 'list' | 'quote';
    label: string;
    pattern: RegExp;
    example: string;
}

export interface StyleAnalysis {
    headerLevels: number[]; // [1, 2, 3] if H1, H2, H3 found
    textStyles: TextStyle[];
    estimatedBlocks: Record<number, number>; // { 1: 3, 2: 12 } = 3 H1s, 12 H2s
    hasContent: boolean;
}

export const AVAILABLE_TEXT_STYLES: TextStyle[] = [
    {
        type: 'bold',
        label: 'Negrita',
        pattern: /\*\*(.+?)\*\*|__(.+?)__/g,
        example: '**texto**'
    },
    {
        type: 'italic',
        label: 'Cursiva',
        pattern: /\*(.+?)\*|_(.+?)_/g,
        example: '*texto*'
    },
    {
        type: 'code',
        label: 'Código',
        pattern: /`(.+?)`/g,
        example: '`código`'
    },
    {
        type: 'highlight',
        label: 'Resaltado',
        pattern: /==(.+?)==/g,
        example: '==texto=='
    },
    {
        type: 'strikethrough',
        label: 'Tachado',
        pattern: /~~(.+?)~~/g,
        example: '~~texto~~'
    },
    {
        type: 'underline',
        label: 'Subrayado',
        pattern: /<u>(.+?)<\/u>/g,
        example: '<u>texto</u>'
    },
    {
        type: 'list',
        label: 'Lista / Viñeta',
        pattern: /^[\s]*[-*+]\s+|^[\s]*\d+\.\s+/gm,
        example: '- elemento'
    },
    {
        type: 'quote',
        label: 'Cita',
        pattern: /^> .+/gm,
        example: '> cita'
    }
];

export function analyzeText(text: string): StyleAnalysis {
    const lines = text.split('\n');
    const headerCounts: Record<number, number> = {};
    const foundStyles: Set<TextStyle['type']> = new Set();

    // Detect headers
    for (const line of lines) {
        const headerMatch = line.match(/^(#{1,6})\s+/);
        if (headerMatch) {
            const level = headerMatch[1].length;
            headerCounts[level] = (headerCounts[level] || 0) + 1;
        }
    }

    // Detect text styles
    for (const style of AVAILABLE_TEXT_STYLES) {
        if (style.pattern.test(text)) {
            foundStyles.add(style.type);
        }
    }

    const headerLevels = Object.keys(headerCounts)
        .map(Number)
        .sort((a, b) => a - b);

    const detectedStyles = AVAILABLE_TEXT_STYLES.filter(s =>
        foundStyles.has(s.type)
    );

    return {
        headerLevels,
        textStyles: detectedStyles,
        estimatedBlocks: headerCounts,
        hasContent: text.trim().length > 0
    };
}
