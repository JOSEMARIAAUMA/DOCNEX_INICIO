'use server';

import { supabase } from '@/lib/supabase/client';
import { recommenderEngine, RecommendedItem } from '@/lib/ai/recommender-engine';

/**
 * Get research recommendations for a specific block context
 */
export async function getRecommendationsForBlock(
    blockId: string
): Promise<{ success: boolean; recommendations?: RecommendedItem[]; error?: string }> {
    try {
        // 1. Fetch block content
        const { data: block, error: blockError } = await supabase
            .from('document_blocks')
            .select('content, document:document_id(project_id)')
            .eq('id', blockId)
            .single();

        if (blockError || !block) throw new Error('Block not found');

        const projectId = (block.document as any)?.project_id;
        if (!projectId) throw new Error('Project context missing');

        // 2. Run engine
        const recommendations = await recommenderEngine.findRelevantResearch(
            block.content,
            projectId
        );

        return { success: true, recommendations };
    } catch (error: any) {
        console.error('[getRecommendations]', error);
        return { success: false, error: error.message };
    }
}

/**
 * Log user interaction with a recommendation (Feedback Loop)
 */
export async function markRecommendationAsUseful(
    contextBlockId: string,
    recommendedDocId: string,
    interactionType: 'viewed' | 'copied' | 'referenced' | 'dismissed'
) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from('recommendation_logs').insert({
            user_id: user.id,
            context_block_id: contextBlockId,
            recommended_document_id: recommendedDocId,
            interaction_type: interactionType
        });

        // Bonus: If copied/referenced, boost quality score of source doc
        if (interactionType === 'copied' || interactionType === 'referenced') {
            await supabase.rpc('increment_document_quality', { doc_id: recommendedDocId, amount: 1 });
        }

    } catch (error) {
        console.error('[markRecommendationAsUseful]', error);
    }
}
