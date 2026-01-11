'use server';

import { geminiClient } from '@/lib/ai/gemini-client';
import { BlockItem } from '@/lib/ai/schemas';
import { AIContext } from '@/types/ai';

/**
 * Server Action to split a document using AI
 * This runs on the server to keep the API key secret
 */
export async function splitDocumentWithAI(
    text: string,
    instructions?: string,
    context?: AIContext
): Promise<{ success: boolean; blocks?: BlockItem[]; error?: string }> {
    try {
        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            return {
                success: false,
                error: 'API Key de Gemini no configurada'
            };
        }

        const blocks = await geminiClient.splitDocument(text, instructions, context);

        return {
            success: true,
            blocks
        };
    } catch (error: any) {
        console.error('[splitDocumentWithAI] Error:', error);
        return {
            success: false,
            error: error.message || 'Error al procesar documento'
        };
    }
}

/**
 * Server Action for AI chat
 */
export async function chatWithAI(
    message: string,
    context?: { documentPreview?: string; currentStrategy?: string; userInstructions?: string },
    globalContext?: AIContext
): Promise<{ success: boolean; reply?: string; error?: string }> {
    try {
        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            return {
                success: false,
                error: 'API Key de Gemini no configurada'
            };
        }

        const reply = await geminiClient.chat(message, context, globalContext);

        return {
            success: true,
            reply
        };
    } catch (error: any) {
        console.error('[chatWithAI] Error:', error);
        return {
            success: false,
            error: error.message || 'Error en el chat'
        };
    }
}

/**
 * Server Action to analyze text
 */
export async function analyzeTextWithAI(
    text: string,
    analysisType: 'summary' | 'key_points' | 'structure' = 'summary',
    context?: AIContext
): Promise<{ success: boolean; analysis?: string; error?: string }> {
    try {
        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            return {
                success: false,
                error: 'API Key de Gemini no configurada'
            };
        }

        const analysis = await geminiClient.analyzeText(text, analysisType, context);

        return {
            success: true,
            analysis
        };
    } catch (error: any) {
        console.error('[analyzeTextWithAI] Error:', error);
        return {
            success: false,
            error: error.message || 'Error al analizar texto'
        };
    }
}

/**
 * Server Action for Deep Document Analysis
 */
import { DeepAnalysisResult } from '@/lib/ai/schemas';

