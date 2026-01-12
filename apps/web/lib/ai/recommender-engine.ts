import { supabase } from '@/lib/supabase/client';
import { extractKeywords } from './keyword-extractor';

export interface RecommendedItem {
    documentId: string;
    title: string;
    snippet: string;
    relevanceScore: number;
    qualityScore: number;
    tags: string[];
    reason: string;
}

/**
 * Intelligent Research Recommender Engine
 * Finds relevant research materials based on current writing context.
 */
export class RecommenderEngine {

    /**
     * core recommendation algorithm
     */
    async findRelevantResearch(
        currentBlockContent: string,
        projectId: string,
        limit: number = 5
    ): Promise<RecommendedItem[]> {

        // 1. Extract context keywords
        const keywords = extractKeywords(currentBlockContent);
        if (keywords.length === 0) return [];

        // 2. Search for research documents (marked in metadata)
        // We look for documents that have matching tags or content matches
        // Ideally this would be a vector search, but we'll use text search + tags for now

        const { data: researchDocs, error } = await supabase
            .from('documents')
            .select(`
                id,
                title,
                quality_score,
                metadata,
                document_blocks (
                    id,
                    content,
                    tags
                )
            `)
            .eq('project_id', projectId)
            .contains('metadata', { isResearch: true })
            .limit(20); // Search candidate pool

        if (error || !researchDocs) {
            console.error('Error fetching research docs:', error);
            return [];
        }

        const candidates: RecommendedItem[] = [];

        // 3. Score candidates
        for (const doc of researchDocs) {
            let maxScore = 0;
            let bestSnippet = '';
            let bestReason = '';

            // Analyze blocks within this doc
            const blocks = doc.document_blocks || [];

            for (const block of blocks) {
                // Score based on tag overlap
                const blockTags = block.tags || [];
                const tagOverlap = keywords.filter(k => blockTags.includes(k)).length;

                // Score based on text content (simple primitive)
                const contentLower = block.content.toLowerCase();
                const keywordMatches = keywords.filter(k => contentLower.includes(k.toLowerCase())).length;

                // Composite score
                const score = (tagOverlap * 5) + (keywordMatches * 1);

                if (score > maxScore) {
                    maxScore = score;
                    bestSnippet = block.content.slice(0, 150) + '...';
                    bestReason = `Contains matches for: ${keywords.slice(0, 3).join(', ')}`;
                }
            }

            if (maxScore > 0) {
                candidates.push({
                    documentId: doc.id,
                    title: doc.title,
                    snippet: bestSnippet,
                    relevanceScore: maxScore,
                    qualityScore: doc.quality_score || 0,
                    tags: (doc.metadata as any)?.tags || [],
                    reason: bestReason
                });
            }
        }

        // 4. Rank and Filter using weighted score (Relevance + Quality)
        return candidates
            .sort((a, b) => {
                const scoreA = a.relevanceScore + (a.qualityScore * 0.2);
                const scoreB = b.relevanceScore + (b.qualityScore * 0.2);
                return scoreB - scoreA;
            })
            .slice(0, limit);
    }
}

export const recommenderEngine = new RecommenderEngine();
