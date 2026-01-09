'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Document, DocumentBlock, Resource, BlockVersion } from '@docnex/shared';
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelRightClose, PanelLeft, PanelRight } from 'lucide-react';
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
    createSubBlock
} from '@/lib/api';

import BlockList from '@/components/blocks/BlockList';
import BlockContentEditor from '@/components/blocks/BlockContentEditor';
import { SidePanel, Section } from '@/components/panels/SidePanel';
import NotesSection from '@/components/panels/NotesSection';
import SupportDocumentsSection from '@/components/panels/SupportDocumentsSection';
import ResourcesSection from '@/components/panels/ResourcesSection';
import HistorySection from '@/components/panels/HistorySection';
import { AIImportWizard } from '@/components/ai-import-wizard';
import NoteDetailsPanel from '@/components/notes/NoteDetailsPanel';
import { BlockComment } from '@docnex/shared';
import { useAutoSnapshot } from '@/hooks/useAutoSnapshot';
import { createSnapshot, getSnapshotDescription } from '@/lib/snapshot-utils';

export default function DocumentEditorPage() {
    const params = useParams();
    const router = useRouter();
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
    const [detailNote, setDetailNote] = useState<BlockComment | null>(null);
    const [detailNoteNumber, setDetailNoteNumber] = useState(0);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [rightPanelWidth, setRightPanelWidth] = useState(320);
    const [isResizing, setIsResizing] = useState(false);

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

    const loadData = useCallback(async () => {
        try {
            const doc = await getDocument(documentId);
            setDocument(doc);

            if (doc) {
                const [blks, res] = await Promise.all([
                    listActiveBlocks(documentId),
                    listResources(doc.project_id)
                ]);
                setBlocks(blks);
                setResources(res);

                // Select first block if none selected
                if (!selectedBlockId && blks.length > 0) {
                    setSelectedBlockId(blks[0].id);
                }
            }
        } catch (err) {
            console.error('Load failed:', err);
        } finally {
            setLoading(false);
        }
    }, [documentId, selectedBlockId]);

    useEffect(() => {
        if (documentId) {
            loadData();
        }
    }, [documentId, loadData]);


    const [showAIWizard, setShowAIWizard] = useState(false);
    // saving state is already defined above

    const handleAddBlock = async () => {
        const maxOrder = blocks.length > 0 ? Math.max(...blocks.map(b => b.order_index)) : 0;
        const newBlock = await createBlock(documentId, '', maxOrder + 1, 'New Block');
        if (newBlock) {
            await loadData();
            setSelectedBlockId(newBlock.id);
        }
    };

    const handleReorder = async (orderedIds: string[]) => {
        // Optimistic update
        const reorderedBlocks = orderedIds
            .map(id => blocks.find(b => b.id === id))
            .filter(Boolean) as DocumentBlock[];
        setBlocks(reorderedBlocks);

        // Persist
        await reorderBlocks(documentId, orderedIds);
    };

    const handleBlockAction = async (blockId: string | string[], action: string) => {
        // Handle bulk operations
        if (Array.isArray(blockId)) {
            const blockIds = blockId;

            switch (action) {
                case 'bulk-delete':
                    if (confirm(`¿Eliminar ${blockIds.length} bloques seleccionados?`)) {
                        // Create snapshot before deletion
                        const description = getSnapshotDescription('pre_delete', { count: blockIds.length });
                        await createSnapshot(documentId, description, blocks, 'pre_delete');

                        // Delete all selected blocks
                        for (const id of blockIds) {
                            await softDeleteBlock(id);
                        }
                        // Clear selection and reload
                        if (blockIds.includes(selectedBlockId || '')) {
                            const remainingBlocks = blocks.filter(b => !blockIds.includes(b.id));
                            setSelectedBlockId(remainingBlocks[0]?.id || null);
                        }
                        await loadData();
                    }
                    break;

                case 'bulk-merge':
                    if (confirm(`¿Fusionar ${blockIds.length} bloques seleccionados?`)) {
                        // Create snapshot before merge
                        const description = getSnapshotDescription('pre_merge', { count: blockIds.length });
                        await createSnapshot(documentId, description, blocks, 'pre_merge');

                        // Sort blocks by order_index to merge in correct order
                        const blocksToMerge = blocks
                            .filter(b => blockIds.includes(b.id))
                            .sort((a, b) => a.order_index - b.order_index);

                        if (blocksToMerge.length > 1) {
                            const firstBlock = blocksToMerge[0];
                            const restBlocks = blocksToMerge.slice(1);

                            // Merge all into the first block
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

        // Handle single block operations
        const blockIndex = blocks.findIndex(b => b.id === blockId);

        switch (action) {
            case 'rename':
                setSelectedBlockId(blockId);
                // Focus handled by BlockContentEditor
                break;

            case 'duplicate':
                const dup = await duplicateBlock(blockId);
                if (dup) {
                    await loadData();
                    setSelectedBlockId(dup.id);
                }
                break;

            case 'delete':
                if (confirm('Move this block to trash?')) {
                    await softDeleteBlock(blockId);
                    if (selectedBlockId === blockId) {
                        const nextBlock = blocks[blockIndex + 1] || blocks[blockIndex - 1];
                        setSelectedBlockId(nextBlock?.id || null);
                    }
                    await loadData();
                }
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

            case 'split':
                // Will be handled by BlockContentEditor with selection
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
            alert('Select a block first');
            return;
        }
        await createLink(selectedBlockId, resourceId, extractId);
        loadData();
    };

    const handleDeleteDocument = async () => {
        if (confirm('Delete this entire document? This cannot be undone.')) {
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
                    <Link href="/documents" className="text-muted-foreground hover:text-foreground transition-colors">
                        ← Volver
                    </Link>
                    <h1 className="font-semibold text-foreground">{document.title}</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAIWizard(true)}
                        className="text-sm font-medium text-primary hover:opacity-90 flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-md hover:bg-primary/20 transition-all"
                    >
                        ✨ AI Import
                    </button>
                    <div className="text-sm text-muted-foreground">
                        {saving ? 'Guardando...' : 'Guardado'}
                    </div>
                </div>
            </div>

            {/* Main Layout */}
            <div className="flex-1 flex overflow-hidden relative">
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

                {/* Left Toggle Button (Hidden when expanded) */}
                {leftPanelCollapsed && (
                    <button
                        onClick={() => setLeftPanelCollapsed(false)}
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-40 bg-card border border-border border-l-0 rounded-r-md p-1 shadow-sm hover:text-primary transition-all"
                        title="Expandir Bloques"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                )}


                {/* Center: Editor */}
                <div className="flex-1 bg-background overflow-hidden flex flex-col h-full">
                    {selectedBlock ? (
                        <BlockContentEditor
                            block={selectedBlock}
                            resources={resources}
                            onUpdate={loadData}
                            onSplit={handleSplit}
                            onCreateBlock={handleCreateBlockFromSelection}
                            comparingItem={comparingItem}
                            onCloseCompare={() => setComparingItem(null)}
                            onVersionUpdated={handleDataRefresh}
                            onNoteCreated={handleDataRefresh}
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground italic">
                            {blocks.length === 0
                                ? 'Crea un bloque para comenzar'
                                : 'Selecciona un bloque para editar'
                            }
                        </div>
                    )}
                </div>

                {/* Right: Side Panel with sections */}
                <div
                    style={{ width: rightPanelCollapsed ? 0 : rightPanelWidth }}
                    className={`shrink-0 h-full relative ${rightPanelCollapsed ? 'overflow-hidden' : 'border-l border-border'} ${isResizing ? '' : 'transition-[width] duration-300'}`}
                >
                    {!rightPanelCollapsed && (
                        <>
                            {/* Resizer Handle */}
                            <div
                                onMouseDown={handleMouseDown}
                                className={`absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-50 transition-colors ${isResizing ? 'bg-primary' : 'hover:bg-primary/30'}`}
                            />

                            <button
                                onClick={() => setRightPanelCollapsed(true)}
                                className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 z-40 bg-card border border-border border-r-0 rounded-l-md p-1 shadow-sm hover:text-primary transition-all mr-0"
                                title="Contraer Apoyo"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
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

                                <Section title="Documentos de Apoyo" icon="📂" defaultOpen={true}>
                                    <SupportDocumentsSection
                                        projectId={document.project_id}
                                        activeBlockId={selectedBlockId || undefined}
                                        onCompare={handleCompare}
                                    />
                                </Section>

                                <Section title="Recursos" icon="📎" count={resources.length}>
                                    <ResourcesSection
                                        projectId={document.project_id}
                                        resources={resources}
                                        onResourcesChange={loadData}
                                        onLinkResource={handleLinkResource} // Kept this from original
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
                                onUpdate={() => {
                                    handleDataRefresh();
                                    // Also refresh local notes in the section if needed
                                    // NoteDetailsPanel just tells us something updated
                                }}
                            />
                        </>
                    )}
                </div>

                {/* Right Toggle Button (Hidden when expanded) */}
                {rightPanelCollapsed && (
                    <button
                        onClick={() => setRightPanelCollapsed(false)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-40 bg-card border border-border border-r-0 rounded-l-md p-1 shadow-sm hover:text-primary transition-all"
                        title="Expandir Apoyo"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}
