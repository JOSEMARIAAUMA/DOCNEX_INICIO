'use client';

import { useState, useEffect, useCallback } from 'react';
import { Document, DocumentBlock, SemanticLink } from '@docnex/shared';
import { listDocuments, listActiveBlocks, listSemanticLinksByBlock, getBacklinksByBlock, getBlock } from '@/lib/api';
import { Button } from '@/components/ui/UiButton';
import { Card, CardContent } from '@/components/ui/UiCard';
import { ChevronDown, ChevronRight, FileText, Link as LinkIcon, ExternalLink, History, Network, ArrowRightLeft, Quote, Boxes, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import KnowledgeGraph from '@/components/visual/KnowledgeGraph';
import { transformToLocalGraph } from '@/lib/visual/graph-adapter';

type SupportCategory = 'network' | 'visual' | 'version' | 'linked_ref' | 'unlinked_ref';

interface SupportDocumentsSectionProps {
    projectId: string;
    onCompare: (block: DocumentBlock) => void;
    activeBlockId?: string;
}

interface NetworkConnection {
    link: SemanticLink;
    targetBlock?: DocumentBlock;
    sourceBlock?: DocumentBlock;
}

export default function SupportDocumentsSection({ projectId, onCompare, activeBlockId }: SupportDocumentsSectionProps) {
    const [category, setCategory] = useState<SupportCategory>('network');
    const [docs, setDocs] = useState<Document[]>([]);
    const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
    const [blocks, setBlocks] = useState<Record<string, DocumentBlock[]>>({});
    const [loading, setLoading] = useState(false);

    // Semantic Network state
    const [linkedRefs, setLinkedRefs] = useState<NetworkConnection[]>([]);
    const [unlinkedRefs, setUnlinkedRefs] = useState<NetworkConnection[]>([]);
    const [backlinks, setBacklinks] = useState<NetworkConnection[]>([]);

    // Graph state
    const [activeBlockTitle, setActiveBlockTitle] = useState('Bloque Activo');

    const loadNetwork = useCallback(async () => {
        if (!activeBlockId) return;
        setLoading(true);
        try {
            // Fetch current block title if needed
            getBlock(activeBlockId).then(b => setActiveBlockTitle(b.title)).catch(() => setActiveBlockTitle('Bloque Activo'));

            // 1. Fetch Outgoing Links (Linked & Unlinked)
            const outgoing = await listSemanticLinksByBlock(activeBlockId);

            // 2. Fetch Incoming Links (Backlinks)
            const incoming = await getBacklinksByBlock(activeBlockId);

            // 3. Resolve block data for all connections
            const resolveConnections = async (links: SemanticLink[], isOutgoing: boolean) => {
                return Promise.all(links.map(async link => {
                    const blockId = isOutgoing ? link.target_block_id : link.source_block_id;
                    if (!blockId) return { link };
                    try {
                        const blockData = await getBlock(blockId);
                        return {
                            link,
                            targetBlock: isOutgoing ? blockData : undefined,
                            sourceBlock: !isOutgoing ? blockData : undefined
                        };
                    } catch (e) {
                        return { link };
                    }
                }));
            };

            const resolvedOutgoing = await resolveConnections(outgoing, true);
            const resolvedIncoming = await resolveConnections(incoming, false);

            setLinkedRefs(resolvedOutgoing.filter(c => c.link.link_type === 'manual_ref'));
            // Include tag_similarity in unlinked refs (auto connections)
            setUnlinkedRefs(resolvedOutgoing.filter(c => c.link.link_type === 'auto_mention' || c.link.link_type === 'tag_similarity'));
            setBacklinks(resolvedIncoming);

        } catch (err) {
            console.error('Error loading semantic network:', err);
        } finally {
            setLoading(false);
        }
    }, [activeBlockId]);

    const loadDocs = useCallback(async () => {
        setLoading(true);
        try {
            const data = await listDocuments(projectId, category === 'network' || category === 'visual' ? 'main' : category);
            setDocs(data);
        } catch (err) {
            console.error('Error loading support docs:', err);
        } finally {
            setLoading(false);
        }
    }, [projectId, category]);

    useEffect(() => {
        if (category === 'network' || category === 'visual') {
            loadNetwork();
        } else {
            loadDocs();
        }
    }, [projectId, category, activeBlockId, loadNetwork, loadDocs]);


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
        { id: 'network', label: 'Lista', icon: <Network className="w-4 h-4" /> },
        { id: 'visual', label: 'Grafo', icon: <Share2 className="w-4 h-4" /> },
        { id: 'version', label: 'Hist.', icon: <History className="w-4 h-4" /> },
        { id: 'linked_ref', label: 'Docs', icon: <LinkIcon className="w-4 h-4" /> },
        { id: 'unlinked_ref', label: 'Ext.', icon: <ExternalLink className="w-4 h-4" /> },
    ];

    const renderNetworkItem = (connection: NetworkConnection, type: 'outgoing' | 'incoming') => {
        const block = type === 'outgoing' ? connection.targetBlock : connection.sourceBlock;
        if (!block) return null;

        const isTagConnection = connection.link.link_type === 'tag_similarity';
        const commonTags = connection.link.metadata?.common_tags;

        return (
            <Card key={connection.link.id} className="group hover:border-primary/30 transition-all shadow-none bg-muted/30 border-dashed">
                <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <h4 className="text-[11px] font-bold text-foreground truncate">{block.title}</h4>
                            <p className="text-[9px] text-muted-foreground uppercase tracking-tighter">
                                {type === 'outgoing'
                                    ? (isTagConnection ? 'Relacionado por etiquetas' : 'Mencionado en este bloque')
                                    : 'Menciona este bloque'}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] bg-primary/10 hover:bg-primary hover:text-primary-foreground"
                            onClick={() => onCompare(block)}
                        >
                            Ver
                        </Button>
                    </div>

                    {/* Context or Tags Display */}
                    {connection.link.metadata?.context && !isTagConnection && (
                        <div className="text-[10px] text-muted-foreground bg-card/50 p-2 rounded border border-border/50 italic flex gap-2">
                            <Quote className="w-3 h-3 shrink-0 text-primary/40" />
                            <span className="line-clamp-2">{connection.link.metadata.context}</span>
                        </div>
                    )}

                    {isTagConnection && commonTags && commonTags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {commonTags.map((tag: string) => (
                                <span key={tag} className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    const graphData = activeBlockId
        ? transformToLocalGraph(activeBlockId, activeBlockTitle, { linked: linkedRefs, unlinked: unlinkedRefs, backlinks: backlinks })
        : { nodes: [], links: [] };

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Category Selector */}
            <div className="flex bg-muted p-1 rounded-lg gap-1 overflow-x-auto custom-scrollbar">
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setCategory(cat.id as SupportCategory)}
                        className={cn(
                            "flex-1 min-w-[60px] flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all leading-none whitespace-nowrap",
                            category === cat.id
                                ? "bg-card text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-black/5"
                        )}
                        title={cat.label}
                    >
                        {cat.icon}
                        <span className="hidden xl:inline ml-1">{cat.label}</span>
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar relative">
                {loading ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">Cargando...</div>
                ) : category === 'visual' ? (
                    !activeBlockId ? (
                        <div className="py-8 text-center text-muted-foreground text-xs italic">
                            Selecciona un bloque para visualizar su grafo
                        </div>
                    ) : (
                        <div className="h-[400px] border border-border rounded-xl shadow-inner bg-card overflow-hidden">
                            <KnowledgeGraph
                                data={graphData}
                                onNodeClick={(node) => {
                                    if (node.type === 'block' && node.data) {
                                        onCompare(node.data);
                                    }
                                }}
                            />
                            <div className="p-2 text-[10px] text-muted-foreground text-center bg-muted/50 border-t border-border">
                                Nodos: {graphData.nodes.length} | Conexiones: {graphData.links.length}
                            </div>
                        </div>
                    )
                ) : category === 'network' ? (
                    !activeBlockId ? (
                        <div className="py-8 text-center text-muted-foreground text-xs italic">
                            Selecciona un bloque para ver su red semántica
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Linked References */}
                            <div className="space-y-2">
                                <h3 className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2 px-1">
                                    <LinkIcon className="w-3 h-3" /> Referencias Vinculadas ({linkedRefs.length})
                                </h3>
                                {linkedRefs.length === 0 ? (
                                    <p className="text-[10px] text-muted-foreground italic px-3">Sin enlaces manuales</p>
                                ) : (
                                    linkedRefs.map(c => renderNetworkItem(c, 'outgoing'))
                                )}
                            </div>

                            {/* Unlinked References (Now Auto Connections) */}
                            <div className="space-y-2">
                                <h3 className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2 px-1">
                                    <Network className="w-3 h-3" /> Conexiones Automáticas ({unlinkedRefs.length})
                                </h3>
                                {unlinkedRefs.length === 0 ? (
                                    <p className="text-[10px] text-muted-foreground italic px-3">No hay conexiones detectadas</p>
                                ) : (
                                    unlinkedRefs.map(c => renderNetworkItem(c, 'outgoing'))
                                )}
                            </div>

                            {/* Backlinks */}
                            <div className="space-y-2">
                                <h3 className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2 px-1">
                                    <Boxes className="w-3 h-3" /> Backlinks ({backlinks.length})
                                </h3>
                                {backlinks.length === 0 ? (
                                    <p className="text-[10px] text-muted-foreground italic px-3">Nadie menciona este bloque aún</p>
                                ) : (
                                    backlinks.map(c => renderNetworkItem(c, 'incoming'))
                                )}
                            </div>
                        </div>
                    )
                ) : (
                    /* Legacy Document View */
                    docs.length === 0 ? (
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
                    )
                )}
            </div>
        </div>
    );
}
