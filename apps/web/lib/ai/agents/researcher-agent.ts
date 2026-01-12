import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateGraph, END, Annotation } from "@langchain/langgraph";
import { AIContext } from "@/types/ai";
import { supabase } from "../../supabase/client";

/**
 * Researcher Agent State
 */
const ResearcherState = Annotation.Root({
    documentContent: Annotation<string>(),
    currentProjectID: Annotation<string>(),
    insights: Annotation<any[]>(), // Compliance issues, analogies, etc.
    criteria: Annotation<string>(),
    context: Annotation<AIContext | undefined>(),
    step: Annotation<string>(),
});

type ResearcherStateType = typeof ResearcherState.State;

/**
 * AGENTE INVESTIGADOR (The Researcher)
 * Strategic partner that monitors compliance and finds cross-project analogies.
 */
export class ResearcherAgent {
    private model: ChatGoogleGenerativeAI;

    constructor() {
        this.model = new ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash",
            maxOutputTokens: 8192,
            apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        });
    }

    /**
     * Node: Multi-Project Analogy Search
     */
    private async findAnalogies(state: ResearcherStateType) {
        console.log("[Investigador] Buscando analogías en otros proyectos...");

        // 1. Fetch blocks from OTHER projects (simplified semantic search simulation)
        const { data: otherBlocks } = await supabase
            .from('document_blocks')
            .select(`
                title,
                content,
                document:documents(title, project:projects(title))
            `)
            .neq('document_id', state.currentProjectID) // Not this project
            .limit(10);

        const contextText = otherBlocks?.map(b =>
            `PROYECTO: ${b.document.project.title} | DOC: ${b.document.title}\nBLOQUE: ${b.title}\nCONTENIDO: ${b.content.substring(0, 300)}`
        ).join("\n\n---\n\n");

        const prompt = `Actúa como un Investigador Urbanístico Senior.
Analiza el "CONTENIDO ACTUAL" y busca patrones o soluciones similares en el "CONOCIMIENTO HISTÓRICO".

CONTENIDO ACTUAL:
${state.documentContent.slice(0, 5000)}

CONOCIMIENTO HISTÓRICO DE OTROS PROYECTOS:
${contextText}

TAREA:
Identifica si hay soluciones redactadas anteriormente que puedan servir de inspiración o analogía.
Si encuentras algo, devuelve un array JSON de objetos: { "type": "analogy", "project": "Nombre", "suggestion": "Breve explicación" }
Si no hay nada relevante, devuelve un array vacío [].`;

        try {
            const resp = await this.model.invoke(prompt);
            const content = resp.content.toString();
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            const insights = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
            return { insights: [...state.insights, ...insights] };
        } catch (e) {
            console.error("[Investigador] Error en búsqueda de analogías:", e);
            return { insights: state.insights };
        }
    }

    /**
     * Node: Regulatory Compliance Monitor
     */
    private async monitorCompliance(state: ResearcherStateType) {
        console.log("[Investigador] Verificando cumplimiento normativo con la Biblioteca...");

        // 1. Fetch relevant library resources (e.g., LISTA, GICA)
        // For simulation, we'll fetch the first few blocks of known processed regulations
        const { data: regBlocks } = await supabase
            .from('document_blocks')
            .select('title, content')
            .ilike('title', '%ARTICULO%')
            .limit(10);

        const libraryContext = regBlocks?.map(b => `${b.title}: ${b.content.substring(0, 200)}`).join("\n");

        const prompt = `Actúa como un Consultor Legal Urbanístico experto en la normativa de Andalucía.
Cruza el "TEXTO DEL PROYECTO" con la "REFERENCIA NORMATIVA" de la Biblioteca.

TEXTO DEL PROYECTO:
${state.documentContent.slice(0, 5000)}

REFERENCIA NORMATIVA:
${libraryContext}

TAREA:
Identifica posibles incumplimientos o necesidades de cita.
Devuelve un array JSON de objetos: { "type": "compliance", "severity": "high|medium|low", "message": "Descripción del problema o sugerencia", "article": "Referencia al artículo" }
Si todo parece correcto, devuelve un array vacío [].`;

        try {
            const resp = await this.model.invoke(prompt);
            const content = resp.content.toString();
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            const insights = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
            return { insights: [...state.insights, ...insights] };
        } catch (e) {
            console.error("[Investigador] Error en verif. normativa:", e);
            return { insights: state.insights };
        }
    }

    public createWorkflow() {
        return new StateGraph(ResearcherState)
            .addNode("analogies", this.findAnalogies.bind(this))
            .addNode("compliance", this.monitorCompliance.bind(this))
            .addEdge("__start__", "analogies")
            .addEdge("analogies", "compliance")
            .addEdge("compliance", END)
            .compile();
    }

    public async runAnalysis(content: string, projectID: string, context?: AIContext) {
        const app = this.createWorkflow();
        const finalState = await app.invoke({
            documentContent: content,
            currentProjectID: projectID,
            insights: [],
            context,
            step: "start"
        });
        return finalState.insights;
    }
}

export const researcherAgent = new ResearcherAgent();
