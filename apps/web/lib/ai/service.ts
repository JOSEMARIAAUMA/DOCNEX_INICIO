
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase/client';

export type AIModelId = 'gemini-2.5-flash' | 'gemini-1.5-pro';
export type SpecializedProfile = 'legal' | 'architectural' | 'economic' | 'administrative';

export class AIService {
    private genAI: GoogleGenerativeAI;
    private modelFlash: any;
    private modelPro: any;

    constructor() {
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
        this.genAI = new GoogleGenerativeAI(apiKey);
        // Using the superior verified "gemini-2.5-flash"
        this.modelFlash = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }, { apiVersion: 'v1' });
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
        const model = this.getModel(false);
        const systemPrompt = `You are a precision JSON formatting engine.
Your goal is to return valid JSON that matches the following structure:
${schemaDescription}

Output ONLY the raw JSON string. Do not use markdown blocks.
`;

        const fullPrompt = `${systemPrompt}\n\n${context ? `CONTEXT:\n${context}\n\n` : ''}USER PROMPT: ${prompt}`;

        try {
            const result = await model.generateContent(fullPrompt);
            const text = result.response.text();
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanText) as T;
        } catch (error) {
            console.error('AI Service Error (generateObject):', error);
            throw new Error('Failed to generate structured logic.');
        }
    }

    /**
     * Chat with specialized context and profile.
     * Implements multi-agent coordination and intelligent persistence.
     */
    async chatProject(
        query: string,
        projectId: string,
        history: { role: 'user' | 'model', parts: string }[] = [],
        profile?: SpecializedProfile
    ): Promise<string> {
        // 1. Fetch project context (blocks)
        const { data: blocks } = await supabase
            .from('document_blocks')
            .select('id, title, tags')
            .eq('project_id', projectId === 'global' ? '' : projectId) // If global, don't filter blocks by project yet
            .limit(20);

        // 1b. Fetch list of available DOCUMENTS (Crucial for discovery)
        const { data: docs } = await supabase
            .from('documents')
            .select('id, title, status')
            .limit(10);

        const projectIndex = blocks?.map(b => `- [BLOQUE: ${b.title}] (ID: ${b.id}) Tags: ${b.tags?.join(', ')}`).join('\n');
        const documentsList = docs?.map(d => `- [DOCUMENTO: ${d.title}] (ID: ${d.id}) Status: ${d.status}`).join('\n');

        // 2. Fetch Global Regulatory Context (Library)
        const { data: globalResources } = await supabase
            .from('resources')
            .select('id, title, meta, theme')
            .is('project_id', null)
            .limit(15);

        // 3. Fetch Library Experiences
        const { data: experiences } = await supabase
            .from('library_experiences')
            .select('resource_id, content, experience_type')
            .in('resource_id', globalResources?.map(r => r.id) || [])
            .limit(10);

        const globalRegistryIndex = globalResources?.map(r => {
            const m = r.meta as any;
            const resExperiences = experiences?.filter(e => e.resource_id === r.id)
                .map(e => `   - [EXP: ${e.experience_type}] ${e.content}`).join('\n');
            return `- [NORMA: ${r.title}] (${m?.range || 'General'}) Area: ${m?.area || 'Universal'}\n${resExperiences || ''}`;
        }).join('\n');

        // 4. Fetch User DNA / Previous Interactions
        const { data: logs } = await supabase
            .from('ai_interaction_logs')
            .select('prompt_used, ai_response')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
            .limit(5);

        const userDna = logs?.map(l => `User: ${l.prompt_used}\nAI: ${(l.ai_response as any)?.text}`).join('\n---\n');

        const profileInstructions = profile ? this.getProfilePrompt(profile) : '';

        const systemPrompt = `You are DOCNEX AI, an omnipresent architectural and urban planning assistant.
${profileInstructions}

You coordinate a multi-agent team (Librarian, Researcher, Critic).
Your tone: Professional, proactive, creative, resolutive.
LANGUAGE: Respond ALWAYS in Spanish from Spain (Español de España). Use English only for specific technical terms where it is more appropriate in a professional context (e.g., 'feedback', 'workflow', 'clamping', 'stakeholders').

USER HISTORY (DNA):
${userDna || 'First interaction.'}

GLOBAL LIBRARY (Normative & Resources):
${globalRegistryIndex || 'No normative data.'}

PROJECT ASSETS (Knowledge Base):
${documentsList || 'No internal documents uploaded.'}

DETAILED PROJECT BLOCKS:
${projectIndex || 'No blocks found.'}

INSTRUCTIONS:
1. COLLABORATE: Act as a team. Researcher analyzes, Critic refines.
2. ANTICIPATE: Suggest next steps based on DNA.
3. SEARCH: Cross-reference Project Assets with the Global Library.
4. PROACTIVE: Flag regulatory conflicts between Project and Library immediately.
`;

        const chat = this.modelFlash.startChat({
            history: [
                { role: 'user', parts: [{ text: systemPrompt }] },
                { role: 'model', parts: [{ text: "DOCNEX Intelligence Protocol initialized. All agents standing by." }] },
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
            simplify: "Rewrite the following text to be simpler and more concise.",
            expand: "Expand the following text to include more detail.",
            tone_professional: "Rewrite the following text to have a formal, legal-professional tone.",
            grammar: "Correct all grammar and spelling errors."
        };

        const result = await this.generateObject<{ transformed: string }>(
            text,
            `{ "transformed": "string" }`,
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
        const schema = `{ "blocks": [ { "title": "string", "content": "string", "type": "standard | clause | header" } ] }`;
        try {
            const result = await this.generateObject<{ blocks: any[] }>(
                text.length > 50000 ? text.slice(0, 50000) : text,
                schema,
                `INSTRUCTIONS: ${instructions}`
            );
            return result.blocks || [];
        } catch (e) {
            return [{ title: 'Documento Completo', content: text, type: 'standard' }];
        }
    }

    /**
     * Generate Proposal Diff
     */
    async generateEditProposal(
        originalText: string,
        instruction: string
    ): Promise<{ diffHtml: string, newText: string, thoughtProcess: string }> {
        const schema = `{ "thoughtProcess": "string", "newText": "string", "diffHtml": "string" }`;
        return await this.generateObject(
            instruction,
            schema,
            `ORIGINAL TEXT:\n"${originalText}"`
        );
    }

    /**
     * Theme Detection
     */
    async analyzeLibraryResource(text: string): Promise<{
        theme: string,
        profile: SpecializedProfile,
        key_mandates: string[],
        suggested_tags: string[]
    }> {
        const schema = `{ "theme": "string", "profile": "legal | architectural | economic | administrative", "key_mandates": ["string"], "suggested_tags": ["string"] }`;
        return await this.generateObject(text.slice(0, 10000), schema, `Analyze document profile and mandates.`);
    }

    /**
     * Regulatory Sentinel
     */
    async checkRegulatoryUpdates(libraryTitles: string[], officialUpdates: any[]): Promise<{
        updates: Array<{ official_title: string; affected_resource_title: string; reason: string; risk_level: 'high' | 'medium' | 'low'; }>
    }> {
        const schema = `{ "updates": [{ "official_title": "string", "affected_resource_title": "string", "reason": "string", "risk_level": "high | medium | low" }] }`;
        const context = `Library: ${libraryTitles.join(', ')}\nUpdates: ${JSON.stringify(officialUpdates)}`;
        return await this.generateObject(context, schema, `Identify affected laws and conflicts.`);
    }

    private getProfilePrompt(profile: SpecializedProfile): string {
        const prompts: Record<SpecializedProfile, string> = {
            legal: "You are a specialized Legal Counsel in Urban Law. Focus on mandates, legality, deadlines, and hierarchical consistency.",
            architectural: "You are a Chief Architect and Urban Planner. Focus on technical parameters, spatial constraints, and design standards.",
            economic: "You are a Financial Analyst for Real Estate Projects. Focus on viability, costs, investment requirements, and market impacts.",
            administrative: "You are a Senior Administrative Officer. Focus on procedures, required documentation, and institutional workflows."
        };
        return prompts[profile];
    }
}

export const aiService = new AIService();
