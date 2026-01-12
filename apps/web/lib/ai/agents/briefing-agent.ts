import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateGraph, END } from "@langchain/langgraph";
import { AIContext } from "@/types/ai";

/**
 * State for the Briefing Agent
 */
interface BriefingState {
    projectContext: string;
    objective: string;
    targetAudience: string;
    briefing?: string;
    imagePrompts?: string;
}

export class BriefingAgent {
    private model: ChatGoogleGenerativeAI;

    constructor() {
        this.model = new ChatGoogleGenerativeAI({
            model: "gemini-1.5-flash",
            apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
            temperature: 0.7,
        });
    }

    /**
     * Generates a high-engineering prompt for external research (NotebookLM, Perplexity, etc.)
     */
    async generateExternalBriefing(state: BriefingState): Promise<Partial<BriefingState>> {
        const prompt = `Actúa como un Director de Inteligencia Artificial y Estrategia.
Tu objetivo es redactar un "EXTERNAL INTELLIGENCE BRIEFING" para que un usuario humano lo utilice en NotebookLM o herramientas similares.

CONTEXTO DEL PROYECTO:
${state.projectContext}

OBJETIVO DEL TRABAJO:
${state.objective}

AUDIENCIA:
${state.targetAudience}

TAREA:
Crea un briefing de alta ingeniería de prompts. Debe incluir:
1. "Misión de Investigación": Qué debe buscar el usuario fuera de DOCNEX.
2. "Fuentes Sugeridas": Qué tipo de documentos debe subir el usuario a NotebookLM (ej. BOE, Informes de Mercado, etc.).
3. "The Master Prompt": Un prompt extremadamente detallado y estructurado para NotebookLM que exprima al máximo el contexto externo y lo alinee con el proyecto actual.

Formato: Markdown profesional y elegante.`;

        try {
            const resp = await this.model.invoke(prompt);
            return { briefing: resp.content.toString() };
        } catch (e) {
            console.error("[BriefingAgent] Error generating briefing:", e);
            return { briefing: "Error al generar el briefing de investigación externa." };
        }
    }

    /**
     * Generates a technical annex for image generation (Midjourney/DALL-E)
     */
    async generateVisualAnnex(state: BriefingState): Promise<Partial<BriefingState>> {
        const prompt = `Actúa como un Director de Arte y Especialista en Visualización de Datos Técnicos.
Tu objetivo es crear un "ANEXO DE SÍNTESIS VISUAL" para guiar a una IA generadora de imágenes (como Midjourney o DALL-E 3).

CONTENIDO DEL INFORME:
${state.projectContext.slice(0, 3000)}

ESTILO REQUERIDO:
Arquitectónico, técnico moderno, profesional, limpio, colores corporativos (azul DOCNEX, ámbar, gris pizarra), estilo "Glassmorphism" y diagramas de alta gama.

TAREA:
Genera 3-4 prompts de alta calidad para:
1. Una infografía central que resuma los cambios legales.
2. Un gráfico de representación de datos sobre plazos y optimización.
3. Un render conceptual que ilustre la "vivienda del futuro" bajo esta ley.
4. Una tabla comparativa visualizada.

Cada prompt debe ser en inglés (mejor para las IAs de imagen) pero explicado en español para el usuario.`;

        try {
            const resp = await this.model.invoke(prompt);
            return { imagePrompts: resp.content.toString() };
        } catch (e) {
            console.error("[BriefingAgent] Error generating visual annex:", e);
            return { imagePrompts: "Error al generar el anexo visual." };
        }
    }
}

export const briefingAgent = new BriefingAgent();