export async function analyzeDocumentStructure(
    text: string,
    context?: AIContext
): Promise<{ success: boolean; data?: DeepAnalysisResult; error?: string }> {
    try {
        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            return { success: false, error: 'API Key missing' };
        }

        const data = await geminiClient.analyzeDocumentDeeply(text, context);

        if (!data) return { success: false, error: 'No se pudo generar el análisis' };

        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Server Action for Editor Text Transformation
 */
export async function transformTextWithAI(
    text: string,
    instruction: 'simplify' | 'expand' | 'tone_professional' | 'grammar',
    context?: AIContext
): Promise<{ success: boolean; transformed?: string; error?: string }> {
    try {
        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            return { success: false, error: 'API Key missing' };
        }

        const transformed = await geminiClient.transformText(text, instruction, context);
        return { success: true, transformed };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Server Action for Note Execution
 */
export async function executeNoteInstructionWithAI(
    originalText: string,
    instruction: string,
    context?: AIContext
): Promise<{ success: boolean; result?: { diffHtml: string, newText: string, thoughtProcess: string }; error?: string }> {
    try {
        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            return { success: false, error: 'API Key missing' };
        }

        const result = await geminiClient.generateEditProposal(originalText, instruction, context);
        return { success: true, result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
/**
 * Server Action for Cognitive Document Structuring (Librarian Agent) + Relationship Discovery (Relational Agent)
 */
import { librarianAgent } from '@/lib/ai/agents/librarian-agent';
import { relationalAgent } from '@/lib/ai/agents/relational-agent';
import { supabase } from '@/lib/supabase/client';

export async function structureDocumentWithLibrarian(
    text: string,
    projectId: string,
    context?: AIContext
): Promise<{ success: boolean; blocks?: BlockItem[]; links?: any[]; error?: string }> {
    try {
        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            return { success: false, error: 'API Key missing' };
        }

        // 1. Fetch Learned Criteria (Memory)
        const { data: memories } = await supabase
            .from('ai_cognitive_memory')
            .select('memory_value')
            .eq('memory_key', 'division_preferences')
            .maybeSingle();

        const userCriteria = memories?.memory_value || "";

        // 2. Step 1: Segmentation (The Librarian)
        const blocks = await librarianAgent.structureDocument(text, userCriteria, context);

        // 3. Step 2: Relationship Discovery (The Graph Architect)
        let links: any[] = [];
        if (blocks.length > 1) {
            console.log(`[Cognitive Pipeline] Discovering links for ${blocks.length} blocks...`);
            links = await relationalAgent.discoverLinks(blocks, text.slice(0, 1000));
            console.log(`[Cognitive Pipeline] Found ${links.length} semantic relationships.`);
        }

        return { success: true, blocks, links };
    } catch (error: any) {
        console.error('[structureDocumentWithLibrarian] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action to Log Cognitive Feedback
 */
export async function logAIFeedback(payload: {
    agentId: string;
    eventType: string;
    projectId?: string;
    userFeedback: any;
    metrics?: any;
}) {
    // This runs in background, no need to wait for result in UI normally
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from('ai_interaction_logs').insert({
            user_id: user.id,
            project_id: payload.projectId,
            agent_id: payload.agentId,
            event_type: payload.eventType,
            user_feedback: payload.userFeedback,
            metrics: payload.metrics
        });
    } catch (e) {
        console.error("Failed to log AI feedback:", e);
    }
}

/**
 * Server Action to Finalize Learning (Close the loop)
 */
export async function finalizeLibrarianLearning(
    originalBlocks: BlockItem[],
    finalBlocks: BlockItem[]
) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Ask agent to extract rules
        const newRule = await librarianAgent.learnFromFeedback(originalBlocks, finalBlocks);
        if (!newRule) return;

        // 2. Fetch existing memory
        const { data: memory } = await supabase
            .from('ai_cognitive_memory')
            .select('*')
            .eq('memory_key', 'division_preferences')
            .maybeSingle();

        const updatedCriteria = memory ? `${memory.memory_value}\n- ${newRule}` : `- ${newRule}`;

        // 3. Upsert into DB
        await supabase.from('ai_cognitive_memory').upsert({
            user_id: user.id,
            memory_key: 'division_preferences',
            memory_value: updatedCriteria,
            confidence_score: (memory?.confidence_score || 0) + 0.1,
            updated_at: new Date().toISOString()
        });

        console.log("[Cognitive Engine] New instruction learned:", newRule);
    } catch (e) {
        console.error("Failed to finalize learning:", e);
    }
}

/**
 * Batch Import with Semantic Links (The GraphRAG Ingression)
 * Supports 3-level hierarchy: TÍTULO → CAPÍTULO → ARTÍCULO
 */
export async function batchImportBlocks(
    projectId: string,
    documentId: string,
    blocks: BlockItem[],
    links: any[]
): Promise<{ success: boolean; error?: string }> {
    try {
        const allInsertedBlocks: { id: string; title: string; hierarchyLevel: number }[] = [];
        let orderCounter = 0;

        /**
         * Recursively insert blocks with parent-child relationships
         */
        async function insertBlocksRecursively(
            items: BlockItem[],
            parentId: string | null,
            level: number
        ): Promise<void> {
            for (const block of items) {
                // Auto-tag based on hierarchy level for cleaner filtering/search
                const levelTags = level === 0 ? ['TÍTULO'] : level === 1 ? ['CAPÍTULO'] : level === 2 ? ['ARTÍCULO'] : [];

                const blockToInsert = {
                    document_id: documentId,
                    title: block.title,
                    content: block.content,
                    order_index: orderCounter++,
                    parent_block_id: parentId,
                    block_type: block.target || 'section',
                    tags: levelTags,
                    is_deleted: false
                };

                const { data: createdBlock, error } = await supabase
                    .from('document_blocks')
                    .insert(blockToInsert)
                    .select('id, title')
                    .single();

                if (error || !createdBlock) {
                    throw new Error(`Error creating block "${block.title}": ${error?.message}`);
                }

                allInsertedBlocks.push({
                    id: createdBlock.id,
                    title: createdBlock.title,
                    hierarchyLevel: level
                });

                console.log(`[BatchImport] Created ${level === 0 ? 'TÍTULO' : level === 1 ? 'CAPÍTULO' : 'ARTÍCULO'}: ${block.title}`);

                // Recursively insert children (up to 3 levels)
                if (block.children && block.children.length > 0 && level < 2) {
                    await insertBlocksRecursively(block.children, createdBlock.id, level + 1);
                }
            }
        }

        // 1. Insert all blocks recursively with hierarchy
        await insertBlocksRecursively(blocks, null, 0);

        console.log(`[BatchImport] Total blocks created: ${allInsertedBlocks.length}`);

        // 2. Create semantic links from AI analysis
        const linksToInsert = links.map(link => {
            const sourceBlock = allInsertedBlocks[link.source_index];
            const targetBlock = allInsertedBlocks[link.target_index];

            if (!sourceBlock || !targetBlock) return null;

            return {
                source_block_id: sourceBlock.id,
                target_block_id: targetBlock.id,
                target_document_id: documentId,
                link_type: 'semantic_similarity',
                metadata: { reason: link.reason, confidence: 0.8 }
            };
        }).filter(Boolean);

        // 3. Create Links
        if (linksToInsert.length > 0) {
            const { error: linkError } = await supabase
                .from('semantic_links')
                .insert(linksToInsert);

            if (linkError) console.warn("Some semantic links failed:", linkError);
        }

        return { success: true };
    } catch (e: any) {
        console.error("Batch Import Failed:", e);
        return { success: false, error: e.message };
    }
}
