'use client';

import { useState, useEffect } from 'react';
import { Document, DocumentBlock } from '@docnex/shared';
import { listDocuments, listActiveBlocks } from '@/lib/api';
import { Button } from '@/components/ui/UiButton';
import { Card, CardContent } from '@/components/ui/UiCard';
import { ChevronDown, ChevronRight, FileText, Link, ExternalLink, History, Boxes } from 'lucide-react';
import { cn } from '@/lib/utils';

type SupportCategory = 'version' | 'linked_ref' | 'unlinked_ref';

interface SupportDocumentsSectionProps {
    projectId: string;
    onCompare: (block: DocumentBlock) => void;
    activeBlockId?: string;
}

export default function SupportDocumentsSection({ projectId, onCompare, activeBlockId }: SupportDocumentsSectionProps) {
    const [category, setCategory] = useState<SupportCategory>('version');
    const [docs, setDocs] = useState<Document[]>([]);
    const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
    const [blocks, setBlocks] = useState<Record<string, DocumentBlock[]>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadDocs();
    }, [projectId, category]);

    const loadDocs = async () => {
        setLoading(true);
        try {
            const data = await listDocuments(projectId, category);
            setDocs(data);
        } catch (err) {
            console.error('Error loading support docs:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleDoc = async (docId: string) => {
        if (expandedDocId === docId) {
            setExpandedDocId(null);
            return;
        }

        setExpandedDocId(docId);
        if (!blocks[docId]) {
            try {
                const data = await listActiveBlocks(docId);
                setBlocks(prev => ({ ...prev, [docId]: data }));
            } catch (err) {
                console.error('Error loading blocks:', err);
            }
        }
    };

    const categories = [
        { id: 'version', label: 'Versiones', icon: <History className="w-4 h-4" /> },
        { id: 'linked_ref', label: 'Ref. Vinculadas', icon: <Link className="w-4 h-4" /> },
        { id: 'unlinked_ref', label: 'Ref. Externas', icon: <ExternalLink className="w-4 h-4" /> },
    ];

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Category Selector */}
            <div className="flex bg-muted p-1 rounded-lg gap-1">
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setCategory(cat.id as SupportCategory)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all",
                            category === cat.id
                                ? "bg-card text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-black/5"
                        )}
                    >
                        {cat.icon}
                        <span className="hidden sm:inline">{cat.label}</span>
                    </button>
                ))}
            </div>

            {/* Documents List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {loading ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">Cargando documentos...</div>
                ) : docs.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-sm italic border-2 border-dashed border-border rounded-lg">
                        No hay documentos en esta categoría
                    </div>
                ) : (
                    docs.map((doc) => (
                        <div key={doc.id} className="space-y-1">
                            <button
                                onClick={() => toggleDoc(doc.id)}
                                className={cn(
                                    "w-full flex items-center gap-2 p-3 rounded-lg border text-left transition-all",
                                    expandedDocId === doc.id
                                        ? "bg-primary/5 border-primary/20 ring-1 ring-primary/10"
                                        : "bg-card border-border hover:border-primary/30"
                                )}
                            >
                                {expandedDocId === doc.id ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                <FileText className="w-4 h-4 text-primary/60" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate text-foreground">{doc.title}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {new Date(doc.updated_at).toLocaleDateString('es-ES')}
                                    </p>
                                </div>
                            </button>

                            {expandedDocId === doc.id && (
                                <div className="pl-6 space-y-2 mt-2 border-l-2 border-primary/10">
                                    {blocks[doc.id]?.map((block) => (
                                        <Card key={block.id} className="group hover:border-primary/30 transition-all shadow-none bg-muted/30">
                                            <CardContent className="p-3 space-y-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h4 className="text-xs font-semibold text-foreground truncate flex-1">{block.title}</h4>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 px-2 text-[10px] bg-primary/10 hover:bg-primary hover:text-primary-foreground"
                                                        onClick={() => onCompare(block)}
                                                    >
                                                        Comparar
                                                    </Button>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground line-clamp-3 leading-relaxed">
                                                    {block.content}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                    {blocks[doc.id]?.length === 0 && (
                                        <p className="text-[10px] text-muted-foreground italic p-2">Este documento no tiene bloques</p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
