'use server';

import { supabase } from '@/lib/supabase/client';
import { consolidationAgent } from '@/lib/ai/agents/consolidation-agent';
import {
    BlockWithProvenance,
    ConsolidationAnalysis,
    ResearchSession,
    SynthesisOperation,
    BlockProvenance
} from '@/lib/ai/synthesis-schemas';

/**
 * Create a new research synthesis session
 */
export async function createResearchSession(
    name: string,
    projectId: string,
    sourceDocumentIds: string[]
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        const { data, error } = await supabase
            .from('research_sessions')
            .insert({
                user_id: user.id,
                project_id: projectId,
                name,
                source_document_ids: sourceDocumentIds,
                status: 'active',
            })
            .select('id')
            .single();

        if (error) throw error;

        return { success: true, sessionId: data.id };
    } catch (error: any) {
        console.error('[createResearchSession]', error);
        return { success: false, error: error.message };
    }
}

/**
 * Analyze blocks for synthesis opportunities
 */
export async function analyzeBlocksForSynthesis(
    blockIds: string[]
): Promise<{ success: boolean; analysis?: ConsolidationAnalysis; error?: string }> {
    try {
        // Fetch blocks with their source document info
        const { data: blocks, error } = await supabase
            .from('document_blocks')
            .select(`
                id,
                title,
                content,
                tags,
                order_index,
                document:document_id (
                    id,
                    title
                )
            `)
            .in('id', blockIds)
            .eq('is_deleted', false);

        if (error) throw error;
        if (!blocks || blocks.length === 0) {
            return { success: false, error: 'No blocks found' };
        }

        // Transform to BlockWithProvenance format
        const blocksWithProvenance: BlockWithProvenance[] = blocks.map(b => ({
            id: b.id,
            title: b.title,
            content: b.content,
            source_doc: (b.document as any)?.title || 'Unknown',
            source_doc_id: (b.document as any)?.id || '',
            tags: b.tags || [],
            order_index: b.order_index,
        }));

        // Run AI analysis
        const analysis = await consolidationAgent.analyzeBlocksForConsolidation(blocksWithProvenance);

        if (!analysis) {
            return { success: false, error: 'Analysis failed' };
        }

        return { success: true, analysis };
    } catch (error: any) {
        console.error('[analyzeBlocksForSynthesis]', error);
        return { success: false, error: error.message };
    }
}

/**
 * Merge blocks with AI assistance
 */
