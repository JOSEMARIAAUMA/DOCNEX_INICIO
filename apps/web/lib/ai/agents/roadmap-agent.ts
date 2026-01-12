import { createClient } from '@supabase/supabase-js';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

/**
 * ROADMAP AGENT (The Planner)
 * Responsible for creating and updating dynamic step-by-step project plans.
 */
export class RoadmapAgent {
    private model: ChatGoogleGenerativeAI;
    private supabase: any;

    constructor() {
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        this.model = new ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash",
            maxOutputTokens: 2048,
            apiKey: apiKey,
        });

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    /**
     * Generate an initial roadmap based on the project information.
     */
    async generateInitialRoadmap(projectId: string, projectTitle: string, projectDescription: string) {
        console.log(`[Roadmap] Generating plan for project: ${projectTitle}`);

        const prompt = `Actúa como un Consultor Estratégico y Project Manager experto.
        Tu tarea es generar un ROADMAP (Hoja de Ruta) detallado para un trabajo técnico o jurídico.
        
        PROYECTO: "${projectTitle}"
        DESCRIPCIÓN: "${projectDescription}"
        
        INSTRUCCIONES:
        1. Define entre 4 y 7 PASOS claramente identificados (Paso 1, Paso 2...).
        2. Cada paso debe tener un título CORTO y una descripción CLARA de la acción requerida.
        3. El primer paso suele ser "Preparación y Recopilación de Fuentes".
        4. El último paso suele ser "Revisión Final y Entrega".
        
        Devuelve la respuesta SOLO como un JSON con este formato:
        {
          "steps": [
            { "order_index": 1, "title": "...", "description": "..." },
            ...
          ]
        }
        `;

        try {
            const response = await this.model.invoke(prompt);
            let content = response.content.toString();

            // Refined JSON extraction
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("No JSON block found in response");

            let jsonString = jsonMatch[0];
            // Basic fix for common AI JSON trailing comma issues or extra text
            jsonString = jsonString.replace(/,\s*([\}\]])/g, '$1');

            const result = JSON.parse(jsonString);

            // 1. Create Roadmap entry
            const { data: roadmap, error: rError } = await this.supabase
                .from('project_roadmaps')
                .upsert([{ project_id: projectId }], { onConflict: 'project_id' })
                .select()
                .single();

            if (rError) throw rError;

            // 2. Create steps
            const stepsToInsert = result.steps.map((s: any) => ({
                roadmap_id: roadmap.id,
                order_index: s.order_index,
                title: s.title,
                description: s.description,
                status: s.order_index === 1 ? 'in_progress' : 'pending'
            }));

            await this.supabase.from('roadmap_steps').delete().eq('roadmap_id', roadmap.id); // Clean old steps if any
            const { error: sError } = await this.supabase.from('roadmap_steps').insert(stepsToInsert);

            if (sError) throw sError;
            return { success: true, stepsCount: stepsToInsert.length };

        } catch (e: any) {
            console.error("[RoadmapAgent] Error generating initial roadmap:", e.message);
            return { success: false, error: e.message };
        }
    }

    /**
     * Analyze project state and provide dynamic suggestions.
     */
    async updateSuggestions(projectId: string) {
        // Fetch project state: docs, blocks, logs
        const { data: project } = await this.supabase.from('projects').select('*, documents(*), project_activity_logs(*)').eq('id', projectId).single();

        if (!project) return;

        const prompt = `Basándote en el estado actual del proyecto "${project.name}", ofrece 3 sugerencias dinámicas para el usuario.
        
        ESTADO:
        - Documentos ingeridos: ${project.documents?.length || 0}
        - Actividades registradas: ${project.project_activity_logs?.length || 0}
        
        Analiza qué falta por hacer. ¿Falta relacionar fuentes? ¿Falta sintetizar? ¿Hay contradicciones?
        
        Devuelve SOLO un array JSON de strings con las sugerencias. Máximo 3 sugerencias.`;

        try {
            const response = await this.model.invoke(prompt);
            const content = response.content.toString();
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const suggestions = JSON.parse(jsonMatch[0]);
                await this.supabase.from('project_roadmaps').update({ suggestions }).eq('project_id', projectId);
            }
        } catch (e) {
            console.error("[RoadmapAgent] Error updating suggestions:", e);
        }
    }
}

export const roadmapAgent = new RoadmapAgent();
