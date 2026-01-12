import { createClient } from '@supabase/supabase-js';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

/**
 * PROJECT MANAGER AGENT (The Orchestrator)
 * Responsible for logging the cognitive process, assigning profiles, 
 * and maintaining the long-term memory of a project's evolution.
 */
export class ProjectManagerAgent {
    private model: ChatGoogleGenerativeAI;
    private supabase: any;
    private memoryLogs: any[] = []; // Fallback memory

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
     * Persist an agent's reasoning and actions into the project history.
     */
    async logActivity(projectId: string, data: {
        agent_profile: string;
        action_type: string;
        reasoning: string;
        metadata?: any;
    }) {
        console.log(`[PM] Logging activity for ${data.agent_profile}: ${data.action_type}`);

        const logEntry = {
            project_id: projectId,
            agent_profile: data.agent_profile,
            action_type: data.action_type,
            reasoning: data.reasoning,
            metadata: data.metadata || {},
            created_at: new Date().toISOString()
        };

        this.memoryLogs.push(logEntry);

        const { error } = await this.supabase.from('project_activity_logs').insert([logEntry]);

        if (error) {
            console.error("[PM] Error logging activity. Table 'project_activity_logs' might not exist yet.", error.message);
        }
    }

    /**
     * Retrieve the full history of a project.
     */
    async getProjectHistory(projectId: string) {
        const { data, error } = await this.supabase
            .from('project_activity_logs')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: true });

        if (error || !data || data.length === 0) {
            // Filter memory logs by project ID if they exist
            return this.memoryLogs.filter(l => l.project_id === projectId);
        }
        return data;
    }

    /**
     * Generate an executive report summarizing the cognitive evolution of the project.
     */
    async generateProjectReport(projectId: string, projectName: string) {
        const history = await this.getProjectHistory(projectId);

        if (history.length === 0) {
            return `No se han registrado actividades cognitivas para el proyecto "${projectName}".`;
        }

        const prompt = `Actúa como un Project Manager Senior y Consultor de Estrategia IA. 
        Analiza el historial de actividades del proyecto "${projectName}" y genera un INFORME ESTRATÉGICO DETALLADO.
        
        HISTORIAL DE ACTIVIDADES:
        ${JSON.stringify(history, null, 2)}
        
        EL INFORME DEBE INCLUIR:
        1. **Resumen de la Evolución**: Qué se ha hecho y por qué.
        2. **Análisis de Razonamiento**: Evalúa las decisiones técnicas tomadas por los agentes (Bibliotecario, Relacional, etc.).
        3. **Notas de Aprendizaje**: Qué ha "aprendido" el equipo IA sobre este proyecto específico.
        4. **Mejoras y Perfeccionamiento**: Sugiere cómo optimizar los perfiles de los agentes o crear workflows específicos basados en esta experiencia.
        5. **Notas del Usuario**: (Si existen en el historial, menciónalas como guía).
        
        Tono: Profesional, experto y visionario.`;

        try {
            const response = await this.model.invoke(prompt);
            return response.content.toString();
        } catch (e: any) {
            return `Error al generar el informe: ${e.message}`;
        }
    }
}

export const projectManagerAgent = new ProjectManagerAgent();
