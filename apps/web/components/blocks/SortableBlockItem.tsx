import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { DocumentBlock } from '@docnex/shared';
import { decodeHtmlEntities } from '@/lib/text-utils';
import ProvenanceTooltip from './ProvenanceTooltip';

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
    isSelectionMode?: boolean;
    level?: number;
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
    onToggleMultiSelect,
    isSelectionMode,
    level = 0
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

    // Dynamic styling based on hierarchy level - Clean & Professional
    const getLevelStyles = () => {
        const baseStyles = "bg-card hover:bg-accent/50 border-border";

        if (isSelected) return 'bg-primary/10 border-primary/50 shadow-sm';
        if (isMultiSelected) return 'bg-primary/20 border-primary shadow-sm';

        switch (level) {
            case 0: // TÍTULO - Distinct background and border
                return `border-l-4 border-l-amber-500 bg-amber-500/10 mb-1 ${baseStyles}`;
            case 1: // CAPÍTULO - Cyan border
                return `border-l-2 border-l-cyan-500 bg-cyan-500/5 ${baseStyles}`;
            case 2: // ARTÍCULO - Emerald border
                return `border-l-2 border-l-emerald-500 bg-emerald-500/5 ${baseStyles}`;
            default:
                return `${baseStyles} border-l-2 border-l-transparent opacity-90`;
        }
    };

    return (
        <ProvenanceTooltip blockId={block.id}>
            <div
                ref={setNodeRef}
                style={style}
                className={`group flex items-center gap-2 p-2 rounded-md cursor-pointer border transition-all duration-200 ${getLevelStyles()}`}
                onClick={onClick}
            >
                {/* Multi-select Checkbox - Only in Selection Mode */}
                {isSelectionMode && (
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
                )}

                {/* Expansion Toggle / Spacer */}
                <div className="flex items-center justify-center w-5">
                    {hasChildren ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleExpand?.();
                            }}
                            className={`p-0.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-sm transition-transform duration-200`}
                        >
                            {/* Use different chevron orientation or icon based on state if desired, but rotation is standard */}
                            <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>
                    ) : (
                        /* Dot for leaf nodes to align visual rhythm */
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
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
                <div className={`flex-1 truncate text-sm ${level === 0
                    ? 'font-bold text-foreground text-base py-0.5' // TÍTULO style
                    : level === 1
                        ? 'font-semibold text-foreground/90' // CAPÍTULO style
                        : 'text-muted-foreground' // ARTÍCULO style
                    }`}>
                    {decodeHtmlEntities(block.title)}
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
        </ProvenanceTooltip>
    );
}
