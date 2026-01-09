export interface StyleMapping {
    source: string; // 'bold', 'italic', etc.
    target: string; // 'strong', 'emphasis', etc.
}

export interface DocumentStyle {
    id: string;
    label: string;
    markdown: string;
    color?: string;
}

// Define available target styles in the document
export const DOCUMENT_STYLES: DocumentStyle[] = [
    { id: 'strong', label: 'Strong', markdown: '**TEXT**', color: '#7c3aed' },
    { id: 'emphasis', label: 'Emphasis', markdown: '*TEXT*', color: '#2563eb' },
    { id: 'mark', label: 'Highlight', markdown: '==TEXT==', color: '#eab308' },
    { id: 'code', label: 'Code', markdown: '`TEXT`', color: '#10b981' },
    { id: 'strikethrough', label: 'Strikethrough', markdown: '~~TEXT~~', color: '#ef4444' },
    { id: 'none', label: 'Remove Style', markdown: 'TEXT', color: '#6b7280' },
];

export function transformContent(
    content: string,
    mappings: StyleMapping[],
    preserveOriginal: boolean = false
): string {
    if (preserveOriginal) {
        return content;
    }

    let transformed = content;

    for (const mapping of mappings) {
        const targetStyle = DOCUMENT_STYLES.find(s => s.id === mapping.target);
        if (!targetStyle) continue;

        // Transform based on source pattern
        switch (mapping.source) {
            case 'bold':
                // Replace **text** or __text__ with target style
                if (mapping.target === 'none') {
                    transformed = transformed.replace(/\*\*(.+?)\*\*/g, '$1');
                    transformed = transformed.replace(/__(.+?)__/g, '$1');
                } else {
                    const targetPattern = targetStyle.markdown.replace('TEXT', '$1');
                    transformed = transformed.replace(/\*\*(.+?)\*\*/g, targetPattern);
                    transformed = transformed.replace(/__(.+?)__/g, targetPattern);
                }
                break;

            case 'italic':
                if (mapping.target === 'none') {
                    transformed = transformed.replace(/\*(.+?)\*/g, '$1');
                    transformed = transformed.replace(/_(.+?)_/g, '$1');
                } else {
                    const targetPattern = targetStyle.markdown.replace('TEXT', '$1');
                    transformed = transformed.replace(/\*(.+?)\*/g, targetPattern);
                    transformed = transformed.replace(/_(.+?)_/g, targetPattern);
                }
                break;

            case 'code':
                if (mapping.target === 'none') {
                    transformed = transformed.replace(/`(.+?)`/g, '$1');
                } else if (mapping.target !== 'code') {
                    const targetPattern = targetStyle.markdown.replace('TEXT', '$1');
                    transformed = transformed.replace(/`(.+?)`/g, targetPattern);
                }
                break;

            case 'highlight':
                if (mapping.target === 'none') {
                    transformed = transformed.replace(/==(.+?)==/g, '$1');
                } else {
                    const targetPattern = targetStyle.markdown.replace('TEXT', '$1');
                    transformed = transformed.replace(/==(.+?)==/g, targetPattern);
                }
                break;

            case 'strikethrough':
                if (mapping.target === 'none') {
                    transformed = transformed.replace(/~~(.+?)~~/g, '$1');
                } else if (mapping.target !== 'strikethrough') {
                    const targetPattern = targetStyle.markdown.replace('TEXT', '$1');
                    transformed = transformed.replace(/~~(.+?)~~/g, targetPattern);
                }
                break;
        }
    }

    return transformed;
}
