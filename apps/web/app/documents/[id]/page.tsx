'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Document, DocumentBlock, Resource, BlockVersion } from '@docnex/shared';
import { ChevronLeft, ChevronRight, Search, Wand2, Eye, X, MessageSquare, Sparkles, CheckCircle2 } from 'lucide-react';
import {
    getDocument,
    listActiveBlocks,
    listResources,
    createBlock,
    reorderBlocks,
    duplicateBlock,
    mergeBlocks,
    splitBlock,
    softDeleteBlock,
    deleteDocument,
    createLink,
    createSubBlock,
    createBlockVersion,
    updateBlock,
    updateBlockTitle,
    resolveBlockComment,
    listSemanticLinks,
    listDocumentComments
} from '@/lib/api';

import BlockList from '@/components/blocks/BlockList';
import BlockContentEditor from '@/components/blocks/BlockContentEditor';
import { SidePanel, Section } from '@/components/panels/SidePanel';
import NotesSection from '@/components/panels/NotesSection';
import SupportDocumentsSection from '@/components/panels/SupportDocumentsSection';
import ResourcesSection from '@/components/panels/ResourcesSection';
import HistorySection from '@/components/panels/HistorySection';
import VersionsSection from '@/components/panels/VersionsSection';
import { AIImportWizard } from '@/components/ai-import-wizard';
import NoteDetailsPanel from '@/components/notes/NoteDetailsPanel';
const SemanticGraph = dynamic(() => import('@/components/graph/SemanticGraph'), { ssr: false });
import { BlockComment } from '@docnex/shared';
import { useAutoSnapshot } from '@/hooks/useAutoSnapshot';
import { createSnapshot, getSnapshotDescription } from '@/lib/snapshot-utils';
import { useSplitView } from '@/hooks/useSplitView';
import { SplitViewContainer } from '@/components/editor/SplitViewContainer';
import { ResourceIntegratedViewer } from '@/components/resources/ResourceIntegratedViewer';
import { LucideEye } from 'lucide-react';

