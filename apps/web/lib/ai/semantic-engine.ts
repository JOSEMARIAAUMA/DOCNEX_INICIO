import { DocumentBlock, SemanticLink } from '@docnex/shared';
import { createSemanticLink, listSemanticLinksByBlock, updateBlock } from '../api';

/**
 * Motor Semántico de DOCNEX
 * Encargado de detectar relaciones entre bloques de forma automática.
 */

export interface DiscoveryResult {
    targetBlockId: string;
    targetTitle: string;
    mentionContext: string;
    commonTags?: string[];
}

import { extractKeywords } from './keyword-extractor';

/**
 * Busca bloques relacionados por etiquetas compartidas.
 */
export function discoverTagConnections(
    sourceBlock: DocumentBlock,
    availableBlocks: DocumentBlock[]
): DiscoveryResult[] {
    const results: DiscoveryResult[] = [];
    if (!sourceBlock.tags || sourceBlock.tags.length === 0) return [];

    const sourceTags = new Set(sourceBlock.tags);

    const candidates = availableBlocks.filter(b =>
        b.id !== sourceBlock.id &&
        b.tags &&
        b.tags.length > 0
    );

    for (const target of candidates) {
        const commonTags = target.tags!.filter(tag => sourceTags.has(tag));

        if (commonTags.length > 0) {
            results.push({
                targetBlockId: target.id,
                targetTitle: target.title,
                mentionContext: `Etiquetas compartidas: ${commonTags.join(', ')}`,
                commonTags
            });
        }
    }

    return results;
}

/**
 * Procesa un bloque para crear links automáticos:
 * 1. Auto-tagging si es necesario.
 * 2. Enlaces por etiquetas compartidas.
 */
export async function processAutoLinks(
    sourceBlock: DocumentBlock,
    projectBlocks: DocumentBlock[]
): Promise<number> {
    let currentBlock = { ...sourceBlock };
    let tagsUpdated = false;

    // 1. Auto-tagging (Simulación AI) si no tiene etiquetas
    if (!currentBlock.tags || currentBlock.tags.length === 0) {
        const extracted = extractKeywords(currentBlock.content);
        if (extracted.length > 0) {
            console.log(`🤖 AI Auto-tagging para bloque ${currentBlock.id}:`, extracted);
            // Actualizamos el bloque en la DB
            await updateBlock(currentBlock.id, currentBlock.content, extracted);
            currentBlock.tags = extracted;
            tagsUpdated = true;
        }
    }

    // 2. Descubrir conexiones por Tags
    const discoveries = discoverTagConnections(currentBlock, projectBlocks);
    if (discoveries.length === 0) return tagsUpdated ? 0 : 0; // Retornamos, pero ya hicimos algo util (tags)

    // Obtener links existentes para evitar duplicados
    const existingLinks = await listSemanticLinksByBlock(currentBlock.id);
    const existingTargetIds = new Set(existingLinks.map(l => l.target_block_id));

    let createdCount = 0;
    for (const discovery of discoveries) {
        if (!existingTargetIds.has(discovery.targetBlockId)) {
            await createSemanticLink({
                source_block_id: currentBlock.id,
                target_block_id: discovery.targetBlockId,
                link_type: 'tag_similarity',
                metadata: {
                    context: discovery.mentionContext,
                    common_tags: discovery.commonTags,
                    auto_generated: true,
                    confidence: 0.9
                }
            });
            createdCount++;
        }
    }

    return createdCount;
}

// Helpers
function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractContext(text: string, query: string, padding: number = 40): string {
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return '';

    const start = Math.max(0, index - padding);
    const end = Math.min(text.length, index + query.length + padding);

    let context = text.substring(start, end);
    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';

    return context;
}
