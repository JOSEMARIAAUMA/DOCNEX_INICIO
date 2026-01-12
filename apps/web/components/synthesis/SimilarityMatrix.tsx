'use client';

import React, { useState, useMemo } from 'react';
import {
    Grid3X3, Info, ArrowRight, FileText,
    TrendingUp, Sparkles, HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// ==================== TYPES ====================

interface DocumentData {
    id: string;
    title: string;
    content: string;
}

interface SimilarityMatrixProps {
    documents: DocumentData[];
    onCellClick?: (doc1Id: string, doc2Id: string, similarity: number) => void;
    onMergeRecommendation?: (docIds: string[]) => void;
}

interface MatrixCell {
    row: number;
    col: number;
    similarity: number;
    doc1: DocumentData;
    doc2: DocumentData;
}

// ==================== SIMILARITY CALCULATION ====================

/**
 * Calculate Jaccard similarity on word sets
 */
function calculateJaccardSimilarity(text1: string, text2: string): number {
    const normalize = (s: string) => s.toLowerCase().replace(/[^\w\sáéíóúñü]/g, '');
    const words1 = new Set(normalize(text1).split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(normalize(text2).split(/\s+/).filter(w => w.length > 3));

    if (words1.size === 0 || words2.size === 0) return 0;

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
}

/**
 * Calculate cosine similarity using word frequency vectors
 */
function calculateCosineSimilarity(text1: string, text2: string): number {
    const normalize = (s: string) => s.toLowerCase().replace(/[^\w\sáéíóúñü]/g, '');
    const words1 = normalize(text1).split(/\s+/).filter(w => w.length > 3);
    const words2 = normalize(text2).split(/\s+/).filter(w => w.length > 3);

    // Create word frequency maps
    const freq1 = new Map<string, number>();
    const freq2 = new Map<string, number>();

    words1.forEach(w => freq1.set(w, (freq1.get(w) || 0) + 1));
    words2.forEach(w => freq2.set(w, (freq2.get(w) || 0) + 1));

    // Get all unique words
    const allWords = new Set([...freq1.keys(), ...freq2.keys()]);

    // Calculate dot product and magnitudes
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    allWords.forEach(word => {
        const f1 = freq1.get(word) || 0;
        const f2 = freq2.get(word) || 0;
        dotProduct += f1 * f2;
        magnitude1 += f1 * f1;
        magnitude2 += f2 * f2;
    });

    if (magnitude1 === 0 || magnitude2 === 0) return 0;

    return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
}

/**
 * Combined similarity score
 */
function calculateSimilarity(text1: string, text2: string): number {
    const jaccard = calculateJaccardSimilarity(text1, text2);
    const cosine = calculateCosineSimilarity(text1, text2);
    return (jaccard + cosine) / 2;
}

// ==================== COLOR UTILITIES ====================

function getSimilarityColor(similarity: number): string {
    // Gradient from blue (low) -> yellow (medium) -> red (high)
    if (similarity >= 0.8) return 'rgb(239, 68, 68)';   // red-500
    if (similarity >= 0.6) return 'rgb(249, 115, 22)';  // orange-500
    if (similarity >= 0.4) return 'rgb(234, 179, 8)';   // yellow-500
    if (similarity >= 0.2) return 'rgb(34, 197, 94)';   // green-500
    return 'rgb(59, 130, 246)';                          // blue-500
}

function getSimilarityBackground(similarity: number): string {
    const alpha = Math.min(similarity * 0.8 + 0.1, 0.9);
    const color = getSimilarityColor(similarity);
    return color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
}

// ==================== MATRIX CELL COMPONENT ====================

interface MatrixCellComponentProps {
    cell: MatrixCell;
    isDiagonal: boolean;
    isHovered: boolean;
    onHover: () => void;
    onLeave: () => void;
    onClick: () => void;
}

function MatrixCellComponent({
    cell,
    isDiagonal,
    isHovered,
    onHover,
    onLeave,
    onClick,
}: MatrixCellComponentProps) {
    const percentage = Math.round(cell.similarity * 100);

    if (isDiagonal) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-primary/10 border border-primary/20">
                <span className="text-xs font-bold text-primary">100%</span>
            </div>
        );
    }

    return (
        <motion.div
            className={cn(
                "w-full h-full flex items-center justify-center cursor-pointer",
                "transition-all duration-200 relative group",
                isHovered && "ring-2 ring-primary ring-offset-1 z-10"
            )}
            style={{ backgroundColor: getSimilarityBackground(cell.similarity) }}
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
            onClick={onClick}
            whileHover={{ scale: 1.05 }}
        >
            <span className={cn(
                "text-xs font-bold",
                cell.similarity > 0.5 ? "text-white" : "text-foreground"
            )}>
                {percentage}%
            </span>

            {/* Tooltip on hover */}
            {isHovered && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border border-border rounded-lg shadow-xl z-50 whitespace-nowrap">
                    <div className="text-xs">
                        <strong>{cell.doc1.title}</strong>
                        <ArrowRight className="inline w-3 h-3 mx-1 text-muted-foreground" />
                        <strong>{cell.doc2.title}</strong>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                        Click para comparar
                    </div>
                </div>
            )}
        </motion.div>
    );
}

