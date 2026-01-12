import { Document } from '@/lib/api';

export interface QualityMetrics {
    score: number; // 0-100
    level: 'platinum' | 'gold' | 'silver' | 'bronze';
    breakdown: {
        completeness: number; // 0-100
        citationDensity: number; // 0-100
        formatting: number; // 0-100
        feedbackOffset: number; // +/- based on user rating
    };
}

export const QUALITY_THRESHOLDS = {
    PLATINUM: 90,
    GOLD: 75,
    SILVER: 50,
};

/**
 * Calculates a quality score for a document based on various heuristics.
 */
export function calculateQualityScore(doc: any): QualityMetrics {
    // 1. Completeness: Based on word count and metadata presence
    const wordCount = doc.content ? doc.content.split(/\s+/).length : 0;
    // Target length around 1000 words? This is arbitrary, maybe configurable.
    // Let's say > 500 words is "good" completeness for a start.
    const completeness = Math.min(100, Math.max(0, (wordCount / 500) * 100));

    // 2. Citation Density: Check for patterns like [1], (Smith 2020), etc.
    // Simple regex for bracketed numbers or Typical citation patterns
    // This is a rough heuristic.
    const citationRegex = /\[\d+\]|\(\w+ et al\., \d{4}\)|\(\w+, \d{4}\)/g;
    const citations = doc.content ? (doc.content.match(citationRegex) || []).length : 0;
    // Expecting maybe 1 citation per 200 words? 5 citations per 1000 words.
    const densityRatio = wordCount > 0 ? (citations / wordCount) * 1000 : 0;
    const citationDensity = Math.min(100, (densityRatio / 5) * 100);

    // 3. Formatting/Structure
    // Does it have headers? Markdown headers #
    const headers = doc.content ? (doc.content.match(/^#{1,6}\s/gm) || []).length : 0;
    const formatting = Math.min(100, (headers / 3) * 100); // At least 3 headers for full score

    // 4. Feedback (Placeholder for now, assuming 0 if not present)
    // If we had a rating 1-5, we could map it.
    // 5 stars -> +10, 1 star -> -10
    const feedbackOffset = 0;

    // Weighted Average
    // Completeness: 40%, Citations: 30%, Formatting: 30%
    let rawScore = (completeness * 0.4) + (citationDensity * 0.3) + (formatting * 0.3) + feedbackOffset;
    rawScore = Math.min(100, Math.max(0, rawScore));

    const score = Math.round(rawScore);

    let level: QualityMetrics['level'] = 'bronze';
    if (score >= QUALITY_THRESHOLDS.PLATINUM) level = 'platinum';
    else if (score >= QUALITY_THRESHOLDS.GOLD) level = 'gold';
    else if (score >= QUALITY_THRESHOLDS.SILVER) level = 'silver';

    return {
        score,
        level,
        breakdown: {
            completeness,
            citationDensity,
            formatting,
            feedbackOffset
        }
    };
}
