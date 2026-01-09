'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight } from 'lucide-react';
import { DocumentBlock } from '@docnex/shared';

interface SortableBlockItemProps {
    block: DocumentBlock;
    isSelected: boolean;
    isMultiSelected?: boolean;
    hasChildren?: boolean;
    isExpanded?: boolean;
    onClick: () => void;
    onMenuAction: (action: string) => void;
    onToggleExpand?: () => void;
    onToggleMultiSelect?: () => void;
}

export default function SortableBlockItem({
    block,
    isSelected,
    isMultiSelected,
    hasChildren,
    isExpanded,
    onClick,
    onMenuAction,
    onToggleExpand,
    onToggleMultiSelect
}: SortableBlockItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: block.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group flex items-center gap-2 p-2 rounded cursor-pointer border transition-all ${isMultiSelected
                ? 'bg-primary/20 border-primary shadow-sm'
                : isSelected
                    ? 'bg-primary/10 border-primary/50 shadow-sm'
                    : 'bg-card border-border hover:bg-accent'
                }`}
            onClick={onClick}
        >
            {/* Multi-select Checkbox */}
            <div
                className={`flex items-center justify-center w-5 h-5 rounded border transition-all ${isMultiSelected
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-border group-hover:border-primary/50'
                    }`}
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleMultiSelect?.();
                }}
            >
                {isMultiSelected && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                )}
            </div>

            {/* Expansion Toggle / Spacer */}
            <div className="flex items-center justify-center w-5">
                {hasChildren ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpand?.();
                        }}
                        className={`p-0.5 hover:bg-primary/10 rounded-sm transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                    >
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                ) : (
                    <div className="w-3.5" />
                )}
            </div>

            {/* Drag handle */}
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab text-muted-foreground/40 hover:text-foreground px-1 transition-colors text-xs"
                onClick={(e) => e.stopPropagation()}
            >
                ⋮⋮
            </div>

            {/* Block title */}
            <div className="flex-1 truncate text-sm font-medium text-foreground">
                {block.title}
            </div>

            {/* Menu button */}
            <div className="relative">
                <button
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground px-1 transition-all"
                    onClick={(e) => {
                        e.stopPropagation();
                        onMenuAction('menu');
                    }}
                >
                    ⋯
                </button>
            </div>
        </div>
    );
}
