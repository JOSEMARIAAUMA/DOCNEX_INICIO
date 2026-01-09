'use client';

import { useState, useMemo } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { PanelLeftClose, ChevronDown, ChevronUp, Trash2, Merge, X, CheckSquare } from 'lucide-react';
import { DocumentBlock } from '@docnex/shared';
import SortableBlockItem from './SortableBlockItem';
import BlockActionsMenu from './BlockActionsMenu';

interface BlockListProps {
    blocks: DocumentBlock[];
    selectedBlockId: string | null;
    onSelectBlock: (blockId: string) => void;
    onReorder: (orderedIds: string[]) => void;
    onAddBlock: () => void;
    onBlockAction: (blockId: string | string[], action: string) => void;
    onCollapse?: () => void;
}

export default function BlockList({
    blocks,
    selectedBlockId,
    onSelectBlock,
    onReorder,
    onAddBlock,
    onBlockAction,
    onCollapse
}: BlockListProps) {
    const [menuBlockId, setMenuBlockId] = useState<string | null>(null);
    const [expandedBlockIds, setExpandedBlockIds] = useState<Set<string>>(new Set());
    const [multiSelectedIds, setMultiSelectedIds] = useState<Set<string>>(new Set());

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Filter visible blocks based on expansion state
    const visibleBlocks = useMemo(() => {
        return blocks.filter(block => {
            if (!block.parent_block_id) return true;
            return expandedBlockIds.has(block.parent_block_id);
        });
    }, [blocks, expandedBlockIds]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const draggedId = active.id as string;
            const targetId = over.id as string;

            // For now, disable multi-drag if multiple blocks are selected
            // Just do normal single-block drag
            const oldIndex = blocks.findIndex(b => b.id === draggedId);
            const newIndex = blocks.findIndex(b => b.id === targetId);
            const newOrder = arrayMove(blocks, oldIndex, newIndex);
            onReorder(newOrder.map(b => b.id));
        }
    };

    const handleMenuAction = (blockId: string, action: string) => {
        if (action === 'menu') {
            setMenuBlockId(menuBlockId === blockId ? null : blockId);
        } else {
            onBlockAction(blockId, action);
            setMenuBlockId(null);
        }
    };

    const toggleExpand = (blockId: string) => {
        setExpandedBlockIds(prev => {
            const next = new Set(prev);
            if (next.has(blockId)) {
                next.delete(blockId);
            } else {
                next.add(blockId);
            }
            return next;
        });
    };

    const expandAll = () => {
        const parentIds = blocks
            .filter(b => blocks.some(child => child.parent_block_id === b.id))
            .map(b => b.id);
        setExpandedBlockIds(new Set(parentIds));
    };

    const collapseAll = () => {
        setExpandedBlockIds(new Set());
    };

    const toggleMultiSelect = (blockId: string) => {
        setMultiSelectedIds(prev => {
            const next = new Set(prev);
            const isCurrentlySelected = next.has(blockId);

            // Find all children of this block (recursively)
            const getAllChildren = (parentId: string): string[] => {
                const directChildren = blocks.filter(b => b.parent_block_id === parentId);
                const allDescendants: string[] = [];
                for (const child of directChildren) {
                    allDescendants.push(child.id);
                    allDescendants.push(...getAllChildren(child.id));
                }
                return allDescendants;
            };

            if (isCurrentlySelected) {
                // Deselect this block and all its children
                next.delete(blockId);
                const children = getAllChildren(blockId);
                children.forEach(childId => next.delete(childId));
            } else {
                // Select this block and all its children
                next.add(blockId);
                const children = getAllChildren(blockId);
                children.forEach(childId => next.add(childId));
            }

            return next;
        });
    };

    const selectAll = () => {
        setMultiSelectedIds(new Set(blocks.map(b => b.id)));
    };

    const deselectAll = () => {
        setMultiSelectedIds(new Set());
    };

    const handleBulkAction = (action: string) => {
        if (multiSelectedIds.size === 0) return;
        const ids = Array.from(multiSelectedIds);
        onBlockAction(ids, action);
        if (action === 'bulk-delete' || action === 'bulk-merge') {
            setMultiSelectedIds(new Set());
        }
    };

    return (
        <div className="h-full flex flex-col bg-muted/30 border-r border-border">
            {/* Bulk Action Bar / Normal Header */}
            {multiSelectedIds.size > 1 ? (
                <div className="p-3 bg-primary text-primary-foreground shadow-lg animate-in slide-in-from-top duration-300">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <CheckSquare className="w-4 h-4" />
                            <span className="text-sm font-bold">{multiSelectedIds.size} seleccionados</span>
                        </div>
                        <button onClick={deselectAll} className="p-1 hover:bg-white/20 rounded">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleBulkAction('bulk-merge')}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-medium transition-colors"
                            title="Fusionar seleccionados"
                        >
                            <Merge className="w-3.5 h-3.5" /> Fusionar
                        </button>
                        <button
                            onClick={() => handleBulkAction('bulk-delete')}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-red-500/80 hover:bg-red-500 rounded text-xs font-medium transition-colors"
                            title="Eliminar seleccionados"
                        >
                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
                        </button>
                    </div>
                </div>
            ) : (
                <div className="p-3 border-b border-border bg-card">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">Bloques</h3>
                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{blocks.length}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={expandAll}
                                className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-primary"
                                title="Expandir todo"
                            >
                                <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                                onClick={collapseAll}
                                className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-primary"
                                title="Contraer todo"
                            >
                                <ChevronUp className="w-4 h-4" />
                            </button>
                            {onCollapse && (
                                <button
                                    onClick={onCollapse}
                                    className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-primary ml-1"
                                    title="Contraer"
                                >
                                    <PanelLeftClose className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onAddBlock}
                            className="flex-1 py-2 px-3 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all font-medium border border-primary/20 shadow-sm"
                        >
                            + Añadir Bloque
                        </button>
                        <button
                            onClick={selectAll}
                            className="px-3 py-2 text-xs bg-muted text-muted-foreground rounded-lg hover:bg-accent transition-all border border-border"
                            title="Seleccionar todo"
                        >
                            <CheckSquare className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Block list with DnD */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={visibleBlocks.map(b => b.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {visibleBlocks.map(block => {
                            const isChild = !!block.parent_block_id;
                            const indentClass = isChild ? 'ml-6' : '';
                            const hasChildren = blocks.some(b => b.parent_block_id === block.id);

                            return (
                                <div key={block.id} className={`relative ${indentClass}`}>
                                    <SortableBlockItem
                                        block={block}
                                        isSelected={block.id === selectedBlockId}
                                        isMultiSelected={multiSelectedIds.has(block.id)}
                                        hasChildren={hasChildren}
                                        isExpanded={expandedBlockIds.has(block.id)}
                                        onClick={() => onSelectBlock(block.id)}
                                        onMenuAction={(action) => handleMenuAction(block.id, action)}
                                        onToggleExpand={() => toggleExpand(block.id)}
                                        onToggleMultiSelect={() => toggleMultiSelect(block.id)}
                                    />
                                    {menuBlockId === block.id && (
                                        <BlockActionsMenu
                                            blockId={block.id}
                                            onAction={(action) => handleMenuAction(block.id, action)}
                                            onClose={() => setMenuBlockId(null)}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </SortableContext>
                </DndContext>

                {visibleBlocks.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-8 italic">
                        {blocks.length === 0 ? 'Sin bloques aún' : 'Todos los bloques están contraídos'}
                    </p>
                )}
            </div>
        </div>
    );
}
