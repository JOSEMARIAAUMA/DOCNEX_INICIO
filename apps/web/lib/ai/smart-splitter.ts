
export interface SplitResult {
    title: string;
    content: string;
    level: number;
    index?: number;
}

/**
 * Splits text based on a provided structure/index.
 * @param text Full text content
 * @param indexText Text containing the list of titles/headers
 */
export function splitByIndex(text: string, indexText: string): SplitResult[] {
    const lines = indexText.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
    const results: SplitResult[] = [];

    // Simple heuristic: Find where each index line occurs in the text
    // This is tricky because the index title might slightly differ or appear multiple times.
    // We'll search for exact matches first, then fuzzy?
    // For MVP: Exact match of the line (ignoring some whitespace/numbering variants)

    // Normalize text for searching
    // We will look for the index lines in order.

    let lastPos = 0;

    for (let i = 0; i < lines.length; i++) {
        const title = lines[i];
        // Create a regex to find this title, ensuring it's at start of line
        const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Allow for some flexibility: optional numbering options
        const regex = new RegExp(`^${escaped}`, 'im');

        // Search in text substring from lastPos
        const remainingText = text.slice(lastPos);
        const match = remainingText.match(regex);

        if (match && match.index !== undefined) {
            const absPos = lastPos + match.index;

            // If we have a previous block, close it
            if (results.length > 0) {
                const prev = results[results.length - 1];
                // Content is text between prev match and this match
                // But wait, we need to store start pos to extract content later?
                // Let's just store the start pos in the result list and refine content at the end
            }

            results.push({
                title: title,
                content: '', // Will fill content next
                level: 1, // Assumption: Index is flat for now or we parse indentation
                index: absPos
            });

            // Move lastPos to end of this title to find next content
            lastPos = absPos + match[0].length;
        }
    }

    // Fill content
    for (let i = 0; i < results.length; i++) {
        const current = results[i];
        const next = results[i + 1];

        const start = current.index! + current.title.length; // Approximate start (after title)
        const end = next ? next.index : text.length;

        current.content = text.slice(start, end).trim();
    }

    return results.filter(r => r.content.length > 0 || r.title.length > 0);
}

/**
 * Smart numbering splitter.
 * Detects sequences (1, 2, 3...) and ignores out-of-sequence numbers (1, 2, 1, 2...).
 */
export function splitBySmartNumbering(text: string): SplitResult[] {
    // 1. Scan all lines starting with numbers
    const lines = text.split('\n');
    const numberLines: { line: number, num: number, text: string }[] = [];

    // Match lines starting with number + dot/paren
    const regex = /^(\d+)[.)]\s+(.+)/;

    lines.forEach((l, idx) => {
        const m = l.match(regex);
        if (m) {
            numberLines.push({
                line: idx,
                num: parseInt(m[1]),
                text: l
            });
        }
    });

    if (numberLines.length < 2) return [];

    // 2. Find the Longest Increasing Subsequence (LIS) of numbers?
    // Actually we want the "Main" sequence.
    // Heuristic: The sequence that covers the most ground or reaches the highest number?
    // Or just filter out "resets" that are too frequent.

    // Let's try to identify the "primary" sequence.
    // Valid transition: nextNum = currentNum + 1

    const sequences: { line: number, num: number, text: string }[][] = [];
    let currentSeq: { line: number, num: number, text: string }[] = [];

    // Group by potential sequences
    // This is a simplified algo: Greedy approach for 1, 2, 3...

    // Try to find a '1' that starts a long chain
    const starts = numberLines.filter(n => n.num === 1);

    let bestSequence: typeof numberLines = [];

    for (const start of starts) {
        const seq = [start];
        let nextExpected = 2;

        // Look forward from this start
        // We can skip lines, but we want the *next* occurrence of nextExpected
        let searchIdx = numberLines.indexOf(start) + 1;

        while (searchIdx < numberLines.length) {
            const candidate = numberLines[searchIdx];
            if (candidate.num === nextExpected) {
                // Check if this candidate is better than another candidate?
                // For now, take the first one found (greedy)
                seq.push(candidate);
                nextExpected++;
            }
            searchIdx++;
        }

        if (seq.length > bestSequence.length) {
            bestSequence = seq;
        }
    }

    // If best sequence is short (e.g. < 3 items) and there are many blocks, maybe it's not good.
    // But let's return these as the split points.

    const results: SplitResult[] = [];

    for (let i = 0; i < bestSequence.length; i++) {
        const item = bestSequence[i];
        const nextItem = bestSequence[i + 1];

        // Get content from this line index to next line index
        // We need original text indices or just join lines
        const startLineIdx = item.line;
        const endLineIdx = nextItem ? nextItem.line : lines.length;

        const contentLines = lines.slice(startLineIdx + 1, endLineIdx);
        const content = contentLines.join('\n').trim();

        results.push({
            title: item.text,
            content,
            level: 1,
            index: 0 // Mock index not used here
        });
    }

    return results;
}