export default function DocumentEditorPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const documentId = params?.id as string;

    const [document, setDocument] = useState<Document | null>(null);
    const [blocks, setBlocks] = useState<DocumentBlock[]>([]);
    const [resources, setResources] = useState<Resource[]>([]);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [comparingItem, setComparingItem] = useState<{ id: string, title: string, content: string, label: string } | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
    const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [semanticLinks, setSemanticLinks] = useState<any[]>([]);
    const [showGraph, setShowGraph] = useState(false);
    const [allNotes, setAllNotes] = useState<any[]>([]);
    const [detailNote, setDetailNote] = useState<BlockComment | null>(null);
    const [detailNoteNumber, setDetailNoteNumber] = useState(0);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [rightPanelWidth, setRightPanelWidth] = useState(320);
    const [isResizing, setIsResizing] = useState(false);
    const splitView = useSplitView();

    // Auto-snapshot hook
    const { isSaving: isSavingSnapshot } = useAutoSnapshot({
        documentId,
        blocks,
        enabled: !loading && blocks.length > 0,
    });

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsResizing(true);
        e.preventDefault();
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth > 200 && newWidth < 800) {
                setRightPanelWidth(newWidth);
            }
        };
        const handleMouseUp = () => setIsResizing(false);

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    const selectedBlock = blocks.find(b => b.id === selectedBlockId) || null;

    useEffect(() => {
        if (searchParams.get('graph') === 'true') {
            setShowGraph(true);
        }
    }, [searchParams]);

    const loadData = useCallback(async () => {
        try {
            const doc = await getDocument(documentId);
            setDocument(doc);

            if (doc) {
                // Fetch blocks first
                try {
                    const blks = await listActiveBlocks(documentId);
                    setBlocks(blks);

                    if (blks.length > 0) {
                        setSelectedBlockId(prev => prev || blks[0].id);
                    }
                } catch (blockErr) {
                    console.error('Error loading blocks:', blockErr);
                }

                // Fetch resources separately
                try {
                    const res = await listResources(doc.project_id, documentId);
                    setResources(res);
                } catch (resErr) {
                    console.error('Error loading resources:', resErr);
                    setResources([]);
                }

                // Fetch Semantic Links
                try {
                    const links = await listSemanticLinks(documentId);
                    setSemanticLinks(links);
                } catch (linkErr) {
                    console.error('Error loading links:', linkErr);
                }

                // Fetch All Notes for Graph
                try {
                    const notes = await listDocumentComments(documentId);
                    setAllNotes(notes);
                } catch (noteErr) {
                    console.error('Error loading all notes:', noteErr);
                }
            }
        } catch (err) {
            console.error('Load failed:', err);
        } finally {
            setLoading(false);
        }
    }, [documentId]);

    useEffect(() => {
        if (documentId) {
            setBlocks([]);
            setResources([]);
            setSelectedBlockId(null);
            loadData();
        }
    }, [documentId, loadData]);


    const [showAIWizard, setShowAIWizard] = useState(false);

    const handleAddBlock = async () => {
        const maxOrder = blocks.length > 0 ? Math.max(...blocks.map(b => b.order_index)) : 0;
        const newBlock = await createBlock(documentId, '', maxOrder + 1, 'Nuevo Bloque');
        if (newBlock) {
            await loadData();
            setSelectedBlockId(newBlock.id);
        }
    };

    const handleReorder = async (orderedIds: string[]) => {
        const reorderedBlocks = orderedIds
            .map(id => blocks.find(b => b.id === id))
            .filter(Boolean) as DocumentBlock[];
        setBlocks(reorderedBlocks);
        await reorderBlocks(documentId, orderedIds);
    };

    const handleBlockAction = async (blockId: string | string[], action: string) => {
        if (Array.isArray(blockId)) {
            const blockIds = blockId;
            switch (action) {
                case 'bulk-delete':
                    if (confirm(`¿Eliminar ${blockIds.length} bloques seleccionados?`)) {
                        const description = getSnapshotDescription('pre_delete', { count: blockIds.length });
                        await createSnapshot(documentId, description, blocks, 'pre_delete');
                        for (const id of blockIds) {
                            await softDeleteBlock(id);
                        }
                        if (blockIds.includes(selectedBlockId || '')) {
                            const remainingBlocks = blocks.filter(b => !blockIds.includes(b.id));
                            setSelectedBlockId(remainingBlocks[0]?.id || null);
                        }
                        await loadData();
                    }
                    break;

                case 'bulk-merge':
                    if (confirm(`¿Fusionar ${blockIds.length} bloques seleccionados?`)) {
                        const description = getSnapshotDescription('pre_merge', { count: blockIds.length });
                        await createSnapshot(documentId, description, blocks, 'pre_merge');
                        const blocksToMerge = blocks
                            .filter(b => blockIds.includes(b.id))
                            .sort((a, b) => a.order_index - b.order_index);

                        if (blocksToMerge.length > 1) {
                            const firstBlock = blocksToMerge[0];
                            const restBlocks = blocksToMerge.slice(1);
                            for (const block of restBlocks) {
                                await mergeBlocks(firstBlock.id, block.id);
                            }
                            setSelectedBlockId(firstBlock.id);
                            await loadData();
                        }
                    }
                    break;
            }
            return;
        }

        const blockIndex = blocks.findIndex(b => b.id === blockId);
        switch (action) {
            case 'rename':
                setSelectedBlockId(blockId);
                break;
            case 'duplicate':
                const dup = await duplicateBlock(blockId);
                if (dup) {
                    await loadData();
                    setSelectedBlockId(dup.id);
                }
                break;
            case 'delete':
                await softDeleteBlock(blockId);
                if (selectedBlockId === blockId) {
                    const nextBlock = blocks[blockIndex + 1] || blocks[blockIndex - 1];
                    setSelectedBlockId(nextBlock?.id || null);
                }
                await loadData();
                break;
            case 'merge-prev':
                if (blockIndex > 0) {
                    const prevBlock = blocks[blockIndex - 1];
                    await mergeBlocks(prevBlock.id, blockId);
                    setSelectedBlockId(prevBlock.id);
                    await loadData();
                }
                break;
            case 'merge-next':
                if (blockIndex < blocks.length - 1) {
                    const nextBlock = blocks[blockIndex + 1];
                    await mergeBlocks(blockId, nextBlock.id);
                    await loadData();
                }
                break;
            case 'add-subblock':
                const sub = await createSubBlock(documentId, blockId, '', blockIndex + 1);
                if (sub) {
                    await loadData();
                    setSelectedBlockId(sub.id);
                }
                break;
            case 'save-version':
                const blockToSave = blocks.find(b => b.id === blockId);
                if (blockToSave) {
                    try {
                        await createBlockVersion(blockToSave);
                        setSelectedBlockId(blockId);
                        await loadData();
                        handleDataRefresh();
                        alert('✅ Versión guardada exitosamente');
                    } catch (error) {
                        console.error('Error al crear versión del bloque:', error);
                        alert('❌ Error al guardar versión');
                    }
                }
                break;
            case 'side-panel':
                const blockToView = blocks.find(b => b.id === blockId);
                if (blockToView) {
                    splitView.openSplitView({
                        type: 'block',
                        id: blockToView.id,
                        title: blockToView.title,
                        content: blockToView.content
                    });
                }
                break;
        }
    };

    const handleSplit = async (splitIndex: number) => {
        if (!selectedBlockId) return;
        const newBlock = await splitBlock(selectedBlockId, splitIndex);
        if (newBlock) {
            await loadData();
            setSelectedBlockId(newBlock.id);
        }
    };

    const handleCreateBlockFromSelection = async (content: string, title: string) => {
        const maxOrder = blocks.length > 0 ? Math.max(...blocks.map(b => b.order_index)) : 0;
        const newBlock = await createBlock(documentId, content, maxOrder + 1, title);
        if (newBlock) {
            await loadData();
            setSelectedBlockId(newBlock.id);
        }
    };

    const handleLinkResource = async (resourceId: string, extractId?: string) => {
        if (!selectedBlockId) {
            alert('Selecciona un bloque primero');
            return;
        }
        await createLink(selectedBlockId, resourceId, extractId);
        loadData();
    };

    const handleDeleteDocument = async () => {
        if (confirm('¿Eliminar documento completo?')) {
            await deleteDocument(documentId);
            router.push('/documents');
        }
    };

    const handleDataRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    const handleCompare = (item: BlockVersion | DocumentBlock) => {
        if ('version_number' in item) {
            setComparingItem({
                id: item.id,
                title: item.title,
                content: item.content,
                label: `VERSIÓN v${item.version_number}`
            });
        } else {
            setComparingItem({
                id: item.id,
                title: item.title,
                content: item.content,
                label: 'REFERENCIA'
            });
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!document) return <div className="h-full flex items-center justify-center bg-background text-foreground">Documento no encontrado</div>;

    return (
        <div className="h-full flex flex-col relative">
            {showAIWizard && (
                <AIImportWizard
                    documentId={documentId}
                    projectId={document.project_id}
                    onClose={() => setShowAIWizard(false)}
                    onSuccess={() => {
                        loadData();
                        setShowAIWizard(false);
                    }}
                />
            )}

            {/* Header */}
            <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-4">
                    <Link
                        href={document.title.startsWith('ESTRATEGIA:') ? "/settings/strategic-analysis" : "/documents"}
                        className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-all"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Link>

                    <div className="flex items-center gap-2 text-sm">
                        <Link
                            href="/documents"
                            className="text-muted-foreground/40 hover:text-primary transition-colors font-medium flex items-center gap-1"
                        >
                            <span className="truncate max-w-[100px]">{(document as any).project?.workspace?.name || 'Espacio'}</span>
                        </Link>
                        <ChevronRight className="w-3 h-3 text-muted-foreground/20" />
                        <Link
                            href="/documents"
                            className="text-muted-foreground/40 hover:text-primary transition-colors font-medium flex items-center gap-1"
                            onClick={() => {
                                localStorage.setItem('lastProjectId', document.project_id);
                            }}
                        >
                            <span className="truncate max-w-[150px]">{(document as any).project?.name || 'Proyecto'}</span>
                        </Link>
                        <ChevronRight className="w-3 h-3 text-muted-foreground/20" />
                        <h1 className="font-bold text-foreground tracking-tight px-2 py-0.5 bg-muted rounded-md border border-border/40">
                            {document.title.replace('ESTRATEGIA: ', '')}
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-muted/20 p-1 rounded-xl border border-border/50 backdrop-blur-md">
                    <button
                        onClick={() => setShowGraph(false)}
                        className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-lg transition-all ${!showGraph ? 'bg-background text-primary shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Editor
                    </button>
                    <button
                        onClick={() => setShowGraph(true)}
                        className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-lg transition-all ${showGraph ? 'bg-background text-primary shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Grafo
                    </button>
                    <Link
                        href={`/documents/${documentId}/view`}
                        className="text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-all"
                    >
                        Lectura
                    </Link>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAIWizard(true)}
                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-90 flex items-center gap-1.5 bg-primary/10 px-4 py-1.5 rounded-xl hover:bg-primary/20 transition-all font-bold"
                    >
                        ✨ AI Import
                    </button>
                    <div className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-tighter">
                        {saving ? 'Sincronizando...' : 'Nube OK'}
                    </div>
                </div>
            </div>

            {/* Main Layout */}
            <div className="flex-1 flex overflow-hidden relative">
                {showGraph ? (
                    <div className="flex-1 flex flex-col animate-in fade-in duration-700 bg-black">
                        <div className="absolute top-8 right-8 z-50">
                            <button
                                onClick={() => setShowGraph(false)}
                                className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-2xl text-white transition-all shadow-2xl group"
                            >
                                <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                            </button>
                        </div>
                        <div className="flex-1">
                            <SemanticGraph
                                blocks={blocks}
                                resources={resources}
                                semanticLinks={semanticLinks}
                                notes={allNotes}
                                onNodeClick={(id) => {
                                    const block = blocks.find(b => b.id === id);
                                    if (block) {
                                        setSelectedBlockId(id);
                                        setShowGraph(false);
                                    }
                                }}
                            />
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Left: Blocks List */}
                        <div className={`border-r border-border bg-muted shrink-0 flex flex-col transition-all duration-300 ${leftPanelCollapsed ? 'w-0 overflow-hidden' : 'w-64'}`}>
                            {!leftPanelCollapsed && (
                                <>
                                    <BlockList
                                        blocks={blocks}
                                        selectedBlockId={selectedBlockId}
                                        onSelectBlock={setSelectedBlockId}
                                        onReorder={handleReorder}
                                        onAddBlock={handleAddBlock}
                                        onBlockAction={handleBlockAction}
                                        onCollapse={() => setLeftPanelCollapsed(true)}
                                    />
                                    <div className="p-4 border-t border-border mt-auto">
                                        <button
                                            onClick={handleAddBlock}
                                            className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all font-medium border border-primary/20 shadow-sm"
                                        >
                                            + Nuevo Bloque
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Left Toggle Button */}
                        {leftPanelCollapsed && (
                            <button
                                onClick={() => setLeftPanelCollapsed(false)}
                                className="absolute left-0 top-1/2 -translate-y-1/2 z-40 bg-card border border-border border-l-0 rounded-r-md p-1 shadow-sm hover:text-primary transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        )}

                        {/* Center: Editor */}
                        <div className="flex-1 bg-background overflow-hidden flex flex-col h-full">
                            <SplitViewContainer
                                isOpen={splitView.isOpen}
                                onClose={splitView.closeSplitView}
                                title={splitView.content?.title}
                                leftContent={
                                    selectedBlock ? (
                                        <BlockContentEditor
                                            block={selectedBlock}
                                            allBlocks={blocks}
                                            resources={resources}
                                            onUpdate={loadData}
                                            onSplit={handleSplit}
                                            onCreateBlock={handleCreateBlockFromSelection}
                                            comparingItem={comparingItem}
                                            onCloseCompare={() => setComparingItem(null)}
                                            onVersionUpdated={handleDataRefresh}
                                            onNoteCreated={handleDataRefresh}
                                            onOpenSidePanel={(content) => {
                                                splitView.openSplitView(content);
                                            }}
                                            refreshTrigger={refreshTrigger}
                                        />
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-muted-foreground italic">
                                            {blocks.length === 0 ? 'Crea un bloque para comenzar' : 'Selecciona un bloque para editar'}
                                        </div>
                                    )
                                }
                                rightContent={
                                    <div className="h-full">
                                        {splitView.content?.type === 'block' && (
                                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                                <h2 className="text-xl font-bold mb-4">{splitView.content.title}</h2>
                                                <div dangerouslySetInnerHTML={{ __html: splitView.content.content || '' }} />
                                            </div>
                                        )}
                                        {splitView.content?.type === 'resource' && (
                                            <ResourceIntegratedViewer
                                                resourceId={splitView.content.id || ''}
                                                title={splitView.content.title || ''}
                                            />
                                        )}
                                    </div>
                                }
                            />
                        </div>

                        {/* Right: Side Panel */}
                        <div
                            style={{ width: rightPanelCollapsed ? 0 : rightPanelWidth }}
                            className={`shrink-0 h-full relative ${rightPanelCollapsed ? 'overflow-hidden' : 'border-l border-border'} ${isResizing ? '' : 'transition-[width] duration-300'}`}
                        >
                            {!rightPanelCollapsed && (
                                <>
                                    <div
                                        onMouseDown={handleMouseDown}
                                        className={`absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-50 transition-colors ${isResizing ? 'bg-primary' : 'hover:bg-primary/30'}`}
                                    />
                                    <SidePanel>
                                        <Section title="Notas" icon="📝" defaultOpen={true}>
                                            <NotesSection
                                                blockId={selectedBlockId}
                                                refreshTrigger={refreshTrigger}
                                                selectedNoteId={selectedNoteId}
                                                onOpenDetail={(note, number) => {
                                                    setDetailNote(note);
                                                    setDetailNoteNumber(number);
                                                    setIsDetailOpen(true);
                                                }}
                                                onNotesUpdated={handleDataRefresh}
                                                onScrollToEditor={(noteId: string) => {
                                                    if (selectedBlockId) {
                                                        const editorEl = typeof window !== 'undefined' ? window.document.getElementById(`editor-${selectedBlockId}`) as any : null;
                                                        if (editorEl?.editorHandle) {
                                                            editorEl.editorHandle.scrollToSelector(`span[data-note-id="${noteId}"]`);
                                                        }
                                                    }
                                                }}
                                            />
                                        </Section>
                                        <Section title="Apoyo" icon="📂" defaultOpen={true}>
                                            <SupportDocumentsSection
                                                projectId={document.project_id}
                                                activeBlockId={selectedBlockId || undefined}
                                                onCompare={(block) => {
                                                    splitView.openSplitView({
                                                        type: 'block',
                                                        id: block.id,
                                                        title: block.title,
                                                        content: block.content
                                                    });
                                                }}
                                            />
                                        </Section>
                                        <Section title="Recursos" icon="📎" count={resources.length}>
                                            <ResourcesSection
                                                projectId={document.project_id}
                                                documentId={documentId}
                                                resources={resources}
                                                onResourcesChange={loadData}
                                                onLinkResource={handleLinkResource}
                                                onOpenResource={(res) => {
                                                    splitView.openSplitView({
                                                        type: 'resource',
                                                        id: res.id,
                                                        title: res.title
                                                    });
                                                }}
                                            />
                                        </Section>
                                        <Section title="Versiones" icon="📸">
                                            <VersionsSection
                                                block={selectedBlock}
                                                onRestore={async (title, content) => {
                                                    if (selectedBlock) {
                                                        await updateBlock(selectedBlock.id, content);
                                                        await updateBlockTitle(selectedBlock.id, title);
                                                        await loadData();
                                                    }
                                                }}
                                                comparingVersionId={comparingItem?.id}
                                                refreshTrigger={refreshTrigger}
                                            />
                                        </Section>
                                        <Section title="Historial" icon="📜">
                                            <HistorySection
                                                documentId={documentId}
                                                onRestore={loadData}
                                                refreshTrigger={refreshTrigger}
                                            />
                                        </Section>
                                    </SidePanel>
                                    <NoteDetailsPanel
                                        isOpen={isDetailOpen}
                                        note={detailNote}
                                        noteNumber={detailNoteNumber}
                                        onClose={() => setIsDetailOpen(false)}
                                        onUpdate={() => handleDataRefresh()}
                                        onApplyDiff={async (noteId, newText) => {
                                            if (!detailNote?.block_id) return;
                                            await createSnapshot(documentId, 'Applied AI Suggestion', blocks, 'manual');
                                            await updateBlock(detailNote.block_id, newText);
                                            await resolveBlockComment(noteId);
                                            await loadData();
                                            handleDataRefresh();
                                        }}
                                    />
                                </>
                            )}
                        </div>

                        {/* Right Toggle Button */}
                        {rightPanelCollapsed && (
                            <button
                                onClick={() => setRightPanelCollapsed(false)}
                                className="absolute right-0 top-1/2 -translate-y-1/2 z-40 bg-card border border-border border-r-0 rounded-l-md p-1 shadow-sm hover:text-primary transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
