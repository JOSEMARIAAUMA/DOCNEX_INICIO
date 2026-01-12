import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateGraph, END } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";
import {
    BlockWithProvenance,
    ConsolidationAnalysis,
    MergedBlock,
    DuplicateGroup,
    ConflictResolution,
    ConsolidationAnalysisSchema,
    OutlineProposal,
    OutlineProposalSchema
} from "../synthesis-schemas";
import { v4 as uuidv4 } from 'uuid'; // Assuming uuid is available, or use crypto.randomUUID()
import { AIContext } from "@/types/ai";

/**
 * Consolidation Agent State Definition
 */
const ConsolidationState = Annotation.Root({
    blocks: Annotation<BlockWithProvenance[]>(),
    analysis: Annotation<ConsolidationAnalysis | null>(),
    mergedBlock: Annotation<MergedBlock | null>(),
    context: Annotation<AIContext | undefined>(),
    error: Annotation<string | undefined>(),
});

type ConsolidationStateType = typeof ConsolidationState.State;

/**
 * THE SYNTHESIZER AGENT
 * Specialized in multi-document consolidation, deduplication, and conflict resolution
 */
export class ConsolidationAgent {
    private model: ChatGoogleGenerativeAI;

    constructor() {
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!apiKey) {
            console.warn("[ConsolidationAgent] Warning: GOOGLE_GENERATIVE_AI_API_KEY not defined");
        }

