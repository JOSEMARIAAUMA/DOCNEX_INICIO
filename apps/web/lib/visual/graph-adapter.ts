import { DocumentBlock, SemanticLink } from '@docnex/shared';
import { decodeHtmlEntities } from '../text-utils';

export interface GraphNode {
    id: string;
    label: string;
    type: 'block' | 'tag' | 'document' | 'current' | 'titulo' | 'capitulo' | 'articulo';
    group: number;
    val: number; // Size
    color?: string;
    data?: any;
    hierarchyLevel?: 0 | 1 | 2; // 0=TÍTULO, 1=CAPÍTULO, 2=ARTÍCULO
}

export interface GraphLink {
    source: string;
    target: string;
    type: string;
    color?: string;
    width?: number;
    dashed?: boolean;
}

export interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}

interface NetworkConnection {
    link: SemanticLink;
    targetBlock?: DocumentBlock;
    sourceBlock?: DocumentBlock;
}

/**
 * Transforms local network data (focused on one block) into graph data.
 */
export function transformToLocalGraph(
    activeBlockId: string,
    activeBlockTitle: string,
    connections: {
        linked: NetworkConnection[];
        unlinked: NetworkConnection[]; // Includes tag_similarity
        backlinks: NetworkConnection[];
    },
    allBlocks: DocumentBlock[] = []
): GraphData {
    const nodes: Map<string, GraphNode> = new Map();
    const links: GraphLink[] = [];

    // Hierarchy colors for 3-level structure
    const HIERARCHY_COLORS = {
        titulo: '#f59e0b',    // Amber - Nivel 0
        capitulo: '#06b6d4',  // Cyan - Nivel 1
        articulo: '#10b981'   // Emerald - Nivel 2 (Colorful & Fresh)
    };

    // Helper to calculate block hierarchy level
    const getBlockHierarchyLevel = (block: DocumentBlock, allBlocks: DocumentBlock[] = []): 0 | 1 | 2 => {
        // If we have access to all blocks, calculate level from parent chain
        let level = 0;
        let currentParentId = block.parent_block_id;

        while (currentParentId && level < 2) {
            level++;
            const parent = allBlocks.find(b => b.id === currentParentId);
            if (!parent) break;
            currentParentId = parent.parent_block_id;
        }
        return Math.min(level, 2) as 0 | 1 | 2;
    };

    // Helper to add block node with hierarchy awareness
    const addBlockNode = (block: DocumentBlock, type: 'related' | 'backlink', allBlocks: DocumentBlock[] = []) => {
        if (!nodes.has(block.id)) {
            const hierarchyLevel = getBlockHierarchyLevel(block, allBlocks);
            const hierarchyType = hierarchyLevel === 0 ? 'titulo' : hierarchyLevel === 1 ? 'capitulo' : 'articulo';
            const hierarchyColor = HIERARCHY_COLORS[hierarchyType];
            const nodeSize = hierarchyLevel === 0 ? 7 : hierarchyLevel === 1 ? 5 : 3;

            const label = decodeHtmlEntities(block.title);
            nodes.set(block.id, {
                id: block.id,
                label: label.length > 15 ? label.substring(0, 15) + '...' : label,
                type: hierarchyType,
                group: 2,
                val: nodeSize,
                color: hierarchyColor,
                hierarchyLevel: hierarchyLevel,
                data: block
            });
        }
    };

    // Helper to add Tag node (intermediate node for tag similarities)
    const addTagNode = (tag: string) => {
        const tagId = `tag-${tag}`;
        if (!nodes.has(tagId)) {
            nodes.set(tagId, {
                id: tagId,
                label: `#${tag}`,
                type: 'tag',
                group: 3,
                val: 3,
                color: '#60a5fa' // Blueish for tags
            });
        }
        return tagId;
    };

    // 1. Central Node (The current block)
    // We add it explicitly first to ensure it exists and gets Type 'current' override if desired, 
    // OR we can just treat it as a normal block to show its color/level correctly, but size it up.
    // Let's treat it as Hierarchy-aware but bigger.
    // Actually, preserving 'current' type from previous code is safer for sizing logic in KnowledgeGraph.

    // Calculate level for active block too
    const activeBlock = allBlocks.find(b => b.id === activeBlockId);
    let activeLevel: 0 | 1 | 2 = 0;
    if (activeBlock) {
        activeLevel = getBlockHierarchyLevel(activeBlock, allBlocks);
    }

    const activeLabel = decodeHtmlEntities(activeBlockTitle);
    nodes.set(activeBlockId, {
        id: activeBlockId,
        label: activeLabel.length > 20 ? activeLabel.substring(0, 20) + '...' : activeLabel,
        type: 'current',
        group: 1,
        val: 10,
        color: HIERARCHY_COLORS[activeLevel === 0 ? 'titulo' : activeLevel === 1 ? 'capitulo' : 'articulo'], // Match hierarchy color
        hierarchyLevel: activeLevel,
        data: activeBlock
    });

    // 2. Add Structural Neighbors (Parent & Children)
    if (activeBlock && allBlocks.length > 0) {
        // Add Parent
        if (activeBlock.parent_block_id) {
            const parent = allBlocks.find(b => b.id === activeBlock.parent_block_id);
            if (parent) {
                addBlockNode(parent, 'related', allBlocks);
                links.push({
                    source: parent.id,
                    target: activeBlockId, // Arrow from Parent to Child? Or Hierarchy? Usually Parent->Child.
                    // But here active is child. So Parent (source) -> Active (target).
                    type: 'hierarchy',
                    color: '#525252',
                    width: 1
                });
            }
        }

        // Add Children (Level 3 nodes if active is Level 2, etc.)
        const children = allBlocks.filter(b => b.parent_block_id === activeBlockId);
        children.forEach(child => {
            addBlockNode(child, 'related', allBlocks);
            links.push({
                source: activeBlockId, // Active (Period) -> Child
                target: child.id,
                type: 'hierarchy',
                color: '#525252',
                width: 1
            });
        });
    }

    // 3. Process Outgoing Linked (Manual)
    connections.linked.forEach(conn => {
        if (conn.targetBlock) {
            addBlockNode(conn.targetBlock, 'related', allBlocks);
            links.push({
                source: activeBlockId,
                target: conn.targetBlock.id,
                type: 'manual',
                color: '#10b981' // Green for confirmed links
            });
        }
    });

    // 4. Process Backlinks
    connections.backlinks.forEach(conn => {
        if (conn.sourceBlock) {
            addBlockNode(conn.sourceBlock, 'backlink', allBlocks);
            links.push({
                source: conn.sourceBlock.id, // Arrow points TO active
                target: activeBlockId,
                type: 'backlink',
                width: 1,
                dashed: true
            });
        }
    });

    // 5. Process Auto/Unlinked (Tag Similarity or Mentions)
    connections.unlinked.forEach(conn => {
        if (conn.targetBlock) {
            const isTagSimilarity = conn.link.link_type === 'tag_similarity';

            if (isTagSimilarity && conn.link.metadata?.common_tags) {
                addBlockNode(conn.targetBlock, 'related', allBlocks);

                conn.link.metadata.common_tags.forEach((tag: string) => {
                    const tagId = addTagNode(tag);
                    if (!links.find(l => l.source === activeBlockId && l.target === tagId)) {
                        links.push({ source: activeBlockId, target: tagId, type: 'has_tag', color: '#e5e7eb', width: 0.5 });
                    }
                    links.push({ source: tagId, target: conn.targetBlock!.id, type: 'has_tag', color: '#e5e7eb', width: 0.5 });
                });
            } else {
                // Direct Auto-mention (Title match)
                addBlockNode(conn.targetBlock, 'related', allBlocks);
                links.push({
                    source: activeBlockId,
                    target: conn.targetBlock.id,
                    type: 'auto',
                    color: '#94a3b8', // Slate for auto
                    dashed: true
                });
            }
        }
    });

    return {
        nodes: Array.from(nodes.values()),
        links: links
    };
}
