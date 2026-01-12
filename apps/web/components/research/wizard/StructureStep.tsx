import { OutlineProposal, OutlineSection } from '@/lib/ai/synthesis-schemas';
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
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2, Wand2 } from 'lucide-react';

interface StructureStepProps {
    outline: OutlineProposal | null;
    isLoading: boolean;
    onOutlineChange: (outline: OutlineProposal) => void;
    onGenerateOutline: () => void;
}

export function StructureStep({ outline, isLoading, onOutlineChange, onGenerateOutline }: StructureStepProps) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id && outline) {
            const oldIndex = outline.sections.findIndex(s => s.id === active.id);
            const newIndex = outline.sections.findIndex(s => s.id === over?.id);

            const newSections = arrayMove(outline.sections, oldIndex, newIndex);

            // Re-assign order based on new index
            const reordered = newSections.map((s, idx) => ({ ...s, order: idx }));

            onOutlineChange({ ...outline, sections: reordered });
        }
    };

    const updateSectionTitle = (id: string, newTitle: string) => {
        if (!outline) return;
        const newSections = outline.sections.map(s =>
            s.id === id ? { ...s, title: newTitle } : s
        );
        onOutlineChange({ ...outline, sections: newSections });
    };

    const updateSectionDesc = (id: string, newDesc: string) => {
        if (!outline) return;
        const newSections = outline.sections.map(s =>
            s.id === id ? { ...s, description: newDesc } : s
        );
        onOutlineChange({ ...outline, sections: newSections });
    };

    const removeSection = (id: string) => {
        if (!outline) return;
        if (!confirm('¿Eliminar esta sección?')) return;

        const newSections = outline.sections.filter(s => s.id !== id);
        onOutlineChange({ ...outline, sections: newSections });
    };

    const addSection = () => {
        if (!outline) return;
        const newSection: OutlineSection = {
            id: crypto.randomUUID(),
            title: 'Nueva Sección',
            description: 'Descripción de la sección',
            suggested_block_ids: [],
            order: outline.sections.length
        };
        onOutlineChange({ ...outline, sections: [...outline.sections, newSection] });
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold tracking-tight">Estructura Propuesta</h2>
                <p className="text-muted-foreground text-lg">
                    Revisa y ajusta la estructura que guiará la síntesis del documento.
                </p>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center p-12 border rounded-xl bg-muted/10">
                    <Wand2 className="w-10 h-10 text-primary animate-pulse mb-4" />
                    <p className="font-medium text-lg">Generando estructura óptima...</p>
                    <p className="text-sm text-muted-foreground">Analizando documentos y detectando temas clave</p>
                </div>
            ) : !outline ? (
                <div className="flex flex-col items-center justify-center p-12 border rounded-xl bg-muted/10 border-dashed">
                    <p className="font-medium text-lg mb-4">No hay estructura definida</p>
                    <button
                        onClick={onGenerateOutline}
                        className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium shadow-md hover:scale-105 transition-transform"
                    >
                        <Wand2 className="w-5 h-5" />
                        Generar Estructura con IA
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Document Title Edit */}
                    <div className="bg-card border rounded-xl p-6 shadow-sm">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Título del Documento</label>
                        <input
                            type="text"
                            className="w-full text-2xl font-bold mt-2 bg-transparent border-none p-0 focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50"
                            value={outline.title}
                            onChange={(e) => onOutlineChange({ ...outline, title: e.target.value })}
                        />
                        <input
                            type="text"
                            className="w-full text-sm text-muted-foreground mt-1 bg-transparent border-none p-0 focus:outline-none focus:ring-0"
                            value={outline.description}
                            onChange={(e) => onOutlineChange({ ...outline, description: e.target.value })}
                        />
                    </div>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={outline.sections.map(s => s.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-3">
                                {outline.sections.map((section) => (
                                    <SortableItem
                                        key={section.id}
                                        section={section}
                                        onUpdateTitle={updateSectionTitle}
                                        onUpdateDesc={updateSectionDesc}
                                        onRemove={removeSection}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>

                    <button
                        onClick={addSection}
                        className="w-full py-3 border-2 border-dashed border-muted-foreground/20 rounded-xl flex items-center justify-center gap-2 text-muted-foreground hover:bg-muted/10 hover:border-primary/50 hover:text-primary transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        Añadir Sección
                    </button>
                </div>
            )}
        </div>
    );
}

// Subcomponent for Sortable Item
function SortableItem({
    section,
    onUpdateTitle,
    onUpdateDesc,
    onRemove
}: {
    section: OutlineSection,
    onUpdateTitle: (id: string, val: string) => void,
    onUpdateDesc: (id: string, val: string) => void,
    onRemove: (id: string) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: section.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.8 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                bg-card border rounded-lg p-4 flex items-start gap-3 shadow-sm group
                ${isDragging ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border'}
            `}
        >
            <div
                {...attributes}
                {...listeners}
                className="mt-1.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            >
                <GripVertical className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
                <input
                    type="text"
                    className="w-full font-semibold bg-transparent border-none p-0 focus:outline-none focus:ring-0"
                    value={section.title}
                    onChange={(e) => onUpdateTitle(section.id, e.target.value)}
                />
                <input
                    type="text"
                    className="w-full text-sm text-muted-foreground mt-1 bg-transparent border-none p-0 focus:outline-none focus:ring-0"
                    value={section.description}
                    onChange={(e) => onUpdateDesc(section.id, e.target.value)}
                />
                <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                        {section.suggested_block_ids?.length || 0} fuentes
                    </span>
                </div>
            </div>

            <button
                onClick={() => onRemove(section.id)}
                className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                title="Eliminar sección"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
}