        this.model = new ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash",
            maxOutputTokens: 8192,
            apiKey: apiKey,
        });
    }

    /**
     * Node 1: Analyze blocks for duplicates, conflicts, and quality
     */
    private async analyzeBlocks(state: ConsolidationStateType) {
        const prompt = `You are The Synthesizer, a master editor specializing in research consolidation.

TASK: Analyze ${state.blocks.length} blocks from different research documents.

OBJECTIVES:
1. Identify duplicate/redundant content (similarity > 0.8)
2. Detect contradictions or conflicts
3. Rank content quality (empirical > anecdotal, recent > outdated)
4. Propose optimal merge strategy

QUALITY HIERARCHY:
- Empirical data with citations > Opinions
- Recent sources > Outdated (if dates available)
- Detailed explanations > Vague statements
- Primary sources > Secondary

INPUT BLOCKS:
${state.blocks.map((b, i) => `
[Block ${i}]
FROM: ${b.source_doc}
TITLE: ${b.title}
TAGS: ${b.tags?.join(', ') || 'none'}
CONTENT: ${b.content.slice(0, 800)}...
`).join('\n---\n')}

OUTPUT FORMAT (JSON ONLY):
{
  "duplicates": [
    {
      "block_ids": [0, 3],
      "similarity": 0.92,
      "action": "keep_best",
      "rationale": "Block 0 has more detail and citations"
    }
  ],
  "conflicts": [
    {
      "block_ids": [1, 4],
      "issue": "Contradictory dates: Block 1 says 2023, Block 4 says 2024",
      "resolution": "requires_human_review",
      "suggested_fix": "Use most recent source (Block 4)"
    }
  ],
  "quality_ranking": [0, 3, 1, 4, 2],
  "merge_proposal": {
    "strategy": "hierarchical_merge",
    "rationale": "Combine highest quality blocks, preserve unique insights, flag conflicts",
    "merged_content": "The synthesized content with inline citations [Doc_A], [Doc_B]...",
    "citations": ["${state.blocks[0]?.source_doc}", "..."],
    "confidence": 0.85
  }
}

CRITICAL: Respond ONLY with valid JSON. No markdown, no explanations outside JSON.`;

        try {
            const response = await this.model.invoke(prompt);
            const content = response.content.toString();

            // Extract JSON
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("No JSON found in response");

            const rawAnalysis = JSON.parse(jsonMatch[0]);

            // Validate with Zod
            const analysis = ConsolidationAnalysisSchema.parse(rawAnalysis);

            console.log(`[Synthesizer] Analysis complete: ${analysis.duplicates.length} duplicates, ${analysis.conflicts.length} conflicts`);
            return { analysis, error: undefined };
        } catch (e: any) {
            console.error("[Synthesizer] Analysis error:", e.message);
            return { error: e.message };
        }
    }

    /**
     * Node 2: Generate merged block from analysis
     */
    private async generateMerge(state: ConsolidationStateType) {
        if (!state.analysis) {
            return { error: "No analysis available for merge" };
        }

        const { merge_proposal: proposal } = state.analysis;

        // Create merged block structure
        const mergedBlock: MergedBlock = {
            title: this.generateMergedTitle(state.blocks),
            content: proposal.merged_content,
            citations: proposal.citations,
            source_block_ids: state.blocks.map(b => b.id),
            contribution_percentages: this.calculateContributions(state.blocks, proposal),
        };

        console.log(`[Synthesizer] Merge generated: "${mergedBlock.title}"`);
        return { mergedBlock, error: undefined };
    }

    /**
     * Helper: Generate appropriate title for merged block
     */
    private generateMergedTitle(blocks: BlockWithProvenance[]): string {
        // If titles are very similar, use the first one
        const titles = blocks.map(b => b.title);
        const uniqueTitles = [...new Set(titles)];

        if (uniqueTitles.length === 1) return uniqueTitles[0];

        // If multiple unique titles, create a composite
        if (uniqueTitles.length <= 3) {
            return uniqueTitles.join(' / ');
        }

        // For many sources, use generic title
        return `Síntesis de ${blocks.length} fuentes`;
    }

    /**
     * Helper: Calculate contribution percentages for each source
     */
    private calculateContributions(
        blocks: BlockWithProvenance[],
        proposal: any
    ): number[] {
        // Simple heuristic: based on quality ranking
        const ranking = proposal.quality_ranking as number[];
        const weights = ranking.map((rank, idx) => blocks.length - rank);
        const total = weights.reduce((sum, w) => sum + w, 0);

        return weights.map(w => Math.round((w / total) * 100));
    }

    /**
     * Build LangGraph workflow
     */
    public createWorkflow() {
        const workflow = new StateGraph(ConsolidationState)
            .addNode("analyze", this.analyzeBlocks.bind(this))
            .addNode("merge", this.generateMerge.bind(this))
            .addEdge("__start__", "analyze")
            .addEdge("analyze", "merge")
            .addEdge("merge", END);

        return workflow.compile();
    }

    /**
     * PUBLIC API: Analyze blocks for consolidation
     */
    public async analyzeBlocksForConsolidation(
        blocks: BlockWithProvenance[],
        context?: AIContext
    ): Promise<ConsolidationAnalysis | null> {
        const app = this.createWorkflow();
        const initialState = {
            blocks,
            context,
            analysis: null,
            mergedBlock: null,
        };

        const finalState = await app.invoke(initialState);
        return finalState.analysis || null;
    }

    /**
     * PUBLIC API: Merge blocks into one
     */
    public async mergeBlocks(
        blocks: BlockWithProvenance[],
        context?: AIContext
    ): Promise<MergedBlock | null> {
        const app = this.createWorkflow();
        const initialState = {
            blocks,
            context,
            analysis: null,
            mergedBlock: null,
        };

        const finalState = await app.invoke(initialState);
        return finalState.mergedBlock || null;
    }

    /**
     * PUBLIC API: Detect duplicates only (lightweight operation)
     */
    public async detectDuplicates(blocks: BlockWithProvenance[]): Promise<DuplicateGroup[]> {
        const result = await this.analyzeBlocksForConsolidation(blocks);
        return result?.duplicates || [];
    }

    /**
     * PUBLIC API: Resolve conflicts with AI assistance
     */
    public async resolveConflicts(blocks: BlockWithProvenance[]): Promise<ConflictResolution[]> {
        const analysis = await this.analyzeBlocksForConsolidation(blocks);
        if (!analysis) return [];

        return analysis.conflicts.map(conflict => ({
            conflict_id: `${conflict.block_ids.join('-')}`,
            resolution_type: conflict.resolution === 'auto_resolve' ? 'ai_suggestion' : 'manual',
            resolved_content: conflict.suggested_fix || '',
            rationale: conflict.issue,
        }));
    }

    /**
     * PUBLIC API: Propose a document outline based on source blocks
     */
    public async proposeOutline(
        blocks: BlockWithProvenance[],
        context?: AIContext
    ): Promise<OutlineProposal | null> {
        const prompt = `You are an expert editor and research architect.
    
TASK: Create a structured outline for a consolidated document based on ${blocks.length} source blocks.

INPUT BLOCKS:
${blocks.map((b, i) => `
[Block ${i}] (ID: ${b.id})
TITLE: ${b.title}
CONTENT: ${b.content.slice(0, 500)}...
`).join('\n---\n')}

USER CONTEXT:
${context ? `Role: ${context.role}\nObjective: ${context.objective}\nTone: ${context.tone}` : 'Objective: comprehensive synthesis'}

REQUIREMENTS:
1. Create a logical flow of chapters/sections.
2. Group related blocks together.
3. Provide a clear title and description for each section.
4. Assign relevant source block IDs to each section.

OUTPUT FORMAT (JSON ONLY):
{
  "title": "Proposed Document Title",
  "description": "Brief overview of the document structure",
  "sections": [
    {
      "id": "generate-uuid-here",
      "title": "Section Title",
      "description": "What this section covers",
      "suggested_block_ids": ["block-id-1", "block-id-2"],
      "order": 1
    }
  ]
}
`;

        try {
            const response = await this.model.invoke(prompt);
            const content = response.content.toString();

            // Extract JSON
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("No JSON found in response");

            const rawProposal = JSON.parse(jsonMatch[0]);

            // Ensure UUIDs if model didn't generate valid ones (it might hallucinate or usage placeholders)
            // We'll map over to ensure validity
            if (rawProposal.sections) {
                rawProposal.sections = rawProposal.sections.map((s: any, idx: number) => ({
                    ...s,
                    id: s.id && s.id.length > 10 ? s.id : crypto.randomUUID(),
                    order: idx
                }));
            }

            // Validate
            const proposal = OutlineProposalSchema.parse(rawProposal);
            console.log(`[ConsolidationAgent] Outline proposed: ${proposal.title}`);
            return proposal;

        } catch (e: any) {
            console.error("[ConsolidationAgent] Outline proposal error:", e.message);
            return null;
        }
    }
}

export const consolidationAgent = new ConsolidationAgent();
