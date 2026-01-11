import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateGraph, END } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";
import { BlockItem, BlockItemSchema } from "../schemas";
import { AIContext } from "@/types/ai";

/**
 * Librarian Agent State Definition
 */
const LibrarianState = Annotation.Root({
    text: Annotation<string>(),
    proposedBlocks: Annotation<BlockItem[]>(),
    criteria: Annotation<string>(),
    context: Annotation<AIContext | undefined>(),
    iterations: Annotation<number>(),
    error: Annotation<string | undefined>(),
});

type LibrarianStateType = typeof LibrarianState.State;

/**
 * AGENTE BIBLIOTECARIO (The Librarian)
 * Especializado en la ingesta, fragmentación y organización jerárquica.
 * Aprende de los criterios de división aceptados por el usuario.
 */
export class LibrarianAgent {
    private model: ChatGoogleGenerativeAI;

    constructor() {
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!apiKey) {
            console.warn("[LibrarianAgent] Warning: GOOGLE_GENERATIVE_AI_API_KEY is not defined in process.env");
        }

        this.model = new ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash",
            maxOutputTokens: 8192,
            apiKey: apiKey,
        });
    }

    /**
     * Nodo 1: Analizar Estructura y Sugerir División
     * Especializado en normativa oficial con estructura TÍTULO/CAPÍTULO/ARTÍCULO
     */
    private async analyzeAndSplit(state: LibrarianStateType) {
        const prompt = `Actúa como un Bibliotecario y Arquitecto de Información experto especializado en NORMATIVA OFICIAL.
Tu tarea es dividir el siguiente texto en bloques lógicos con una JERARQUÍA DE 3 NIVELES.

## DETECCIÓN DE NORMATIVA OFICIAL
Si el documento es una norma jurídica (Decreto, Ley, Orden, Reglamento, Real Decreto):

**NIVEL 0 (Raíz) - TÍTULOS:**
- Identificar con: "TITULO I", "TITULO II", "TITULO PRELIMINAR"...
- hierarchy_level: 0

**NIVEL 1 - CAPÍTULOS:**
- Identificar con: "CAPITULO 1", "CAPITULO I", "CAPITULO PRIMERO"...
- hierarchy_level: 1
- Van DENTRO de un TÍTULO (como children)

**NIVEL 2 - ARTÍCULOS:**
- Identificar con: "ARTICULO 1", "ARTICULO 14", "Art. 3"...
- hierarchy_level: 2
- Van DENTRO de un CAPÍTULO (como children)

## REGLA CRÍTICA: TÍTULOS CORTOS
Los títulos de bloques deben ser CORTOS (máximo 20 caracteres) usando SOLO el identificador.
- ✅ CORRECTO: "TITULO I", "CAPITULO 3", "ARTICULO 14"
- ❌ INCORRECTO: "TITULO I - DISPOSICIONES GENERALES Y ÁMBITO DE APLICACIÓN"

El contenido completo del encabezado (incluyendo la descripción larga) va en el campo "content".

## CRITERIOS DE DIVISIÓN APRENDIDOS:
${state.criteria || "No hay criterios previos. Usa tu mejor juicio profesional para detectar la estructura legal."}

## TEXTO A PROCESAR:
${state.text.slice(0, 30000)}

## FORMATO DE RESPUESTA (JSON):
{
  "blocks": [
    {
      "title": "TITULO I",
      "content": "TITULO I. DISPOSICIONES GENERALES\\n...",
      "target": "active_version",
      "hierarchy_level": 0,
      "children": [
        {
          "title": "CAPITULO 1",
          "content": "CAPITULO 1. Del ámbito de aplicación\\n...",
          "target": "active_version",
          "hierarchy_level": 1,
          "children": [
            {
              "title": "ARTICULO 1",
              "content": "Artículo 1. Objeto.\\nLa presente ley...",
              "target": "active_version",
              "hierarchy_level": 2,
              "children": []
            }
          ]
        }
      ]
    }
  ]
}

Responde SOLO con el JSON válido.`;

        try {
            const response = await this.model.invoke(prompt);
            const content = response.content.toString();
            // JSON Extraction Clean
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("No se pudo extraer JSON de la respuesta del bibliotecario");

            const result = JSON.parse(jsonMatch[0]);
            console.log(`[Bibliotecario] Propuesta generada (${result.blocks?.length} bloques de nivel 0)`);
            return { proposedBlocks: result.blocks, iterations: (state.iterations || 0) + 1 };
        } catch (e: any) {
            console.error("[Bibliotecario] Error parseando JSON:", e.message);
            return { error: e.message, iterations: (state.iterations || 0) + 1 };
        }
    }

    /**
     * Nodo 2: Crítica Interna (Autocorrección)
     * En el futuro, esto podría ser un agente separado (The Critic)
     */
    private async critiqueProposal(state: LibrarianStateType) {
        console.log(`[Crítico] Evaluando propuesta (Iteración ${state.iterations})...`);
        if (!state.proposedBlocks || state.proposedBlocks.length === 0) return { error: "No hay bloques para criticar" };

        const prompt = `Actúa como un Redactor Jefe revisando la propuesta de división de un Bibliotecario.
¿La división es coherente? ¿Se han perdido fragmentos de texto? ¿La jerarquía tiene sentido?

PROPUESTA:
${JSON.stringify(state.proposedBlocks.map(b => b.title), null, 2)}

Si la propuesta tiene sentido, responde "APROBADO".
Si crees que hay errores (ej: bloques demasiado grandes o jerarquía rota), describe brevemente por qué.`;

        const response = await this.model.invoke(prompt);
        const feedback = response.content.toString();
        console.log(`[Crítico] Feedback: ${feedback.slice(0, 100)}...`);

        if (feedback.includes("APROBADO") || (state.iterations || 0) > 2) {
            console.log("[Crítico] ✅ Propuesta aceptada o límite alcanzado.");
            return { error: undefined }; // Success path
        }

        console.log("[Crítico] ❌ Propuesta rechazada. Reintentando...");
        // Si no está aprobado, alimentamos el error para que Nodo 1 reintente o el flujo termine
        return { criteria: `${state.criteria}\n\nFEEDBACK CRÍTICO ANTERIOR: ${feedback}`, proposedBlocks: [] };
    }

    /**
     * Construye el Grafo de Decisión del Agente
     */
    public createWorkflow() {
        const workflow = new StateGraph(LibrarianState)
            .addNode("analyze", this.analyzeAndSplit.bind(this))
            .addNode("critique", this.critiqueProposal.bind(this))
            .addEdge("__start__", "analyze")
            .addEdge("analyze", "critique");

        // Condición de salida o bucle
        workflow.addConditionalEdges("critique", (state) => {
            if (!state.proposedBlocks || state.proposedBlocks.length === 0) return "analyze"; // Reintentar con feedback
            return END;
        });

        return workflow.compile();
    }

    /**
     * Ejecuta el proceso de organización inteligente
     */
    public async structureDocument(text: string, userCriteria?: string, context?: AIContext) {
        const app = this.createWorkflow();
        const initialState = {
            text,
            criteria: userCriteria || "",
            context,
            iterations: 0,
            proposedBlocks: []
        };

        const finalState = await app.invoke(initialState);
        return finalState.proposedBlocks;
    }
    /**
     * Motor de Aprendizaje (Learning Engine)
     * Analiza el "antes y después" de una importación para extraer nuevos criterios.
     */
    public async learnFromFeedback(originalProposed: BlockItem[], finalAccepted: BlockItem[]) {
        const prompt = `Actúa como un Analista de Procesos Cognitivos.
He propuesto una estructura documental a un usuario, pero el usuario la ha modificado antes de aceptarla.

PROPUESTA ORIGINAL (Títulos):
${originalProposed.map(b => b.title).join(", ")}

RESULTADO FINAL ACEPTADO POR USUARIO (Títulos):
${finalAccepted.map(b => b.title).join(", ")}

TAREA:
Identifica la REGLA DE SEGMENTACIÓN que el usuario está aplicando. 
Ejemplos de reglas: "Prefiere bloques más cortos", "No quiere que los anexos tengan sub-pasajes", "Usa numeración romana para secciones principales".

Devuelve una descripción CORTA y TÉCNICA de la regla aprendida para usarla en el futuro.`;

        try {
            const response = await this.model.invoke(prompt);
            return response.content.toString().trim();
        } catch (e) {
            console.error("[Librarian] Error en el proceso de aprendizaje:", e);
            return null;
        }
    }
}

export const librarianAgent = new LibrarianAgent();
