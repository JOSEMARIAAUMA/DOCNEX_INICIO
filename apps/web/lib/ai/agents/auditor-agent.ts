import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AIContext } from "@/types/ai";

/**
 * State for the Auditor Agent
 */
interface AuditorState {
    documentContent: string;
    blocks: any[];
    objective: string;
    auditFindings: AuditFinding[];
}

interface AuditFinding {
    type: 'contradiction' | 'gap' | 'redundancy' | 'logic_error';
    severity: 'high' | 'medium' | 'low';
    message: string;
    affectedBlocks: string[]; // IDs of blocks
    suggestion?: string;
}

export class AuditorAgent {
    private model: ChatGoogleGenerativeAI;

    constructor() {
        this.model = new ChatGoogleGenerativeAI({
            model: "gemini-1.5-flash",
            apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
            temperature: 0.2, // Lower temperature for audit precision
        });
    }

    /**
     * Performs a full document audit for internal consistency and logic gaps
     */
    async runAudit(documentContent: string, blocks: any[], objective: string, context?: AIContext): Promise<AuditFinding[]> {
        const prompt = `Actúa como un Auditor Técnico Industrial y Jurídico Senior (Red Team).
Tu misión es encontrar ERRORES, CONTRADICCIONES e INCOHERENCIAS en el documento actual.

OBJETIVO DEL DOCUMENTO:
${objective}

CONTENIDO COMPLETO:
${documentContent.slice(0, 10000)}

BLOQUES ESTRUCTURADOS (ID y Título):
${blocks.map(b => `[${b.id}] ${b.title}`).join('\n')}

TAREAS DE AUDITORÍA:
1. Detecta contradicciones: ¿Se afirma algo en un bloque que se niega o contradice en otro?
2. Detecta lagunas de flujo: ¿Falta algún paso lógico para alcanzar el objetivo?
3. Detecta redundancias: ¿Hay bloques que repiten lo mismo sin aportar valor?
4. Detecta errores de lógica técnica: Según tu conocimiento experto de la normativa andaluza.

DEVOLUCIÓN:
Devuelve un array JSON de objetos: { "type": "...", "severity": "...", "message": "...", "affectedBlocks": ["id1", "id2"], "suggestion": "..." }
Si el documento es perfecto, devuelve un array vacío [].
IMPORTANTE: Sé extremadamente crítico.`;

        try {
            const resp = await this.model.invoke(prompt);
            const content = resp.content.toString();
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        } catch (e) {
            console.error("[AuditorAgent] Audit failed:", e);
            return [];
        }
    }
}

export const auditorAgent = new AuditorAgent();
