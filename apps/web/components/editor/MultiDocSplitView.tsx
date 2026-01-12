'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    X, Maximize2, Minimize2, Link as LinkIcon, Unlink,
    Grid2X2, Grid3X3, Palette, Focus, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// ==================== TYPES ====================

export interface DocumentPane {
    id: string;
    documentId: string;
    title: string;
    content: string;
    color: string;
    blocks?: { id: string; content: string; title: string }[];
}

interface MultiDocSplitViewProps {
    documents: DocumentPane[];
    onClose: () => void;
    onDocumentChange?: (docId: string, updates: Partial<DocumentPane>) => void;
    onBlockClick?: (docId: string, blockId: string) => void;
}

// ==================== COLOR PALETTE ====================

const DOCUMENT_COLORS = [
    { name: 'Azul', value: '#3b82f6', border: 'border-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Verde', value: '#22c55e', border: 'border-green-500', bg: 'bg-green-500/10' },
    { name: 'Naranja', value: '#f97316', border: 'border-orange-500', bg: 'bg-orange-500/10' },
    { name: 'Púrpura', value: '#a855f7', border: 'border-purple-500', bg: 'bg-purple-500/10' },
    { name: 'Rosa', value: '#ec4899', border: 'border-pink-500', bg: 'bg-pink-500/10' },
    { name: 'Amarillo', value: '#eab308', border: 'border-yellow-500', bg: 'bg-yellow-500/10' },
];

// ==================== SIMILARITY HIGHLIGHTING ====================

/**
 * Simple text similarity using Jaccard coefficient on word sets
 */
function calculateTextSimilarity(text1: string, text2: string): number {
    const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, '');
    const words1 = new Set(normalize(text1).split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(normalize(text2).split(/\s+/).filter(w => w.length > 3));

    if (words1.size === 0 || words2.size === 0) return 0;

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
}

/**
 * Find similar text segments across documents
 */
function findSimilarities(documents: DocumentPane[]): Map<string, { docIndex: number; similarity: number }[]> {
    const similarities = new Map<string, { docIndex: number; similarity: number }[]>();

    for (let i = 0; i < documents.length; i++) {
        for (let j = i + 1; j < documents.length; j++) {
            const sim = calculateTextSimilarity(documents[i].content, documents[j].content);
            if (sim > 0.2) {
                const key = `${i}-${j}`;
                similarities.set(key, [
                    { docIndex: i, similarity: sim },
                    { docIndex: j, similarity: sim }
                ]);
            }
        }
    }

    return similarities;
}

// ==================== DOCUMENT PANE COMPONENT ====================

interface DocumentPaneProps {
    document: DocumentPane;
    index: number;
    totalDocs: number;
    isExpanded: boolean;
    isSyncScrollEnabled: boolean;
    scrollPosition: number;
    onExpand: () => void;
    onClose?: () => void;
    onScroll: (scrollTop: number) => void;
    onBlockClick?: (blockId: string) => void;
    similarityHighlights: Map<string, number>;
}