export async function mergeBlocksWithAI(
    blockIds: string[],
    targetDocumentId: string,
    sessionId?: string
): Promise<{ success: boolean; mergedBlockId?: string; operation?: SynthesisOperation; error?: string }> {
    try {
        // 1. Fetch blocks
        const { data: blocks, error: fetchError } = await supabase
            .from('document_blocks')
            .select(`
                id,
                title,
                content,
                tags,
                order_index,
                document:document_id (
                    id,
                    title
                )
            `)
            .in('id', blockIds)
            .eq('is_deleted', false);

        if (fetchError) throw fetchError;
        if (!blocks || blocks.length === 0) {
            return { success: false, error: 'No blocks found' };
        }

        const blocksWithProvenance: BlockWithProvenance[] = blocks.map(b => ({
            id: b.id,
            title: b.title,
            content: b.content,
            source_doc: (b.document as any)?.title || 'Unknown',
            source_doc_id: (b.document as any)?.id || '',
            tags: b.tags || [],
            order_index: b.order_index,
        }));

        // 2. Generate merged block with AI
        const mergedBlock = await consolidationAgent.mergeBlocks(blocksWithProvenance);

        if (!mergedBlock) {
            return { success: false, error: 'Merge generation failed' };
        }

        // 3. Get max order index for target document
        const { data: maxOrderBlock } = await supabase
            .from('document_blocks')
            .select('order_index')
            .eq('document_id', targetDocumentId)
            .order('order_index', { ascending: false })
            .limit(1)
            .single();

        const newOrderIndex = (maxOrderBlock?.order_index || 0) + 1;

        // 4. Create new merged block in database
        const { data: createdBlock, error: createError } = await supabase
            .from('document_blocks')
            .insert({
                document_id: targetDocumentId,
                title: mergedBlock.title,
                content: mergedBlock.content,
                order_index: newOrderIndex,
                block_type: 'synthesis',
                is_deleted: false,
            })
            .select('id')
            .single();

        if (createError) throw createError;

        // 5. Create provenance records
        const provenanceRecords = mergedBlock.source_block_ids.map((sourceBlockId, idx) => ({
            block_id: createdBlock.id,
            source_document_id: blocksWithProvenance[idx]?.source_doc_id,
            source_block_id: sourceBlockId,
            contribution_type: 'merged' as const,
            contribution_percentage: mergedBlock.contribution_percentages?.[idx] || 0,
            confidence_score: 0.85,
        }));

        await supabase.from('block_provenance').insert(provenanceRecords);

        // 6. Log synthesis operation
        if (sessionId) {
            const { data: operation } = await supabase
                .from('synthesis_operations')
                .insert({
                    session_id: sessionId,
                    operation_type: 'merge',
                    input_block_ids: blockIds,
                    output_block_id: createdBlock.id,
                    ai_reasoning: `Merged ${blockIds.length} blocks using ${mergedBlock.citations.length} sources`,
                    user_approved: null,
                })
                .select()
                .single();

            return {
                success: true,
                mergedBlockId: createdBlock.id,
                operation: operation as SynthesisOperation
            };
        }

        return { success: true, mergedBlockId: createdBlock.id };
    } catch (error: any) {
        console.error('[mergeBlocksWithAI]', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get provenance for a block (source attribution)
 */
export async function getBlockProvenance(
    blockId: string
): Promise<{ success: boolean; provenance?: BlockProvenance[]; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('block_provenance')
            .select(`
                *,
                source_document:source_document_id (
                    id,
                    title
                ),
                source_block:source_block_id (
                    id,
                    title
                )
            `)
            .eq('block_id', blockId)
            .order('contribution_percentage', { ascending: false });

        if (error) throw error;

        return { success: true, provenance: data as any };
    } catch (error: any) {
        console.error('[getBlockProvenance]', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update research session
 */
export async function updateResearchSession(
    sessionId: string,
    updates: {
        status?: 'active' | 'completed' | 'abandoned';
        target_document_id?: string;
        metadata?: any
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('research_sessions')
            .update(updates)
            .eq('id', sessionId);

        if (error) throw error;

        return { success: true };
    } catch (error: any) {
        console.error('[updateResearchSession]', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get all research sessions for current user
 */
export async function listResearchSessions(
    projectId?: string
): Promise<{ success: boolean; sessions?: ResearchSession[]; error?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Not authenticated' };

        let query = supabase
            .from('research_sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (projectId) {
            query = query.eq('project_id', projectId);
        }

        const { data, error } = await query;

        if (error) throw error;

        return { success: true, sessions: data as ResearchSession[] };
    } catch (error: any) {
        console.error('[listResearchSessions]', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get synthesis operations for a session
 */
export async function getSessionOperations(
    sessionId: string
): Promise<{ success: boolean; operations?: SynthesisOperation[]; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('synthesis_operations')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, operations: data as SynthesisOperation[] };
    } catch (error: any) {
        console.error('[getSessionOperations]', error);
        return { success: false, error: error.message };
    }
}

/**
 * Recursively get full lineage for a block (ancestors)
 */
export async function getFullLineage(
    blockId: string,
    depth: number = 0,
    maxDepth: number = 5
): Promise<{ success: boolean; lineage?: BlockProvenance[]; error?: string }> {
    try {
        if (depth >= maxDepth) return { success: true, lineage: [] };

        const { data, error } = await supabase
            .from('block_provenance')
            .select(`
                *,
                source_document:source_document_id (
                    id,
                    title
                ),
                source_block:source_block_id (
                    id,
                    title
                )
            `)
            .eq('block_id', blockId);

        if (error) throw error;

        let fullLineage: BlockProvenance[] = [...(data as any)];

        // Recursively fetch parents
        for (const item of data || []) {
            if (item.source_block_id) {
                const parentResult = await getFullLineage(item.source_block_id, depth + 1, maxDepth);
                if (parentResult.success && parentResult.lineage) {
                    fullLineage = [...fullLineage, ...parentResult.lineage];
                }
            }
        }

        // De-duplicate by ID
        fullLineage = Array.from(new Map(fullLineage.map(item => [item.id, item])).values());

        return { success: true, lineage: fullLineage };
    } catch (error: any) {
        console.error('[getFullLineage]', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get graph data for provenance visualization
 */
export async function getProvenanceGraphData(
    sessionId?: string,
    projectId?: string
): Promise<{ success: boolean; nodes?: any[]; links?: any[]; error?: string }> {
    try {
        let blockIds: string[] = [];

        // 1. Determine scope (Session or Project)
        if (sessionId) {
            const { data: ops } = await supabase
                .from('synthesis_operations')
                .select('output_block_id, input_block_ids')
                .eq('session_id', sessionId);

            if (ops) {
                ops.forEach(op => {
                    if (op.output_block_id) blockIds.push(op.output_block_id);
                    if (op.input_block_ids) blockIds.push(...op.input_block_ids);
                });
            }
        } else if (projectId) {
            // Get all blocks in project
            const { data: docs } = await supabase
                .from('documents')
                .select('id')
                .eq('project_id', projectId);

            if (docs) {
                const docIds = docs.map(d => d.id);
                const { data: blocks } = await supabase
                    .from('document_blocks')
                    .select('id')
                    .in('document_id', docIds);

                if (blocks) blockIds = blocks.map(b => b.id);
            }
        }

        if (blockIds.length === 0) return { success: true, nodes: [], links: [] };

        // 2. Fetch Blocks Info
        const { data: blocks } = await supabase
            .from('document_blocks')
            .select('id, title, block_type, document_id, document(title)')
            .in('id', blockIds);

        // 3. Fetch Provenance Links
        const { data: links } = await supabase
            .from('block_provenance')
            .select('*')
            .in('block_id', blockIds);

        // 4. Format for Graph
        const nodes = (blocks || []).map(b => ({
            id: b.id,
            name: b.title || 'Sin Título',
            type: b.block_type,
            group: 'block',
            docTitle: (b.document as any)?.title
        }));

        // Add Source Documents as nodes if referenced
        const sourceDocIds = new Set(links?.map(l => l.source_document_id).filter(Boolean) as string[]);
        if (sourceDocIds.size > 0) {
            const { data: sourceDocs } = await supabase
                .from('documents')
                .select('id, title')
                .in('id', Array.from(sourceDocIds));

            sourceDocs?.forEach(d => {
                if (!nodes.find(n => n.id === d.id)) {
                    nodes.push({
                        id: d.id,
                        name: d.title,
                        type: 'document',
                        group: 'document',
                        docTitle: d.title
                    });
                }
            });
        }

        const graphLinks = (links || []).map(l => ({
            source: l.source_block_id || l.source_document_id, // Prefer block connection, fallback to doc
            target: l.block_id,
            type: l.contribution_type,
            value: l.contribution_percentage
        })).filter(l => l.source && l.target);

        return { success: true, nodes, links: graphLinks };

    } catch (error: any) {
        console.error('[getProvenanceGraphData]', error);
        return { success: false, error: error.message };
    }
}
