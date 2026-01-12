
'use server';

import { aiService, SpecializedProfile } from '@/lib/ai/service';

export async function chatProjectAction(
    query: string,
    projectId: string,
    history: any[],
    profile?: SpecializedProfile
) {
    try {
        console.log(`[AI Action] Chat Request for Project: ${projectId}, Profile: ${profile}`);

        // Ensure we are catching any synchronous errors in instantiation too if possible, 
        // though aiService is already instantiated.

        const response = await aiService.chatProject(query, projectId, history, profile);
        return { success: true, data: response };
    } catch (error: any) {
        console.error("❌ [AI Action] Chat Failed:", error);
        return {
            success: false,
            error: error.message || 'Unknown internal error'
        };
    }
}
