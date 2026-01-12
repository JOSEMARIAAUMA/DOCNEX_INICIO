'use client';

import React, { useState, useMemo } from 'react';
import {
    FileText, Eye, EyeOff, Download, ArrowLeftRight,
    Layers, AlertTriangle, Copy, CheckCircle, XCircle, Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// ==================== TYPES ====================

interface DocumentData {
    id: string;
    title: string;
    content: string;
    blocks?: { id: string; content: string; title: string }[];
}

interface DiffSegment {
    text: string;
    type: 'unique' | 'similar' | 'duplicate' | 'contradiction';
    docIndex: number;
    similarity?: number;
    matchingDocs?: number[];
}

interface MultiDocDiffProps {
    documents: DocumentData[];
    onExportPdf?: () => void;
    onClose?: () => void;
}

// ==================== CONSTANTS ====================

const DIFF_COLORS = {
    unique: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-700 dark:text-green-300', label: 'Único' },
    similar: { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-700 dark:text-yellow-300', label: 'Similar' },
    duplicate: { bg: 'bg-gray-500/20', border: 'border-gray-500', text: 'text-gray-700 dark:text-gray-300', label: 'Duplicado' },
    contradiction: { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-700 dark:text-red-300', label: 'Contradicción' },
};

// ==================== LEVENSHTEIN DISTANCE ====================

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;

    // Create matrix
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    // Initialize first row and column
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    // Fill matrix
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
    }

    return dp[m][n];
}

/**
 * Calculate normalized similarity (0-1) using Levenshtein distance
 */
function calculateSimilarity(text1: string, text2: string): number {
    const s1 = text1.toLowerCase().trim();
    const s2 = text2.toLowerCase().trim();

    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    const maxLen = Math.max(s1.length, s2.length);
    const distance = levenshteinDistance(s1, s2);

    return 1 - (distance / maxLen);
}

/**
 * Detect potential contradictions (simple heuristic)
 */
function detectContradiction(text1: string, text2: string): boolean {
    const t1 = text1.toLowerCase();
    const t2 = text2.toLowerCase();

    // Simple contradiction patterns
    const negationPairs = [
        ['sí', 'no'],
        ['permitido', 'prohibido'],
        ['legal', 'ilegal'],
        ['válido', 'inválido'],
        ['obligatorio', 'opcional'],
        ['siempre', 'nunca'],
        ['todos', 'ninguno'],
        ['incluye', 'excluye'],
        ['aumenta', 'disminuye'],
        ['aprueba', 'rechaza'],
    ];

    for (const [pos, neg] of negationPairs) {
        if ((t1.includes(pos) && t2.includes(neg)) || (t1.includes(neg) && t2.includes(pos))) {
            return true;
        }
    }

    return false;
}

// ==================== DIFF SEGMENT COMPONENT ====================

interface DiffSegmentItemProps {
    segment: DiffSegment;
    docTitle: string;
    isExpanded: boolean;
    onToggle: () => void;
}

function DiffSegmentItem({ segment, docTitle, isExpanded, onToggle }: DiffSegmentItemProps) {
    const colorInfo = DIFF_COLORS[segment.type];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "rounded-lg border-l-4 transition-all overflow-hidden",
                colorInfo.border,
                colorInfo.bg
            )}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                onClick={onToggle}
            >
                <div className="flex items-center gap-3">
                    {segment.type === 'unique' && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {segment.type === 'similar' && <Minus className="w-4 h-4 text-yellow-500" />}
                    {segment.type === 'duplicate' && <Copy className="w-4 h-4 text-gray-500" />}
                    {segment.type === 'contradiction' && <XCircle className="w-4 h-4 text-red-500" />}

                    <div>
                        <span className={cn("text-xs font-medium", colorInfo.text)}>
                            {colorInfo.label}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                            en {docTitle}
                        </span>
                    </div>

                    {segment.similarity !== undefined && segment.similarity < 1 && (
                        <span className="text-[10px] bg-background/50 px-1.5 py-0.5 rounded">
                            {Math.round(segment.similarity * 100)}% similar
                        </span>
                    )}
                </div>

                <button className="p-1 hover:bg-accent rounded">
                    {isExpanded ? (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                        <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                </button>
            </div>

            {/* Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-current/10"
                    >
                        <p className="p-3 text-sm text-foreground whitespace-pre-wrap">
                            {segment.text}
                        </p>

                        {segment.matchingDocs && segment.matchingDocs.length > 0 && (
                            <div className="px-3 pb-3">
                                <span className="text-xs text-muted-foreground">
                                    También en: Documentos {segment.matchingDocs.map(i => i + 1).join(', ')}
                                </span>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ==================== MAIN COMPONENT ====================

export function MultiDocDiff({
    documents,
    onExportPdf,
    onClose,
}: MultiDocDiffProps) {
    const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('unified');
    const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set());
    const [filterType, setFilterType] = useState<string | null>(null);

    // Analyze documents and generate diff segments
    const diffSegments = useMemo<DiffSegment[]>(() => {
        const segments: DiffSegment[] = [];

        documents.forEach((doc, docIndex) => {
            const textChunks = doc.blocks
                ? doc.blocks.map(b => ({ id: b.id, text: b.content }))
                : doc.content.split('\n\n').filter(t => t.trim()).map((t, i) => ({ id: `${doc.id}-${i}`, text: t }));

            textChunks.forEach(chunk => {
                let maxSimilarity = 0;
                let matchingDocs: number[] = [];
                let isContradiction = false;

                // Compare with other documents
                documents.forEach((otherDoc, otherIndex) => {
                    if (docIndex === otherIndex) return;

                    const otherChunks = otherDoc.blocks
                        ? otherDoc.blocks.map(b => b.content)
                        : otherDoc.content.split('\n\n').filter(t => t.trim());

                    otherChunks.forEach(otherText => {
                        const sim = calculateSimilarity(chunk.text, otherText);
                        if (sim > maxSimilarity) {
                            maxSimilarity = sim;
                        }
                        if (sim > 0.5) {
                            if (!matchingDocs.includes(otherIndex)) {
                                matchingDocs.push(otherIndex);
                            }
                            // Check for contradiction
                            if (detectContradiction(chunk.text, otherText)) {
                                isContradiction = true;
                            }
                        }
                    });
                });

                // Determine segment type
                let type: DiffSegment['type'] = 'unique';
                if (isContradiction) {
                    type = 'contradiction';
                } else if (maxSimilarity >= 0.95) {
                    type = 'duplicate';
                } else if (maxSimilarity >= 0.5) {
                    type = 'similar';
                }

                segments.push({
                    text: chunk.text,
                    type,
                    docIndex,
                    similarity: maxSimilarity,
                    matchingDocs: matchingDocs.length > 0 ? matchingDocs : undefined,
                });
            });
        });

        return segments;
    }, [documents]);

    // Filter segments
    const filteredSegments = useMemo(() => {
        if (!filterType) return diffSegments;
        return diffSegments.filter(s => s.type === filterType);
    }, [diffSegments, filterType]);

    // Statistics
    const stats = useMemo(() => {
        const counts = { unique: 0, similar: 0, duplicate: 0, contradiction: 0 };
        diffSegments.forEach(s => { counts[s.type]++; });
        return counts;
    }, [diffSegments]);

    const toggleExpand = (id: string) => {
        setExpandedSegments(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const expandAll = () => {
        setExpandedSegments(new Set(filteredSegments.map((_, i) => `${i}`)));
    };

    const collapseAll = () => {
        setExpandedSegments(new Set());
    };

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header with Legend */}
            <div className="shrink-0 border-b border-border">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <ArrowLeftRight className="w-5 h-5 text-primary" />
                        <h2 className="font-semibold text-sm">
                            Comparación Multi-Documento
                        </h2>
                        <span className="text-xs text-muted-foreground">
                            {documents.length} documentos
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* View Mode Toggle */}
                        <div className="flex items-center bg-muted rounded-lg p-0.5">
                            <button
                                onClick={() => setViewMode('unified')}
                                className={cn(
                                    "px-2 py-1 text-xs font-medium rounded-md transition-all",
                                    viewMode === 'unified'
                                        ? "bg-background shadow-sm text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Unificado
                            </button>
                            <button
                                onClick={() => setViewMode('side-by-side')}
                                className={cn(
                                    "px-2 py-1 text-xs font-medium rounded-md transition-all",
                                    viewMode === 'side-by-side'
                                        ? "bg-background shadow-sm text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Lado a Lado
                            </button>
                        </div>

                        {/* Export PDF */}
                        {onExportPdf && (
                            <button
                                onClick={onExportPdf}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Exportar PDF
                            </button>
                        )}
                    </div>
                </div>

                {/* Color Legend */}
                <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-t border-border">
                    <div className="flex items-center gap-4">
                        {Object.entries(DIFF_COLORS).map(([key, value]) => (
                            <button
                                key={key}
                                onClick={() => setFilterType(filterType === key ? null : key)}
                                className={cn(
                                    "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all",
                                    filterType === key ? "bg-background shadow-sm ring-1 ring-primary" : "hover:bg-background/50"
                                )}
                            >
                                <div className={cn("w-3 h-3 rounded", value.bg, `border ${value.border}`)} />
                                <span className={filterType === key ? "font-medium" : "text-muted-foreground"}>
                                    {value.label}
                                </span>
                                <span className={cn(
                                    "text-[10px] font-mono",
                                    filterType === key ? "text-primary" : "text-muted-foreground"
                                )}>
                                    ({stats[key as keyof typeof stats]})
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={expandAll}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Expandir todo
                        </button>
                        <span className="text-muted-foreground">|</span>
                        <button
                            onClick={collapseAll}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Colapsar todo
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {viewMode === 'unified' ? (
                    <div className="space-y-3">
                        {filteredSegments.map((segment, index) => (
                            <DiffSegmentItem
                                key={`${segment.docIndex}-${index}`}
                                segment={segment}
                                docTitle={documents[segment.docIndex]?.title || `Doc ${segment.docIndex + 1}`}
                                isExpanded={expandedSegments.has(`${index}`)}
                                onToggle={() => toggleExpand(`${index}`)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className={cn(
                        "grid gap-4",
                        documents.length === 2 ? "grid-cols-2" :
                            documents.length === 3 ? "grid-cols-3" :
                                "grid-cols-4"
                    )}>
                        {documents.map((doc, docIndex) => (
                            <div
                                key={doc.id}
                                className="flex flex-col border border-border rounded-xl overflow-hidden bg-card"
                            >
                                <div className="px-4 py-3 border-b border-border bg-muted/30">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-primary" />
                                        <span className="text-sm font-medium truncate">
                                            {doc.title}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[60vh]">
                                    {filteredSegments
                                        .filter(s => s.docIndex === docIndex)
                                        .map((segment, i) => (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "p-2 rounded-lg border-l-2 text-xs",
                                                    DIFF_COLORS[segment.type].bg,
                                                    DIFF_COLORS[segment.type].border
                                                )}
                                            >
                                                <p className="line-clamp-4">
                                                    {segment.text}
                                                </p>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Summary Footer */}
            <div className="shrink-0 px-4 py-3 border-t border-border bg-muted/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                            Total: <strong className="text-foreground">{diffSegments.length}</strong> segmentos
                        </span>
                        {stats.contradiction > 0 && (
                            <span className="flex items-center gap-1 text-red-500">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {stats.contradiction} contradicciones detectadas
                            </span>
                        )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                        Algoritmo: Levenshtein Distance
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MultiDocDiff;
