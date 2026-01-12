import { z } from 'zod';

// ==================== SCHEMAS ====================

export const BlockWithProvenanceSchema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    content: z.string(),
    source_doc: z.string(),
    source_doc_id: z.string().uuid(),
    tags: z.array(z.string()).optional(),
    order_index: z.number().optional(),
});

export type BlockWithProvenance = z.infer<typeof BlockWithProvenanceSchema>;

export const DuplicateGroupSchema = z.object({
    block_ids: z.array(z.number()),
    similarity: z.number().min(0).max(1),
    action: z.enum(['keep_first', 'keep_best', 'merge_all']),
    rationale: z.string().optional(),
});

export type DuplicateGroup = z.infer<typeof DuplicateGroupSchema>;

export const ConflictSchema = z.object({
    block_ids: z.array(z.number()),
    issue: z.string(),
    resolution: z.enum(['auto_resolve', 'requires_human_review']),
    suggested_fix: z.string().optional(),
});

export type Conflict = z.infer<typeof ConflictSchema>;

export const MergeProposalSchema = z.object({
    strategy: z.string(),
    rationale: z.string(),
    merged_content: z.string(),
    citations: z.array(z.string()),
    confidence: z.number().min(0).max(1).optional(),
});

export type MergeProposal = z.infer<typeof MergeProposalSchema>;

export const ConsolidationAnalysisSchema = z.object({
    duplicates: z.array(DuplicateGroupSchema),
    conflicts: z.array(ConflictSchema),
    quality_ranking: z.array(z.number()),
    merge_proposal: MergeProposalSchema,
});

export type ConsolidationAnalysis = z.infer<typeof ConsolidationAnalysisSchema>;

export const MergedBlockSchema = z.object({
    title: z.string(),
    content: z.string(),
    citations: z.array(z.string()),
    source_block_ids: z.array(z.string().uuid()),
    contribution_percentages: z.array(z.number()).optional(),
});

export type MergedBlock = z.infer<typeof MergedBlockSchema>;

export const ConflictResolutionSchema = z.object({
    conflict_id: z.string(),
    resolution_type: z.enum(['auto', 'manual', 'ai_suggestion']),
    resolved_content: z.string(),
    rationale: z.string(),
});

export type ConflictResolution = z.infer<typeof ConflictResolutionSchema>;

// ==================== OUTLINE SCHEMAS ====================

export const OutlineSectionSchema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string(),
    suggested_block_ids: z.array(z.string()),
    order: z.number(),
});

export type OutlineSection = z.infer<typeof OutlineSectionSchema>;

export const OutlineProposalSchema = z.object({
    title: z.string(),
    description: z.string(),
    sections: z.array(OutlineSectionSchema),
});

export type OutlineProposal = z.infer<typeof OutlineProposalSchema>;

// ==================== DATABASE TYPES ====================

export interface ResearchSession {
    id: string;
    user_id: string;
    project_id: string;
    name: string;
    source_document_ids: string[];
    target_document_id: string | null;
    status: 'active' | 'completed' | 'abandoned';
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface SynthesisOperation {
    id: string;
    session_id: string;
    operation_type: 'merge' | 'consolidate' | 'dedup' | 'conflict_resolution';
    input_block_ids: string[];
    output_block_id: string | null;
    ai_reasoning: string;
    user_approved: boolean | null;
    metadata: Record<string, any>;
    created_at: string;
}

export interface BlockProvenance {
    id: string;
    block_id: string;
    source_document_id: string;
    source_block_id: string | null;
    contribution_type: 'original' | 'merged' | 'synthesized' | 'referenced';
    contribution_percentage: number;
    confidence_score: number;
    metadata: Record<string, any>;
    created_at: string;
}
