export interface TextStyle {
    type: 'bold' | 'italic' | 'code' | 'highlight' | 'strikethrough' | 'underline' | 'list' | 'quote' | 'header' | 'paragraph';
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
        type: 'header',  // New structural type
        label: 'Encabezados',
        pattern: /^#{1,6}\s+.+/gm,
        example: '# Título'
    },
    {
        type: 'list',
        label: 'Listas',
        pattern: /^[\s]*[-*+]\s+|^[\s]*\d+\.\s+/gm,
        example: '- elemento'
    },
    {
        type: 'quote',
        label: 'Citas',
        pattern: /^>\s+.+/gm,
        example: '> cita'
    },
    {
        type: 'code',
        label: 'Código',
        pattern: /`{3}[\s\S]*?`{3}|`[^`]+`/g,
        example: '```código```'
    },
    {
        type: 'paragraph', // Generic text
        label: 'Texto Normal',
        pattern: /^(?![#>-])(?:(?!\d+\.|[-*]).)+$/gm, // Lines that are NOT headers, quotes, or lists.
        example: 'Texto normal...'
    }
];


export function analyzeText(text: string): StyleAnalysis {
    // Optimization: Limit analysis to first 100,000 characters to prevent freezing on large files.
    // This provides enough context for style and header detection without parsing the entire document.
    const sample = text.length > 100000 ? text.slice(0, 100000) : text;
    const lines = sample.split('\n');
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
        if (style.pattern.test(sample)) {
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
