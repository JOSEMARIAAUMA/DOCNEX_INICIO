import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase/client';

export type AIModelId = 'gemini-2.5-flash' | 'gemini-1.5-pro';

export class AIService {
    private genAI: GoogleGenerativeAI;
    private modelFlash: any;
    private modelPro: any;

    constructor() {
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
        this.genAI = new GoogleGenerativeAI(apiKey);
        // Using "flash" for speed/instruct, "pro" for complex reasoning if needed
        this.modelFlash = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' }); // Adjust if 2.5 not avail, assuming 2.0 or 1.5 flash
        this.modelPro = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    }

    private getModel(preferPro: boolean = false) {
        return preferPro ? this.modelPro : this.modelFlash;
    }

    /**
     * Generates a structured JSON object based on a schema description.
     */
    async generateObject<T>(
        prompt: string,
        schemaDescription: string,
        context?: string
    ): Promise<T> {
        const model = this.getModel(false); // Flash is good for JSON
        const systemPrompt = `You are a precision JSON formatting engine.
Your goal is to return valid JSON that matches the following structure:
${schemaDescription}

Output ONLY the raw JSON string. Do not use markdown blocks.
`;

        const fullPrompt = `${systemPrompt}\n\n${context ? `CONTEXT:\n${context}\n\n` : ''}USER PROMPT: ${prompt}`;

        try {
            const result = await model.generateContent(fullPrompt);
            const text = result.response.text();

            // Clean markdown if present
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const json = JSON.parse(cleanText);
            return json as T;
        } catch (error) {
            console.error('AI Service Error (generateObject):', error);
            throw new Error('Failed to generate structured logic.');
        }
    }

    /**
     * Chat with project-level context.
     * Fetches relevant blocks (naive retrieval for now, vector search later)
     */
    async chatProject(
        query: string,
        projectId: string,
        history: { role: 'user' | 'model', parts: string }[] = []
    ): Promise<string> {
        // 1. Fetch rough context (Titles of all blocks) to know where to look
        // For MVP, we pass the "Index" of the project
        const { data: blocks } = await supabase
            .from('document_blocks')
            .select('id, title, tags')
            .eq('project_id', projectId)
            .limit(100);

        const projectIndex = blocks?.map(b => `- [${b.title}] (ID: ${b.id}) Tags: ${b.tags?.join(', ')}`).join('\n');

        const systemPrompt = `You are DOCNEX AI. You have access to the project index.
If the user asks specific questions about content, tell them WHICH block IDs to read, or answer based on the index.
Project Index:
${projectIndex}
`;

        const chat = this.modelFlash.startChat({
            history: [
                { role: 'user', parts: [{ text: systemPrompt }] },
                { role: 'model', parts: [{ text: "Understood. I am ready to help with the project." }] },
                ...history.map(h => ({ role: h.role, parts: [{ text: h.parts }] }))
            ]
        });

        const result = await chat.sendMessage(query);
        return result.response.text();
    }

    /**
     * Active Editor: Text Transformation
     */
    async transformText(
        text: string,
        instruction: 'simplify' | 'expand' | 'tone_professional' | 'grammar',
        extraContext?: string
    ): Promise<string> {
        const prompts = {
            simplify: "Rewrite the following text to be simpler and more concise, aiming for a 5th-grade reading level but maintaining professional accuracy.",
            expand: "Expand the following text to include more detail and explanation, making it more robust.",
            tone_professional: "Rewrite the following text to have a formal, legal-professional tone.",
            grammar: "Correct all grammar and spelling errors in the following text, keeping style largely usage."
        };

        const result = await this.generateObject<{ transformed: string }>(
            text,
            `{ "transformed": "The rewritten text string" }`,
            `${prompts[instruction]} ${extraContext || ''}`
        );

        return result.transformed;
    }

    /**
     * Intelligent Splitter
     */
    async splitDocument(
        text: string,
        instructions: string = 'Divide este documento en bloques lógicos.'
    ): Promise<any[]> {
        const schema = `{
            "blocks": [
                {
                    "title": "Descriptive title of the block",
                    "content": "The full content of the block (preserve formatting)",
                    "type": "standard | clause | header"
                }
            ]
        }`;

        try {
            const result = await this.generateObject<{ blocks: any[] }>(
                text.length > 50000 ? text.slice(0, 50000) : text, // Truncate safe limit
                schema,
                `INSTRUCTIONS: ${instructions}\n\nSplit the document into logical blocks. respecting hierarchy.`
            );
            return result.blocks || [];
        } catch (e) {
            console.error('Split failed:', e);
            // Fallback: Return single block
            return [{ title: 'Documento Completo', content: text, type: 'standard' }];
        }
    }

    /**
     * Executable Note: Generate Diff
     */
    async generateEditProposal(
        originalText: string,
        instruction: string
    ): Promise<{ diffHtml: string, newText: string, thoughtProcess: string }> {
        const schema = `{
  "thoughtProcess": "Short explanation of why changes were made",
  "newText": "The complete new text",
  "diffHtml": "HTML string highlighting changes (use <span class='bg-red-200 line-through'> for deletions, <span class='bg-green-200'> for additions)" 
}`;
        // Note: Real diffs are hard for LLMs to output as HTML perfectly. 
        // Better strategy: Get newText, then compute diff in JS. 
        // But for "Thinking", let's ask for the text.

        return await this.generateObject(
            instruction,
            schema,
            `ORIGINAL TEXT:\n"${originalText}"\n\nTask: Apply the user instruction to the text.`
        );
    }
}

export const aiService = new AIService();