function DocumentPaneComponent({
    document,
    index,
    totalDocs,
    isExpanded,
    isSyncScrollEnabled,
    scrollPosition,
    onExpand,
    onClose,
    onScroll,
    onBlockClick,
    similarityHighlights,
}: DocumentPaneProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const isScrollingRef = useRef(false);

    const colorInfo = DOCUMENT_COLORS.find(c => c.value === document.color) || DOCUMENT_COLORS[index % DOCUMENT_COLORS.length];

    // Sync scroll position
    useEffect(() => {
        if (isSyncScrollEnabled && scrollContainerRef.current && !isScrollingRef.current) {
            scrollContainerRef.current.scrollTop = scrollPosition;
        }
    }, [scrollPosition, isSyncScrollEnabled]);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        if (isSyncScrollEnabled) {
            isScrollingRef.current = true;
            onScroll((e.target as HTMLDivElement).scrollTop);
            setTimeout(() => { isScrollingRef.current = false; }, 50);
        }
    }, [isSyncScrollEnabled, onScroll]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
                opacity: 1,
                scale: 1,
                flex: isExpanded ? '1 1 100%' : `1 1 ${100 / totalDocs}%`
            }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={cn(
                "flex flex-col min-w-0 bg-card rounded-xl overflow-hidden",
                "border-2 transition-all duration-300",
                isExpanded && "shadow-2xl z-10"
            )}
            style={{ borderColor: document.color }}
        >
            {/* Header */}
            <div
                className={cn(
                    "h-12 flex items-center justify-between px-3 shrink-0",
                    "border-b transition-colors"
                )}
                style={{
                    backgroundColor: `${document.color}10`,
                    borderColor: `${document.color}30`
                }}
            >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: document.color }}
                    />
                    <span className="text-sm font-semibold text-foreground truncate">
                        {document.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        Doc {index + 1}
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={onExpand}
                        className="p-1.5 hover:bg-accent rounded-md transition-colors"
                        title={isExpanded ? "Restaurar" : "Expandir"}
                    >
                        {isExpanded ? (
                            <Minimize2 className="w-4 h-4 text-muted-foreground" />
                        ) : (
                            <Focus className="w-4 h-4 text-muted-foreground" />
                        )}
                    </button>
                    {onClose && totalDocs > 2 && (
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-md transition-colors"
                            title="Cerrar documento"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-4 prose prose-sm dark:prose-invert max-w-none"
                onScroll={handleScroll}
            >
                {document.blocks && document.blocks.length > 0 ? (
                    <div className="space-y-3">
                        {document.blocks.map((block) => {
                            const similarity = similarityHighlights.get(block.id) || 0;
                            return (
                                <div
                                    key={block.id}
                                    onClick={() => onBlockClick?.(block.id)}
                                    className={cn(
                                        "p-3 rounded-lg border cursor-pointer transition-all",
                                        "hover:shadow-md",
                                        similarity > 0.7 && "bg-gray-100 dark:bg-gray-800 border-gray-400",
                                        similarity > 0.4 && similarity <= 0.7 && "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400",
                                        similarity <= 0.4 && similarity > 0.2 && "bg-green-50 dark:bg-green-900/20 border-green-400",
                                        similarity <= 0.2 && "border-border"
                                    )}
                                >
                                    <h4 className="font-medium text-sm mb-1">{block.title}</h4>
                                    <p className="text-xs text-muted-foreground line-clamp-3">
                                        {block.content}
                                    </p>
                                    {similarity > 0.2 && (
                                        <div className="mt-2 text-xs font-mono opacity-70">
                                            Similitud: {Math.round(similarity * 100)}%
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div
                        className="whitespace-pre-wrap text-sm"
                        dangerouslySetInnerHTML={{ __html: document.content }}
                    />
                )}
            </div>
        </motion.div>
    );
}

// ==================== MAIN COMPONENT ====================

export function MultiDocSplitView({
    documents: initialDocuments,
    onClose,
    onDocumentChange,
    onBlockClick,
}: MultiDocSplitViewProps) {
    const [documents, setDocuments] = useState<DocumentPane[]>(initialDocuments);
    const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
    const [isSyncScrollEnabled, setIsSyncScrollEnabled] = useState(true);
    const [scrollPosition, setScrollPosition] = useState(0);
    const [showColorPicker, setShowColorPicker] = useState<string | null>(null);

    // Calculate column layout based on screen size and document count
    const getGridClass = () => {
        const count = documents.length;
        if (expandedDocId) return 'grid-cols-1';
        if (count === 2) return 'grid-cols-1 md:grid-cols-2';
        if (count === 3) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
    };

    // Calculate similarity highlights across all documents
    const similarityHighlights = React.useMemo(() => {
        const highlights = new Map<string, number>();

        // For each document, compare its blocks with all other documents' blocks
        documents.forEach((doc, docIndex) => {
            doc.blocks?.forEach(block => {
                let maxSimilarity = 0;
                documents.forEach((otherDoc, otherIndex) => {
                    if (docIndex !== otherIndex) {
                        otherDoc.blocks?.forEach(otherBlock => {
                            const sim = calculateTextSimilarity(block.content, otherBlock.content);
                            maxSimilarity = Math.max(maxSimilarity, sim);
                        });
                    }
                });
                highlights.set(block.id, maxSimilarity);
            });
        });

        return highlights;
    }, [documents]);

    const handleExpand = (docId: string) => {
        setExpandedDocId(prev => prev === docId ? null : docId);
    };

    const handleRemoveDoc = (docId: string) => {
        setDocuments(prev => prev.filter(d => d.id !== docId));
    };

    const handleColorChange = (docId: string, color: string) => {
        setDocuments(prev => prev.map(d =>
            d.id === docId ? { ...d, color } : d
        ));
        onDocumentChange?.(docId, { color });
        setShowColorPicker(null);
    };

    const handleScroll = useCallback((scrollTop: number) => {
        setScrollPosition(scrollTop);
    }, []);

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Toolbar */}
            <div className="h-14 border-b border-border bg-muted/30 flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Grid3X3 className="w-5 h-5 text-primary" />
                        <h2 className="font-semibold text-sm">
                            Vista Multi-Documento
                            <span className="ml-2 text-xs text-muted-foreground">
                                ({documents.length} documentos)
                            </span>
                        </h2>
                    </div>

                    {/* Sync Scroll Toggle */}
                    <button
                        onClick={() => setIsSyncScrollEnabled(!isSyncScrollEnabled)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                            isSyncScrollEnabled
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground hover:bg-accent"
                        )}
                    >
                        {isSyncScrollEnabled ? (
                            <LinkIcon className="w-3.5 h-3.5" />
                        ) : (
                            <Unlink className="w-3.5 h-3.5" />
                        )}
                        Scroll Sincronizado
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    {/* Color Legend */}
                    <div className="hidden lg:flex items-center gap-3 mr-4 text-xs">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-gray-400" />
                            <span className="text-muted-foreground">Duplicado</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-yellow-400" />
                            <span className="text-muted-foreground">Similar</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-green-400" />
                            <span className="text-muted-foreground">Único</span>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors"
                        title="Cerrar vista multi-documento"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Document Grid */}
            <div className={cn(
                "flex-1 p-4 gap-4 overflow-hidden",
                expandedDocId ? "flex" : "grid",
                getGridClass()
            )}>
                <AnimatePresence mode="popLayout">
                    {documents.map((doc, index) => (
                        <DocumentPaneComponent
                            key={doc.id}
                            document={doc}
                            index={index}
                            totalDocs={documents.length}
                            isExpanded={expandedDocId === doc.id}
                            isSyncScrollEnabled={isSyncScrollEnabled}
                            scrollPosition={scrollPosition}
                            onExpand={() => handleExpand(doc.id)}
                            onClose={documents.length > 2 ? () => handleRemoveDoc(doc.id) : undefined}
                            onScroll={handleScroll}
                            onBlockClick={(blockId) => onBlockClick?.(doc.documentId, blockId)}
                            similarityHighlights={similarityHighlights}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* Quick Actions Bar */}
            <div className="h-12 border-t border-border bg-muted/20 flex items-center justify-center gap-4 px-4">
                {documents.map((doc, index) => (
                    <div key={doc.id} className="relative">
                        <button
                            onClick={() => setShowColorPicker(showColorPicker === doc.id ? null : doc.id)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all",
                                "border hover:shadow-sm"
                            )}
                            style={{ borderColor: doc.color }}
                        >
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: doc.color }}
                            />
                            <span className="truncate max-w-[100px]">{doc.title}</span>
                            <Palette className="w-3 h-3 text-muted-foreground" />
                        </button>

                        {/* Color Picker Dropdown */}
                        {showColorPicker === doc.id && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-popover border border-border rounded-lg shadow-xl z-50">
                                <div className="grid grid-cols-3 gap-1">
                                    {DOCUMENT_COLORS.map((c) => (
                                        <button
                                            key={c.value}
                                            onClick={() => handleColorChange(doc.id, c.value)}
                                            className={cn(
                                                "w-8 h-8 rounded-lg transition-transform hover:scale-110",
                                                doc.color === c.value && "ring-2 ring-offset-2 ring-primary"
                                            )}
                                            style={{ backgroundColor: c.value }}
                                            title={c.name}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default MultiDocSplitView;
