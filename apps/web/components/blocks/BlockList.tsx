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
    const [levelFilter, setLevelFilter] = useState<'all' | 'titulo' | 'capitulo' | 'articulo'>('all');

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Calculate the hierarchy level of a block (0=root, 1=child, 2=grandchild)
    const getBlockLevel = (block: { id: string; parent_block_id: string | null }): number => {
        let level = 0;
        let currentParentId = block.parent_block_id;
        while (currentParentId) {
            level++;
            const parent = blocks.find(b => b.id === currentParentId);
            if (!parent) break;
            currentParentId = parent.parent_block_id;
        }
        return level;
    };

    // Filter blocks by hierarchy level
    const filteredByLevel = useMemo(() => {
        if (levelFilter === 'all') return blocks;
        const targetLevel = { 'titulo': 0, 'capitulo': 1, 'articulo': 2 }[levelFilter];
        return blocks.filter(b => getBlockLevel(b) === targetLevel);
    }, [blocks, levelFilter]);

    // Filter visible blocks based on expansion state
    const visibleBlocks = useMemo(() => {
        return filteredByLevel.filter(block => {
            if (!block.parent_block_id) return true;
            return expandedBlockIds.has(block.parent_block_id);
        });
    }, [filteredByLevel, expandedBlockIds]);

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

    const [isSelectionMode, setIsSelectionMode] = useState(false);

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
        setIsSelectionMode(false);
    };

    const handleBulkAction = (action: string) => {
        if (multiSelectedIds.size === 0) return;
        const ids = Array.from(multiSelectedIds);
        onBlockAction(ids, action);
        if (action === 'bulk-delete' || action === 'bulk-merge') {
            setMultiSelectedIds(new Set());
            setIsSelectionMode(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-muted/30 border-r border-border">
            {/* Bulk Action Bar / Normal Header */}
            {isSelectionMode ? (
                <div className="p-3 bg-primary text-primary-foreground shadow-lg animate-in slide-in-from-top duration-300">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <CheckSquare className="w-4 h-4" />
                            <span className="text-sm font-bold">{multiSelectedIds.size}</span>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={selectAll} className="text-xs underline opacity-80 hover:opacity-100">Todo</button>
                            <span className="opacity-50">/</span>
                            <button onClick={() => setMultiSelectedIds(new Set())} className="text-xs underline opacity-80 hover:opacity-100">Nada</button>
                        </div>
                        <button onClick={deselectAll} className="p-1 hover:bg-white/20 rounded">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleBulkAction('bulk-merge')}
                            disabled={multiSelectedIds.size < 2}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs font-medium transition-colors disabled:opacity-50"
                            title="Fusionar seleccionados"
                        >
                            <Merge className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => handleBulkAction('bulk-delete')}
                            disabled={multiSelectedIds.size === 0}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-red-500/80 hover:bg-red-500 rounded text-xs font-medium transition-colors disabled:opacity-50"
                            title="Eliminar seleccionados"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
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

                    {/* Level Filter Dropdown */}
                    <div className="mb-3">
                        <select
                            value={levelFilter}
                            onChange={(e) => setLevelFilter(e.target.value as any)}
                            className="w-full text-xs bg-muted border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                            <option value="all">📋 Todos los niveles</option>
                            <option value="titulo">🏛️ Solo Títulos (Nivel 0)</option>
                            <option value="capitulo">📖 Solo Capítulos (Nivel 1)</option>
                            <option value="articulo">📄 Solo Artículos (Nivel 2)</option>
                        </select>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={onAddBlock}
                            className="flex-1 py-2 px-3 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all font-medium border border-primary/20 shadow-sm"
                        >
                            + Bloque
                        </button>
                        <button
                            onClick={() => setIsSelectionMode(true)}
                            className="px-3 py-2 text-xs bg-muted text-muted-foreground rounded-lg hover:bg-accent transition-all border border-border"
                            title="Modo Selección"
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
                        {renderTree(null)}
                    </SortableContext>
                </DndContext>

                {blocks.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-8 italic">
                        Sin bloques aún
                    </p>
                )}
            </div>
        </div>
    );

    function renderTree(parentId: string | null, level: number = 0) {
        const children = blocks.filter(b => b.parent_block_id === parentId);

        // Debug hierarchy at root level
        if (parentId === null) {
            console.log(`[BlockList] Rendering Root. Found ${children.length} root blocks. Total blocks: ${blocks.length}`);
            if (children.length > 0) {
                console.log('[BlockList] First root:', children[0]);
            } else if (blocks.length > 0) {
                console.log('[BlockList] WARNING: No root blocks found but blocks exist! First block:', blocks[0]);
            }
        }

        if (children.length === 0) return null;

        // Sort children by order_index
        const sortedChildren = children.sort((a, b) => a.order_index - b.order_index);

        return sortedChildren.map(block => {
            const hasChildren = blocks.some(b => b.parent_block_id === block.id);
            const isVisible = !block.parent_block_id || expandedBlockIds.has(block.parent_block_id);

            // If parent is not expanded, we don't render (unless we are root)
            // But wait, the recursive call happens ONLY if parent is expanded (see below)
            // The isVisible check here is redundant for children if we rely on the parent's generic rendering condition
            // However, keep it safe.

            // The top level logic passes null, so root items are always rendered.
            // Recursive calls happen inside the conditional rendering below.

            return (
                <div key={block.id} className="relative">
                    <SortableBlockItem
                        block={block}
                        isSelected={selectedBlockId === block.id}
                        isMultiSelected={multiSelectedIds.has(block.id)}
                        isSelectionMode={isSelectionMode}
                        hasChildren={hasChildren}
                        isExpanded={expandedBlockIds.has(block.id)}
                        onClick={() => onSelectBlock(block.id)}
                        onMenuAction={(action) => handleMenuAction(block.id, action)}
                        onToggleExpand={() => toggleExpand(block.id)}
                        onToggleMultiSelect={() => toggleMultiSelect(block.id)}
                        level={level}
                    />
                    {menuBlockId === block.id && (
                        <BlockActionsMenu
                            blockId={block.id}
                            onAction={(action) => handleMenuAction(block.id, action)}
                            onClose={() => setMenuBlockId(null)}
                        />
                    )}
                    {/* Recursive Rendering for Children */}
                    {expandedBlockIds.has(block.id) && (
                        <div className={`
                            ${level === 0 ? 'ml-0 border-l-0' : 'ml-6 border-l-2 border-primary/20 pl-3'} 
                            mt-1 space-y-1 animate-in slide-in-from-top-1 duration-200
                        `}>
                            {/* Recursive Debug */}
                            {/* {console.log(`[BlockList] Rendering children for ${block.title} (Level ${level})`)} */}
                            {renderTree(block.id, level + 1)}
                        </div>
                    )}
                </div>
            );
        });
    }
}