// ==================== MAIN COMPONENT ====================

export function SimilarityMatrix({
    documents,
    onCellClick,
    onMergeRecommendation,
}: SimilarityMatrixProps) {
    const [hoveredCell, setHoveredCell] = useState<string | null>(null);
    const [showHelp, setShowHelp] = useState(false);

    // Calculate similarity matrix
    const matrix = useMemo<MatrixCell[][]>(() => {
        const n = documents.length;
        const result: MatrixCell[][] = [];

        for (let i = 0; i < n; i++) {
            const row: MatrixCell[] = [];
            for (let j = 0; j < n; j++) {
                const similarity = i === j
                    ? 1
                    : calculateSimilarity(documents[i].content, documents[j].content);

                row.push({
                    row: i,
                    col: j,
                    similarity,
                    doc1: documents[i],
                    doc2: documents[j],
                });
            }
            result.push(row);
        }

        return result;
    }, [documents]);

    // Find merge recommendations (highest similarity pairs)
    const mergeRecommendations = useMemo(() => {
        const pairs: { docs: [number, number]; similarity: number }[] = [];

        for (let i = 0; i < documents.length; i++) {
            for (let j = i + 1; j < documents.length; j++) {
                pairs.push({
                    docs: [i, j],
                    similarity: matrix[i][j].similarity,
                });
            }
        }

        return pairs
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 3)
            .filter(p => p.similarity > 0.3);
    }, [matrix, documents]);

    // Statistics
    const stats = useMemo(() => {
        let sum = 0;
        let count = 0;
        let max = 0;
        let min = 1;

        for (let i = 0; i < documents.length; i++) {
            for (let j = i + 1; j < documents.length; j++) {
                const sim = matrix[i][j].similarity;
                sum += sim;
                count++;
                max = Math.max(max, sim);
                min = Math.min(min, sim);
            }
        }

        return {
            average: count > 0 ? sum / count : 0,
            max,
            min,
        };
    }, [matrix, documents]);

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <div className="shrink-0 px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Grid3X3 className="w-5 h-5 text-primary" />
                    <h2 className="font-semibold text-sm">
                        Matriz de Similitud
                    </h2>
                    <span className="text-xs text-muted-foreground">
                        {documents.length}×{documents.length}
                    </span>
                </div>

                <button
                    onClick={() => setShowHelp(!showHelp)}
                    className="p-1.5 hover:bg-accent rounded-lg transition-colors"
                >
                    <HelpCircle className="w-4 h-4 text-muted-foreground" />
                </button>
            </div>

            {/* Help Panel */}
            {showHelp && (
                <div className="shrink-0 px-4 py-3 bg-muted/30 border-b border-border">
                    <div className="flex items-start gap-3">
                        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <div className="text-xs text-muted-foreground">
                            <p className="mb-2">
                                Esta matriz muestra la similitud textual entre cada par de documentos.
                                Los colores van del <span className="text-blue-500 font-medium">azul (baja similitud)</span> al <span className="text-red-500 font-medium">rojo (alta similitud)</span>.
                            </p>
                            <p>
                                Haz clic en una celda para comparar los documentos en detalle.
                                Los documentos con alta similitud son buenos candidatos para fusionar.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Matrix Content */}
            <div className="flex-1 overflow-auto p-4">
                <div className="min-w-fit">
                    {/* Column Headers */}
                    <div className="flex">
                        <div className="w-28 h-10 shrink-0" /> {/* Corner spacer */}
                        {documents.map((doc, i) => (
                            <div
                                key={`col-${i}`}
                                className="w-16 h-10 shrink-0 flex items-center justify-center px-1"
                            >
                                <span className="text-[10px] font-medium text-muted-foreground truncate transform -rotate-45 origin-left translate-x-2">
                                    {doc.title.slice(0, 12)}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Rows */}
                    {matrix.map((row, i) => (
                        <div key={`row-${i}`} className="flex">
                            {/* Row Header */}
                            <div className="w-28 h-16 shrink-0 flex items-center pr-2 border-r border-border">
                                <div className="flex items-center gap-2 min-w-0">
                                    <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    <span className="text-xs font-medium truncate">
                                        {documents[i].title}
                                    </span>
                                </div>
                            </div>

                            {/* Cells */}
                            {row.map((cell, j) => (
                                <div
                                    key={`cell-${i}-${j}`}
                                    className="w-16 h-16 shrink-0 border border-border/50"
                                >
                                    <MatrixCellComponent
                                        cell={cell}
                                        isDiagonal={i === j}
                                        isHovered={hoveredCell === `${i}-${j}`}
                                        onHover={() => setHoveredCell(`${i}-${j}`)}
                                        onLeave={() => setHoveredCell(null)}
                                        onClick={() => {
                                            if (i !== j) {
                                                onCellClick?.(cell.doc1.id, cell.doc2.id, cell.similarity);
                                            }
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Color Scale Legend */}
            <div className="shrink-0 px-4 py-2 border-t border-border bg-muted/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Baja</span>
                        <div className="flex h-3 rounded overflow-hidden">
                            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((val) => (
                                <div
                                    key={val}
                                    className="w-8 h-full"
                                    style={{ backgroundColor: getSimilarityBackground(val) }}
                                />
                            ))}
                        </div>
                        <span className="text-xs text-muted-foreground">Alta</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Promedio: <strong className="text-foreground">{Math.round(stats.average * 100)}%</strong></span>
                        <span>Máx: <strong className="text-foreground">{Math.round(stats.max * 100)}%</strong></span>
                        <span>Mín: <strong className="text-foreground">{Math.round(stats.min * 100)}%</strong></span>
                    </div>
                </div>
            </div>

            {/* Merge Recommendations */}
            {mergeRecommendations.length > 0 && onMergeRecommendation && (
                <div className="shrink-0 px-4 py-3 border-t border-border bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center gap-3 mb-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold text-foreground">
                            Recomendaciones de Fusión
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {mergeRecommendations.map(({ docs, similarity }, i) => (
                            <button
                                key={i}
                                onClick={() => onMergeRecommendation([
                                    documents[docs[0]].id,
                                    documents[docs[1]].id
                                ])}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs",
                                    "bg-primary/10 hover:bg-primary/20 transition-colors",
                                    "border border-primary/20"
                                )}
                            >
                                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                                <span className="font-medium text-foreground">
                                    {documents[docs[0]].title.slice(0, 10)}...
                                </span>
                                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                <span className="font-medium text-foreground">
                                    {documents[docs[1]].title.slice(0, 10)}...
                                </span>
                                <span className="text-primary font-bold">
                                    {Math.round(similarity * 100)}%
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default SimilarityMatrix;
