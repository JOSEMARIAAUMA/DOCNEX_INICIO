'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    GitBranch, FileText, ArrowRight, ChevronDown, ChevronRight,
    Filter, ExternalLink, Sparkles, Clock, Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBlockProvenance, getSessionOperations } from '@/actions/synthesis';
import { BlockProvenance, SynthesisOperation } from '@/lib/ai/synthesis-schemas';
import { motion, AnimatePresence } from 'framer-motion';

// ==================== TYPES ====================

interface ProvenanceWithDetails extends BlockProvenance {
    source_document?: { id: string; title: string };
    source_block?: { id: string; title: string };
}

interface SourceLineageSectionProps {
    blockId: string;
    sessionId?: string;
    onNavigateToSource?: (docId: string, blockId: string) => void;
}

interface LineageNode {
    id: string;
    type: 'source' | 'operation' | 'result';
    title: string;
    subtitle?: string;
    percentage?: number;
    color: string;
    children?: LineageNode[];
    metadata?: {
        docId?: string;
        blockId?: string;
        operationType?: string;
        timestamp?: string;
    };
}

// ==================== COLORS ====================

const NODE_COLORS = {
    source: '#3b82f6',      // blue
    synthesis: '#a855f7',   // purple
    merge: '#22c55e',       // green
    result: '#eab308',      // yellow
    reference: '#f97316',   // orange
};

// ==================== FLOW DIAGRAM ====================

interface FlowDiagramProps {
    nodes: LineageNode[];
    onNodeClick?: (node: LineageNode) => void;
}

