'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Wand2, Layers, X } from 'lucide-react';
import { DocumentBlock } from '@docnex/shared';
import MergeAnalysisModal, { ConsolidationAnalysis } from './MergeAnalysisModal';

interface BlockMergeToolProps {
    sessionId?: string;
    availableBlocks: DocumentBlock[];
    targetDocumentId: string;
    onMergeComplete: () => void;
    initialSelectedIds?: string[];
}

export default function BlockMergeTool({
    sessionId,
    availableBlocks,
    targetDocumentId,
    onMergeComplete,
    initialSelectedIds = []
}: BlockMergeToolProps) {
    const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set(initialSelectedIds));
    const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<ConsolidationAnalysis | null>(null);

    const selectedBlocks = availableBlocks.filter(b => selectedBlockIds.has(b.id));

    const toggleBlock = (blockId: string) => {
        setSelectedBlockIds(prev => {
            const next = new Set(prev);
            if (next.has(blockId)) next.delete(blockId);
            else {
                if (next.size >= 5) return next; // Limit to 5
                next.add(blockId);
            }
            return next;
        });
    };

    const handleMergeClick = async () => {
        setIsAnalysisOpen(true);
        setIsAnalyzing(true);
        setAnalysis(null);

        // Simulate AI process
        try {
            await new Promise(resolve => setTimeout(resolve, 2500));
            // Mock Analysis
            const mockAnalysis: ConsolidationAnalysis = {
                duplicates: [],
                conflicts: [
                    {
                        topic: "Definición de Ámbito",
                        sourceContent: "El ámbito se define por los límites administrativos...",
                        targetContent: "El ámbito incluye zonas periféricas no administrativas...",
                        resolutionSuggestion: "Combinar ambas definiciones especificando contextos."
                    }
                ],
                qualityScore: 0.89,
                mergedContent: selectedBlocks.map(b => b.content).join("\n\n"),
                provenance: selectedBlocks.map(b => ({
                    segment: b.content.substring(0, 20) + "...",
                    sourceId: b.id,
                    sourceTitle: b.title
                }))
            };
            setAnalysis(mockAnalysis);
        } catch (error) {
            console.error("Merge failed", error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleConfirmMerge = async (finalContent: string) => {
        // Implement actual merge action here (call API/Action)
        console.log("Merging with content:", finalContent);
        setIsAnalysisOpen(false);
        onMergeComplete();
    };

    return (
        <div className="h-full flex flex-col bg-muted/10 rounded-xl overflow-hidden border border-border/50 shadow-inner">
            {/* Header */}
            <div className="p-4 border-b border-border bg-card flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-500/10 text-indigo-500 rounded-md">
                        <Layers className="w-5 h-5" />
                    </div>
                    <h2 className="font-semibold text-foreground">Herramienta de Fusión</h2>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="bg-muted px-2 py-0.5 rounded-full font-mono text-xs">
                        {selectedBlockIds.size}/5
                    </span>
                    <span>seleccionados</span>
                </div>
            </div>

            {/* Main Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Selection Panel */}
                <div className="w-1/3 border-r border-border bg-muted/20 overflow-y-auto p-4 space-y-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
                        Bloques Disponibles
                    </h3>
                    {availableBlocks.map(block => (
                        <div
                            key={block.id}
                            onClick={() => toggleBlock(block.id)}
                            className={`
                                cursor-pointer group p-3 rounded-lg border transition-all duration-200
                                ${selectedBlockIds.has(block.id)
                                    ? 'bg-primary/5 border-primary/40 shadow-sm'
                                    : 'bg-card border-border hover:border-primary/20 hover:shadow-sm'
                                }
                            `}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`
                                    w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-colors
                                    ${selectedBlockIds.has(block.id)
                                        ? 'bg-primary border-primary'
                                        : 'border-muted-foreground/30 group-hover:border-primary/50'
                                    }
                                `}>
                                    {selectedBlockIds.has(block.id) && (
                                        <svg className="w-3 h-3 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                </div>
                                <div>
                                    <h4 className={`text-sm font-medium ${selectedBlockIds.has(block.id) ? 'text-primary' : 'text-foreground'}`}>
                                        {block.title || 'Bloque sin título'}
                                    </h4>
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                        {block.content}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                    {availableBlocks.length === 0 && (
                        <div className="text-center py-10 text-muted-foreground text-sm">
                            No hay bloques disponibles
                        </div>
                    )}
                </div>

                {/* Preview Panel */}
                <div className="flex-1 bg-card p-6 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto space-y-6">
                        {selectedBlocks.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                                <Layers className="w-12 h-12 mb-4" />
                                <p>Selecciona bloques para comenzar la fusión</p>
                            </div>
                        ) : (
                            selectedBlocks.map((block, index) => (
                                <motion.div
                                    key={block.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="relative pl-6 border-l-2 border-indigo-200 dark:border-indigo-900 group"
                                >
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 bg-card border-2 border-indigo-200 dark:border-indigo-900 rounded-full flex items-center justify-center">
                                        <span className="text-[10px] font-bold text-indigo-500">{index + 1}</span>
                                    </div>
                                    <div className="mb-2 flex items-center justify-between">
                                        <h4 className="font-medium text-sm text-indigo-600 dark:text-indigo-400">
                                            {block.title}
                                        </h4>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleBlock(block.id); }}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded text-muted-foreground transition-all"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="text-sm leading-relaxed text-foreground/80 bg-muted/10 p-3 rounded-lg">
                                        {block.content}
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>

                    <div className="mt-6 pt-6 border-t border-border">
                        <button
                            onClick={handleMergeClick}
                            disabled={selectedBlockIds.size < 2}
                            className={`
                                w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all
                                ${selectedBlockIds.size >= 2
                                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.01]'
                                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                                }
                            `}
                        >
                            <Sparkles className="w-5 h-5" />
                            <span>Fusionar con Inteligencia Artificial</span>
                            {selectedBlockIds.size >= 2 && <ArrowRight className="w-5 h-5 opacity-80" />}
                        </button>
                        <p className="text-center text-xs text-muted-foreground mt-3">
                            La IA analizará duplicados, resolverá conflictos y generará una síntesis coherente.
                        </p>
                    </div>
                </div>
            </div>

            <MergeAnalysisModal
                isOpen={isAnalysisOpen}
                onClose={() => setIsAnalysisOpen(false)}
                analysis={analysis}
                isAnalyzing={isAnalyzing}
                onConfirm={handleConfirmMerge}
                onCancel={() => setIsAnalysisOpen(false)}
            />
        </div>
    );
}
