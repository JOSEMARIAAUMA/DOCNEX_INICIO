'use server';

import { roadmapAgent } from '@/lib/ai/agents/roadmap-agent';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Action to generate a new roadmap for a project
 */
export async function generateProjectRoadmapAction(projectId: string, title: string, description: string) {
    try {
        const result = await roadmapAgent.generateInitialRoadmap(projectId, title, description);
        await roadmapAgent.updateSuggestions(projectId);
        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Action to fetch roadmap and steps
 */
export async function getProjectRoadmapAction(projectId: string) {
    try {
        const { data: roadmap, error: rError } = await supabase
            .from('project_roadmaps')
            .select('*, roadmap_steps(*)')
            .eq('project_id', projectId)
            .single();

        if (rError && rError.code !== 'PGRST116') throw rError; // PGRST116 is not found

        if (!roadmap) return { success: true, data: null };

        // Sort steps
        if (roadmap.roadmap_steps) {
            roadmap.roadmap_steps.sort((a: any, b: any) => a.order_index - b.order_index);
        }

        return { success: true, data: roadmap };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Action to update step status
 */
export async function updateStepStatusAction(stepId: string, status: 'pending' | 'in_progress' | 'completed') {
    try {
        const { error } = await supabase
            .from('roadmap_steps')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', stepId);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