function FlowDiagram({ nodes, onNodeClick }: FlowDiagramProps) {
    if (nodes.length === 0) return null;

    return (
        <div className="relative py-4">
            {/* Source nodes */}
            <div className="flex flex-wrap gap-2 justify-center mb-4">
                {nodes.filter(n => n.type === 'source').map((node) => (
                    <motion.div
                        key={node.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                            "flex flex-col items-center gap-1 p-3 rounded-lg cursor-pointer transition-all",
                            "border-2 hover:shadow-lg hover:-translate-y-1",
                            "bg-card"
                        )}
                        style={{ borderColor: node.color }}
                        onClick={() => onNodeClick?.(node)}
                    >
                        <FileText
                            className="w-5 h-5"
                            style={{ color: node.color }}
                        />
                        <span className="text-xs font-medium text-foreground max-w-[80px] truncate text-center">
                            {node.title}
                        </span>
                        {node.percentage !== undefined && (
                            <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{
                                    backgroundColor: `${node.color}20`,
                                    color: node.color
                                }}
                            >
                                {node.percentage}%
                            </span>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Flow arrows */}
            <div className="flex justify-center mb-4">
                <div className="flex flex-col items-center gap-1">
                    <div className="w-0.5 h-6 bg-gradient-to-b from-primary to-transparent" />
                    <ArrowRight className="w-4 h-4 text-primary rotate-90" />
                </div>
            </div>

            {/* Synthesis node */}
            <div className="flex justify-center mb-4">
                {nodes.filter(n => n.type === 'operation').map((node) => (
                    <motion.div
                        key={node.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-full",
                            "bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30"
                        )}
                    >
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-xs font-medium text-foreground">
                            {node.title}
                        </span>
                    </motion.div>
                ))}
            </div>

            {/* Flow arrows */}
            <div className="flex justify-center mb-4">
                <div className="flex flex-col items-center gap-1">
                    <ArrowRight className="w-4 h-4 text-primary rotate-90" />
                    <div className="w-0.5 h-6 bg-gradient-to-b from-transparent to-yellow-500" />
                </div>
            </div>

            {/* Result node */}
            <div className="flex justify-center">
                {nodes.filter(n => n.type === 'result').map((node) => (
                    <motion.div
                        key={node.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                            "flex flex-col items-center gap-1 p-4 rounded-xl cursor-pointer transition-all",
                            "border-2 hover:shadow-lg bg-card"
                        )}
                        style={{ borderColor: NODE_COLORS.result }}
                        onClick={() => onNodeClick?.(node)}
                    >
                        <Layers
                            className="w-6 h-6"
                            style={{ color: NODE_COLORS.result }}
                        />
                        <span className="text-xs font-semibold text-foreground">
                            {node.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                            Bloque Final
                        </span>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// ==================== TREE VIEW ====================

interface TreeNodeProps {
    node: ProvenanceWithDetails;
    level: number;
    onNavigate?: () => void;
}

function TreeNode({ node, level, onNavigate }: TreeNodeProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    const colors = ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ec4899'];
    const color = colors[level % colors.length];

    return (
        <div className="ml-4">
            <div
                className={cn(
                    "group flex items-center gap-2 py-2 px-3 rounded-lg transition-all",
                    onNavigate && "cursor-pointer hover:bg-accent"
                )}
                onClick={onNavigate}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                    }}
                    className="p-0.5 hover:bg-accent rounded"
                >
                    {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                </button>

                <FileText
                    className="w-4 h-4 shrink-0"
                    style={{ color }}
                />

                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                        {node.source_document?.title || 'Documento'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {node.source_block?.title || `Bloque ${node.source_block_id?.slice(-6)}`}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                            backgroundColor: `${color}20`,
                            color
                        }}
                    >
                        {node.contribution_percentage}%
                    </span>

                    {onNavigate && (
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                </div>
            </div>
        </div>
    );
}

// ==================== MAIN COMPONENT ====================

export function SourceLineageSection({
    blockId,
    sessionId,
    onNavigateToSource,
}: SourceLineageSectionProps) {
    const [provenance, setProvenance] = useState<ProvenanceWithDetails[]>([]);
    const [operations, setOperations] = useState<SynthesisOperation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'tree' | 'flow'>('flow');
    const [sessionFilter, setSessionFilter] = useState<string | null>(sessionId || null);

    // Fetch data
    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            try {
                const [provResult, opsResult] = await Promise.all([
                    getBlockProvenance(blockId),
                    sessionId ? getSessionOperations(sessionId) : Promise.resolve({ success: true, operations: [] })
                ]);

                if (provResult.success && provResult.provenance) {
                    setProvenance(provResult.provenance as ProvenanceWithDetails[]);
                }
                if (opsResult.success && opsResult.operations) {
                    setOperations(opsResult.operations);
                }
            } catch (error) {
                console.error('[SourceLineageSection] Error:', error);
            } finally {
                setIsLoading(false);
            }
        }

        if (blockId) {
            fetchData();
        }
    }, [blockId, sessionId]);

    // Build flow diagram nodes
    const flowNodes = useMemo<LineageNode[]>(() => {
        const nodes: LineageNode[] = [];

        // Source nodes from provenance
        provenance.forEach((p, i) => {
            nodes.push({
                id: p.id,
                type: 'source',
                title: p.source_document?.title || 'Fuente',
                subtitle: p.source_block?.title,
                percentage: p.contribution_percentage,
                color: NODE_COLORS.source,
                metadata: {
                    docId: p.source_document_id,
                    blockId: p.source_block_id || undefined,
                }
            });
        });

        // If we have provenance, add an operation node
        if (provenance.length > 0) {
            const opType = provenance[0].contribution_type;
            nodes.push({
                id: 'operation-1',
                type: 'operation',
                title: opType === 'merged' ? 'Fusión AI' :
                    opType === 'synthesized' ? 'Síntesis AI' :
                        'Compilación',
                color: NODE_COLORS.synthesis,
            });
        }

        // Result node
        nodes.push({
            id: blockId,
            type: 'result',
            title: 'Bloque Resultado',
            color: NODE_COLORS.result,
            metadata: { blockId }
        });

        return nodes;
    }, [provenance, blockId]);

    const handleNodeClick = (node: LineageNode) => {
        if (node.metadata?.docId && onNavigateToSource) {
            onNavigateToSource(node.metadata.docId, node.metadata.blockId || '');
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">
                        Linaje de Fuentes
                    </h3>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-muted rounded-lg p-0.5">
                        <button
                            onClick={() => setViewMode('flow')}
                            className={cn(
                                "px-2 py-1 text-xs font-medium rounded-md transition-all",
                                viewMode === 'flow'
                                    ? "bg-background shadow-sm text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Flujo
                        </button>
                        <button
                            onClick={() => setViewMode('tree')}
                            className={cn(
                                "px-2 py-1 text-xs font-medium rounded-md transition-all",
                                viewMode === 'tree'
                                    ? "bg-background shadow-sm text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Árbol
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm text-muted-foreground">
                                Cargando linaje...
                            </span>
                        </div>
                    </div>
                ) : provenance.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <FileText className="w-12 h-12 text-muted-foreground/50 mb-3" />
                        <h4 className="text-sm font-medium text-foreground mb-1">
                            Bloque Original
                        </h4>
                        <p className="text-xs text-muted-foreground text-center max-w-[200px]">
                            Este bloque no tiene fuentes de procedencia registradas.
                        </p>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        {viewMode === 'flow' ? (
                            <motion.div
                                key="flow"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <FlowDiagram
                                    nodes={flowNodes}
                                    onNodeClick={handleNodeClick}
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="tree"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <div className="space-y-1">
                                    {provenance.map((p, i) => (
                                        <TreeNode
                                            key={p.id}
                                            node={p}
                                            level={i}
                                            onNavigate={
                                                p.source_document && onNavigateToSource
                                                    ? () => onNavigateToSource(
                                                        p.source_document!.id,
                                                        p.source_block_id || ''
                                                    )
                                                    : undefined
                                            }
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>

            {/* Footer with Trace Action */}
            {provenance.length > 0 && onNavigateToSource && (
                <div className="p-4 border-t border-border">
                    <button
                        onClick={() => {
                            const firstSource = provenance[0];
                            if (firstSource?.source_document) {
                                onNavigateToSource(
                                    firstSource.source_document.id,
                                    firstSource.source_block_id || ''
                                );
                            }
                        }}
                        className={cn(
                            "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
                            "bg-primary/10 text-primary hover:bg-primary/20 transition-colors",
                            "text-sm font-medium"
                        )}
                    >
                        <ExternalLink className="w-4 h-4" />
                        Ir a Fuente Principal
                    </button>
                </div>
            )}
        </div>
    );
}

export default SourceLineageSection;
