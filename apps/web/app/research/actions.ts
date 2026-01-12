'use server';

import { consolidationAgent } from '@/lib/ai/agents/consolidation-agent';
import { getDocumentsByIds } from '@/lib/api';
import { BlockWithProvenance } from '@/lib/ai/synthesis-schemas';
import { Document } from '@/lib/api';

// Helper to convert Documents to BlockWithProvenance (simplified for now)
// In a real scenario, we would fetch blocks from DB. 
// For this MVP, we might treat the whole document content as one block or fetch actual blocks.
// Let's assume we fetch blocks. 

import { listBlocks } from '@/lib/api';

export async function generateOutlineAction(documentIds: string[], context?: any) {
    try {
        console.log("[Action] Generating outline for docs:", documentIds);

        // 1. Fetch all blocks from selected documents
        let allBlocks: BlockWithProvenance[] = [];

        for (const docId of documentIds) {
            // We need to fetch the document title for provenance
            // This is inefficient loop, but fine for MVP
            const blocks = await listBlocks(docId);
            // We need doc title... we can get it from the doc object if we had it.
            // Let's assume we can get it or just use docId for now.

            // We need to fetch document to get title
            const doc = await import('@/lib/api').then(m => m.getDocument(docId)); // Dynamic import to ensure we use server version? No, standard import is fine.

            if (doc) {
                const mappedBlocks: BlockWithProvenance[] = blocks.map(b => ({
                    id: b.id,
                    title: b.title,
                    content: b.content,
                    source_doc: doc.title,
                    source_doc_id: doc.id,
                    tags: b.tags,
                    order_index: b.order_index
                }));
                allBlocks = [...allBlocks, ...mappedBlocks];
            }
        }

        if (allBlocks.length === 0) {
            throw new Error("No content found in selected documents");
        }

        // 2. Call Agent
        const proposal = await consolidationAgent.proposeOutline(allBlocks, context);
        return proposal;

    } catch (error: any) {
        console.error("Error in generateOutlineAction:", error);
        throw new Error(error.message || "Failed to generate outline");
    }
}
