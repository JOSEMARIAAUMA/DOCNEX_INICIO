import { DocumentBlock, SemanticLink } from '@docnex/shared';

export interface GraphNode {
    id: string;
    label: string;
    type: 'block' | 'tag' | 'document' | 'current';
    group: number;
    val: number; // Size
    color?: string;
    data?: any;
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
    }
): GraphData {
    const nodes: Map<string, GraphNode> = new Map();
    const links: GraphLink[] = [];

    // 1. Central Node (The current block)
    nodes.set(activeBlockId, {
        id: activeBlockId,
        label: activeBlockTitle.length > 20 ? activeBlockTitle.substring(0, 20) + '...' : activeBlockTitle,
        type: 'current',
        group: 1,
        val: 10,
        color: '#f59e0b' // Primary emphasis color (Amber/Orange generally stands out)
    });

    // Helper to add block node
    const addBlockNode = (block: DocumentBlock, type: 'related' | 'backlink') => {
        if (!nodes.has(block.id)) {
            nodes.set(block.id, {
                id: block.id,
                label: block.title.length > 15 ? block.title.substring(0, 15) + '...' : block.title,
                type: 'block',
                group: 2,
                val: 5,
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

    // 2. Process Outgoing Linked (Manual)
    connections.linked.forEach(conn => {
        if (conn.targetBlock) {
            addBlockNode(conn.targetBlock, 'related');
            links.push({
                source: activeBlockId,
                target: conn.targetBlock.id,
                type: 'manual',
                color: '#10b981' // Green for confirmed links
            });
        }
    });

    // 3. Process Backlinks
    connections.backlinks.forEach(conn => {
        if (conn.sourceBlock) {
            addBlockNode(conn.sourceBlock, 'backlink');
            links.push({
                source: conn.sourceBlock.id, // Arrow points TO active
                target: activeBlockId,
                type: 'backlink',
                width: 1,
                dashed: true
            });
        }
    });

    // 4. Process Auto/Unlinked (Tag Similarity or Mentions)
    connections.unlinked.forEach(conn => {
        if (conn.targetBlock) {
            const isTagSimilarity = conn.link.link_type === 'tag_similarity';

            if (isTagSimilarity && conn.link.metadata?.common_tags) {
                // For tag similarities, we can link via Tag Nodes to show shared clusters
                // Or just link directly with a special color. 
                // Let's link DIRECTLY for simplicity in v1, but maybe visualize tags?
                // Visualizing tags as nodes is powerful. Let's do that.

                addBlockNode(conn.targetBlock, 'related');

                conn.link.metadata.common_tags.forEach((tag: string) => {
                    const tagId = addTagNode(tag);
                    // Link Active -> Tag
                    // Check duplicate links? ForceGraph handles it but better to be clean
                    if (!links.find(l => l.source === activeBlockId && l.target === tagId)) {
                        links.push({ source: activeBlockId, target: tagId, type: 'has_tag', color: '#e5e7eb', width: 0.5 });
                    }
                    // Link Tag -> Target
                    links.push({ source: tagId, target: conn.targetBlock!.id, type: 'has_tag', color: '#e5e7eb', width: 0.5 });
                });
            } else {
                // Direct Auto-mention (Title match)
                addBlockNode(conn.targetBlock, 'related');
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
