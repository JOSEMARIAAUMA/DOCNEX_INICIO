import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateGraph, END } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";
import { BlockItem } from "../schemas";

/**
 * Relational Agent State
 */
const RelationalState = Annotation.Root({
    blocks: Annotation<BlockItem[]>(),
    links: Annotation<any[]>(),
    context: Annotation<string>(),
    iterations: Annotation<number>(),
});

type RelationalStateType = typeof RelationalState.State;

/**
 * AGENTE RELACIONAL (The Graph Architect)
 * Especializado en encontrar hilos conductores y dependencias entre bloques.
 * Es el motor detrás del "GraphRAG" de DOCNEX.
 */
export class RelationalAgent {
    private model: ChatGoogleGenerativeAI;

    constructor() {
        this.model = new ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash",
            apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        });
    }

    /**
     * Analiza los bloques y encuentra relaciones semánticas
     */
    public async discoverLinks(blocks: BlockItem[], documentContext: string = "") {
        const blocksSummary = blocks.map((b, i) => `[ID:${i}] Título: ${b.title}\nContenido: ${b.content.slice(0, 300)}...`).join("\n\n");

        const prompt = `Actúa como un Arquitecto de Grafos Cognitivos.
Tu tarea es analizar los siguientes bloques de un documento y encontrar RELACIONES lógicas entre ellos.

CONTEXTO DEL DOCUMENTO:
${documentContext}

BLOQUES A ANALIZAR:
${blocksSummary}

TIPOS DE RELACIÓN:
- "contradice": El bloque A tiene información opuesta al bloque B.
- "amplía": El bloque B da más detalle sobre algo mencionado en A.
- "requiere": Para entender el bloque B, es necesario haber leído el A.
- "cita": El bloque B hace mención explícita al título o contenido de A.

REGLA:
Responde SOLO con un JSON en este formato:
{
  "links": [
    { "source_index": number, "target_index": number, "type": string, "reason": string }
  ]
}

Encuentra al menos las 3 relaciones más importantes. Si no hay relaciones obvias, busca dependencias lógicas sugeridas.`;

        try {
            const response = await this.model.invoke(prompt);
            const content = response.content.toString();
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) return [];

            const result = JSON.parse(jsonMatch[0]);
            return result.links || [];
        } catch (e) {
            console.error("[RelationalAgent] Error descubriendo links:", e);
            return [];
        }
    }
}

export const relationalAgent = new RelationalAgent();
