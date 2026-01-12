'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, CheckCircle, FileText, Copy, GitMerge, ArrowRight } from 'lucide-react';
import { DocumentBlock } from '@docnex/shared';

export interface ConsolidationAnalysis {
    duplicates: {
        sourceBlockId: string;
        targetBlockId: string;
        similarity: number;
        description: string;
    }[];
    conflicts: {
        topic: string;
        sourceContent: string;
        targetContent: string;
        resolutionSuggestion: string;
    }[];
    qualityScore: number;
    mergedContent: string;
    provenance: {
        segment: string;
        sourceId: string;
        sourceTitle: string;
    }[];
}

interface MergeAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    analysis: ConsolidationAnalysis | null;
    isAnalyzing: boolean;
    onConfirm: (finalContent: string) => void;
    onCancel: () => void;
}

export default function MergeAnalysisModal({
    isOpen,
    onClose,
    analysis,
    isAnalyzing,
    onConfirm,
    onCancel
}: MergeAnalysisModalProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'duplicates' | 'conflicts' | 'preview'>('overview');
    const [editedContent, setEditedContent] = useState('');

    // Initialize edited content when analysis is ready
    if (analysis && !editedContent && analysis.mergedContent) {
        setEditedContent(analysis.mergedContent);
    }

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-card w-full max-w-4xl h-[85vh] rounded-xl shadow-2xl flex flex-col border border-border overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <GitMerge className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-foreground">Análisis de Fusión</h2>
                                    <p className="text-sm text-muted-foreground">
                                        {isAnalyzing ? 'Analizando bloques...' : 'Revisión de síntesis sugerida'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-colors">
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex overflow-hidden">
                            {isAnalyzing ? (
                                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
                                    <div className="relative w-16 h-16">
                                        <div className="absolute inset-0 border-4 border-muted rounded-full"></div>
                                        <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-medium">Procesando Contenido</h3>
                                        <p className="text-muted-foreground">Detectando duplicados, conflictos y fusionando...</p>
                                    </div>
                                </div>
                            ) : analysis ? (
                                <>
                                    {/* Sidebar Navigation */}
                                    <div className="w-64 border-r border-border bg-muted/10 p-2 flex flex-col gap-1">
                                        <NavButton
                                            active={activeTab === 'overview'}
                                            onClick={() => setActiveTab('overview')}
                                            icon={<FileText className="w-4 h-4" />}
                                            label="Resumen General"
                                        />
                                        <NavButton
                                            active={activeTab === 'duplicates'}
                                            onClick={() => setActiveTab('duplicates')}
                                            icon={<Copy className="w-4 h-4" />}
                                            label="Duplicados"
                                            badge={analysis.duplicates.length}
                                        />
                                        <NavButton
                                            active={activeTab === 'conflicts'}
                                            onClick={() => setActiveTab('conflicts')}
                                            icon={<AlertTriangle className="w-4 h-4" />}
                                            label="Conflictos"
                                            badge={analysis.conflicts.length}
                                            badgeColor="bg-yellow-500/10 text-yellow-600"
                                        />
                                        <NavButton
                                            active={activeTab === 'preview'}
                                            onClick={() => setActiveTab('preview')}
                                            icon={<CheckCircle className="w-4 h-4" />}
                                            label="Vista Previa"
                                            badge="Final"
                                            badgeColor="bg-green-500/10 text-green-600"
                                        />
                                    </div>

                                    {/* Tab Content */}
                                    <div className="flex-1 overflow-y-auto p-6 bg-card">
                                        {activeTab === 'overview' && (
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <ScoreCard
                                                        title="Calidad de Fusión"
                                                        value={`${Math.round(analysis.qualityScore * 100)}%`}
                                                        description="Coherencia y continuidad"
                                                    />
                                                    <ScoreCard
                                                        title="Reducción"
                                                        value="~15%"
                                                        description="Texto redundante eliminado"
                                                    />
                                                </div>

                                                <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                                                    <h3 className="font-medium mb-2 flex items-center gap-2">
                                                        <CheckCircle className="w-4 h-4 text-primary" />
                                                        Estrategia de Síntesis
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        Se ha generado un texto unificado priorizando la estructura lógica.
                                                        Las citas originales se han conservado utilizando referencias [Doc].
                                                        Los conflictos menores se resolvieron a favor de la fuente más reciente.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {activeTab === 'duplicates' && (
                                            <div className="space-y-4">
                                                <h3 className="font-medium text-lg">Duplicados Detectados</h3>
                                                {analysis.duplicates.length === 0 ? (
                                                    <EmptyState message="No se encontraron duplicados significativos." />
                                                ) : (
                                                    analysis.duplicates.map((dup, i) => (
                                                        <div key={i} className="p-4 bg-muted/30 border border-border rounded-lg">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-xs font-medium bg-muted px-2 py-1 rounded">
                                                                    Similitud: {Math.round(dup.similarity * 100)}%
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-muted-foreground">{dup.description}</p>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        {activeTab === 'conflicts' && (
                                            <div className="space-y-4">
                                                <h3 className="font-medium text-lg">Conflictos de Información</h3>
                                                {analysis.conflicts.length === 0 ? (
                                                    <EmptyState message="No se detectaron contradicciones." />
                                                ) : (
                                                    analysis.conflicts.map((conflict, i) => (
                                                        <div key={i} className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg dark:bg-yellow-900/10 dark:border-yellow-900/50">
                                                            <h4 className="font-medium text-yellow-800 dark:text-yellow-500 mb-2">
                                                                {conflict.topic}
                                                            </h4>
                                                            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                                                <div className="p-3 bg-white dark:bg-black/20 rounded border border-yellow-100 dark:border-yellow-900/30">
                                                                    <span className="text-xs font-bold text-muted-foreground uppercase">Fuente A</span>
                                                                    <p className="mt-1">{conflict.sourceContent}</p>
                                                                </div>
                                                                <div className="p-3 bg-white dark:bg-black/20 rounded border border-yellow-100 dark:border-yellow-900/30">
                                                                    <span className="text-xs font-bold text-muted-foreground uppercase">Fuente B</span>
                                                                    <p className="mt-1">{conflict.targetContent}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-start gap-2 text-sm text-yellow-700 dark:text-yellow-400">
                                                                <ArrowRight className="w-4 h-4 mt-0.5" />
                                                                <span><strong>Sugerencia:</strong> {conflict.resolutionSuggestion}</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        {activeTab === 'preview' && (
                                            <div className="space-y-4 h-full flex flex-col">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="font-medium text-lg">Resultado Final</h3>
                                                    <div className="text-xs text-muted-foreground">
                                                        {editedContent.length} caracteres
                                                    </div>
                                                </div>
                                                <textarea
                                                    className="flex-1 w-full bg-muted/20 border border-border rounded-lg p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    value={editedContent}
                                                    onChange={(e) => setEditedContent(e.target.value)}
                                                />
                                                <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                                                    Identificadores de origen:
                                                    {analysis.provenance.map((p, i) => (
                                                        <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary/5 text-primary rounded border border-primary/10">
                                                            <span>[{p.sourceId.substring(0, 4)}]</span>
                                                            <span className="truncate max-w-[100px]">{p.sourceTitle}</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : null}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-border bg-muted/30 flex justify-end gap-3">
                            <button
                                onClick={onCancel}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => onConfirm(editedContent)}
                                disabled={isAnalyzing || !analysis}
                                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                                {activeTab === 'preview' ? 'Confirmar y Fusionar' : 'Revisar y Continuar'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function NavButton({ active, onClick, icon, label, badge, badgeColor = "bg-primary/10 text-primary" }: any) {
    return (
        <button
            onClick={onClick}
            className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}
            `}
        >
            {icon}
            <span className="flex-1 text-left">{label}</span>
            {badge !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${badgeColor}`}>
                    {badge}
                </span>
            )}
        </button>
    );
}

function ScoreCard({ title, value, description }: any) {
    return (
        <div className="p-4 bg-card border border-border rounded-lg shadow-sm">
            <h4 className="text-sm font-medium text-muted-foreground mb-1">{title}</h4>
            <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground opacity-60">
            <CheckCircle className="w-8 h-8 mb-2" />
            <p className="text-sm">{message}</p>
        </div>
    );
}
