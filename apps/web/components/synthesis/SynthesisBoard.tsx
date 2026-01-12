'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    DndContext,
    DragOverlay,
    pointerWithin,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
    DropAnimation,
    useDroppable
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SynthesisProvider, useSynthesis, SynthesisBlock, SynthesisSection } from './SynthesisContext';
import {
    FileText,
    Layout,
    Search,
    Maximize2,
    CheckCircle2,
    AlertCircle,
    ArrowUpRight,
    PieChart,
    Activity,
    BookOpen,
    Filter,
    X,
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
    GitMerge,
    GitCommit,
    GripHorizontal,
    MoreVertical,
    Minimize2,
    Edit3,
    Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// --- VISUAL UTILS ---
const getTypeStyles = (type: string) => {
    switch (type) {
        case 'legal': return {
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/30',
            text: 'text-blue-300',
            glow: 'shadow-[0_0_15px_rgba(59,130,246,0.1)]', // Subtler
            icon: 'text-blue-400'
        };
        case 'technical': return {
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/30',
            text: 'text-emerald-300',
            glow: 'shadow-[0_0_15px_rgba(16,185,129,0.1)]',
            icon: 'text-emerald-400'
        };
        case 'financial': return {
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/30',
            text: 'text-amber-300',
            glow: 'shadow-[0_0_15px_rgba(245,158,11,0.1)]',
            icon: 'text-amber-400'
        };
        default: return {
            bg: 'bg-slate-500/10',
            border: 'border-slate-500/30',
            text: 'text-slate-300',
            glow: 'shadow-none',
            icon: 'text-slate-400'
        };
    }
};

// --- COMPONENTS ---

// 1. BLOCK CARD (Draggable Item)
const BlockCard = ({
    block,
    isOverlay = false,
    isIncompatible = false,
    onClick,
    isSelected = false,
    onToggleSelect
}: {
    block: SynthesisBlock,
    isOverlay?: boolean,
    isIncompatible?: boolean,
    onClick?: () => void,
    isSelected?: boolean,
    onToggleSelect?: (e: React.MouseEvent) => void
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: block.id,
        data: { type: 'Block', block },
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    };

    const styles = getTypeStyles(block.source_type);

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className={cn(
                "group relative flex flex-col gap-2 p-3 rounded-xl border backdrop-blur-md transition-all duration-200 cursor-grab active:cursor-grabbing w-full h-[110px]",
                styles.bg,
                isIncompatible ? "border-dashed border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)] ring-1 ring-red-500/20" :
                    isSelected ? "border-indigo-500 ring-1 ring-indigo-500 bg-indigo-500/10" :
                        styles.border,
                isDragging ? "opacity-30 scale-95" : "opacity-100 hover:scale-[1.02]",
                isOverlay ? "scale-105 z-50 ring-2 ring-white/20 shadow-2xl" : "hover:border-white/20",
                !isDragging && !isOverlay && !isIncompatible && !isSelected && styles.glow
            )}
        >
            {/* Top Row: Type | Coverage | Quality */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-1.5">
                    {/* Coverage Badge */}
                    <div className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] font-bold text-slate-300 border border-white/5">
                        {Math.floor(Math.random() * 30 + 5)}%
                    </div>

                    {/* Checkbox */}
                    {onToggleSelect && (
                        <div
                            onClick={(e) => { e.stopPropagation(); onToggleSelect(e); }}
                            className={cn(
                                "w-3 h-3 rounded-[3px] border cursor-pointer flex items-center justify-center transition-colors mr-1",
                                isSelected ? "bg-indigo-500 border-indigo-500" : "border-white/30 hover:border-white bg-black/20",
                                !isSelected && "opacity-0 group-hover:opacity-100"
                            )}
                        >
                            {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-[1px]" />}
                        </div>
                    )}

                    {isIncompatible && (
                        <div className="flex items-center gap-1 text-red-400 animate-pulse">
                            <AlertCircle className="w-3 h-3" />
                        </div>
                    )}
                    {!isIncompatible && (
                        <span className={cn("text-[9px] font-bold uppercase tracking-wider", styles.text)}>
                            {block.source_type}
                        </span>
                    )}
                </div>

                {/* Quality Dots (Top Right) */}
                <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className={cn("w-1 h-1 rounded-full", i < block.quality_score ? "bg-yellow-400/80 shadow-[0_0_5px_rgba(250,204,21,0.5)]" : "bg-white/10")} />
                    ))}
                </div>
            </div>

            <h4 className="text-xs font-medium text-slate-100 leading-snug line-clamp-3 select-none flex-1 mt-1">
                {block.title}
            </h4>

            <div className="flex items-center justify-end pt-1">
                <ArrowUpRight className="w-3 h-3 text-white/30 group-hover:text-white/80 transition-colors" />
            </div>
        </div>
    );
};



// --- NEW COMPONENTS FOR V4 ---

// 6. TIMELINE NAVIGATOR (Scroll + Zoom Control)
const TimelineNavigator = ({
    scrollRef,
    contentWidth,
    containerWidth,
    onScrollChange,
    onZoomChange,
    zoomLevel
}: {
    scrollRef: React.RefObject<HTMLDivElement | null>,
    contentWidth: number,
    containerWidth: number,
    onScrollChange: (percent: number) => void,
    onZoomChange: (delta: number) => void,
    zoomLevel: number
}) => {
    const [sliderPos, setSliderPos] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const navRef = useRef<HTMLDivElement>(null);
    const dragStartRef = useRef<{ startX: number, startPos: number } | null>(null);

    // Sync Scroll -> Slider (Only if NOT dragging)
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const handleScroll = () => {
            if (isDragging) return; // Ignore updates while dragging to prevent fighting
            const maxScroll = el.scrollWidth - el.clientWidth;
            if (maxScroll <= 0) {
                setSliderPos(0);
                return;
            }
            const percent = el.scrollLeft / maxScroll;
            setSliderPos(percent);
        };

        el.addEventListener('scroll', handleScroll);
        return () => el.removeEventListener('scroll', handleScroll);
    }, [scrollRef, isDragging, zoomLevel]); // Re-bind if dragging state changes

    // DRAG HANDLER (Pointer Events)
    useEffect(() => {
        const handlePointerMove = (e: PointerEvent) => {
            if (!isDragging || !dragStartRef.current || !navRef.current || !scrollRef.current) return;

            e.preventDefault();
            const trackWidth = navRef.current.offsetWidth;
            const deltaX = e.clientX - dragStartRef.current.startX;
            const deltaPercent = deltaX / trackWidth; // 1:1 movement relative to track

            let newPos = Math.max(0, Math.min(1, dragStartRef.current.startPos + deltaPercent));
            setSliderPos(newPos); // Update UI immediately

            // Update Scroll
            const el = scrollRef.current;
            const maxScroll = el.scrollWidth - el.clientWidth;
            el.scrollLeft = newPos * maxScroll;
        };

        const handlePointerUp = () => {
            setIsDragging(false);
            dragStartRef.current = null;
            document.body.style.cursor = 'default';
        };

        if (isDragging) {
            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
            document.body.style.cursor = 'grabbing';
        }
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [isDragging]);

    const handleThumbDown = (e: React.PointerEvent) => {
        e.stopPropagation(); // Don't trigger track click
        e.preventDefault();
        setIsDragging(true);
        dragStartRef.current = { startX: e.clientX, startPos: sliderPos };
    };

    const handleTrackClick = (e: React.MouseEvent) => {
        if (!navRef.current || !scrollRef.current) return;
        const rect = navRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        // Center the thumb on the click
        const thumbWidthPercent = Math.max(0.1, 0.3 / zoomLevel); // approx
        const percent = Math.max(0, Math.min(1, (clickX / rect.width) - (thumbWidthPercent / 2)));

        const el = scrollRef.current;
        const maxScroll = el.scrollWidth - el.clientWidth;
        el.scrollTo({ left: percent * maxScroll, behavior: 'smooth' });
    };

    return (
        <div className="h-14 bg-[#0c0c0e] border-t border-white/5 px-6 flex items-center justify-center gap-4 relative select-none z-40">
            <span className="text-[10px] text-zinc-400 font-bold font-mono tracking-widest uppercase">Navegador</span>

            {/* The Track */}
            <div
                ref={navRef}
                onClick={handleTrackClick}
                className="relative flex-1 h-10 bg-white/5 rounded-lg overflow-hidden flex items-end cursor-pointer group border border-white/5"
            >
                {/* Visual Mini-Map (Vessel Pillars) */}
                <div className="absolute inset-0 flex items-end gap-[2px] px-1 pb-1 opacity-30 pointer-events-none">
                    {[...Array(30)].map((_, i) => {
                        // Mocking a 'vessel' structure pattern
                        const height = 20 + Math.abs(Math.sin(i * 0.5)) * 60;
                        const isDivider = i % 5 === 0;
                        return (
                            <div
                                key={i}
                                className={cn("flex-1 rounded-t-sm transition-all", isDivider ? "bg-indigo-400/50 h-full mt-2" : "bg-zinc-600")}
                                style={{ height: isDivider ? '40%' : `${height}%` }}
                            />
                        );
                    })}
                </div>

                {/* The Viewport Thumb (Slider) - Custom Drag */}
                <div
                    onPointerDown={handleThumbDown}
                    className="absolute h-full top-0 bg-indigo-500/10 border-x-2 border-indigo-500 rounded-sm cursor-grab active:cursor-grabbing hover:bg-indigo-500/20 flex items-center justify-between px-1 z-10 transition-colors shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                    style={{
                        left: `${sliderPos * 95}%`, // 95% mapping
                        width: `${Math.max(5, 30 / zoomLevel)}%`
                    }}
                >
                    {/* Left Zoom Handle */}
                    <div
                        className="w-4 h-full bg-transparent hover:bg-indigo-500/30 cursor-w-resize flex items-center justify-center group/handle"
                        onPointerDown={(e) => { e.stopPropagation(); onZoomChange(-0.1); }}
                    >
                        <div className="w-1 h-4 bg-indigo-400/40 rounded-full group-hover/handle:bg-white transition-colors" />
                    </div>

                    {/* Center Grip */}
                    <div className="flex gap-1 opacity-50">
                        <div className="w-1 h-1 rounded-full bg-indigo-400" />
                        <div className="w-1 h-1 rounded-full bg-indigo-400" />
                        <div className="w-1 h-1 rounded-full bg-indigo-400" />
                    </div>

                    {/* Right Zoom Handle */}
                    <div
                        className="w-4 h-full bg-transparent hover:bg-indigo-500/30 cursor-e-resize flex items-center justify-center group/handle"
                        onPointerDown={(e) => { e.stopPropagation(); onZoomChange(0.1); }}
                    >
                        <div className="w-1 h-4 bg-indigo-400/40 rounded-full group-hover/handle:bg-white transition-colors" />
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 text-zinc-300 font-bold font-mono text-xs w-10 justify-end">
                <span>{Math.round(zoomLevel * 100)}%</span>
            </div>
        </div>
    );
};

// 9. DYNAMIC GRAPH VISUALIZATION
const DynamicGraph = () => {
    const { blocks } = useSynthesis();
    // Deterministic pseudo-random positions based on block IDs
    const nodes = useMemo(() => blocks.map((b, i) => ({
        id: b.id,
        x: 50 + Math.sin(i) * 30, // Mock positions
        y: 50 + Math.cos(i * 1.3) * 30,
        type: b.source_type,
        color: b.source_type === 'legal' ? '#ef4444' : b.source_type === 'technical' ? '#3b82f6' : '#10b981'
    })), [blocks]);

    const [hoveredNode, setHoveredNode] = useState<string | null>(null);

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 border border-white/10 rounded-lg bg-black/20 flex items-center justify-center relative overflow-hidden group">
                <svg width="100%" height="100%" viewBox="0 0 100 100" className="opacity-80">
                    {/* Links (Mock connections) */}
                    {nodes.map((node, i) => (
                        i > 0 && <line
                            key={`link-${i}`}
                            x1={node.x} y1={node.y}
                            x2={nodes[i - 1].x} y2={nodes[i - 1].y}
                            stroke="#ffffff"
                            strokeOpacity={0.1}
                            strokeWidth="0.5"
                        />
                    ))}

                    {/* Nodes */}
                    {nodes.map((node) => (
                        <g
                            key={node.id}
                            onMouseEnter={() => setHoveredNode(node.id)}
                            onMouseLeave={() => setHoveredNode(null)}
                            className="cursor-pointer transition-all duration-300"
                            style={{ opacity: hoveredNode && hoveredNode !== node.id ? 0.3 : 1 }}
                        >
                            <circle
                                cx={node.x} cy={node.y}
                                r={hoveredNode === node.id ? 4 : 2}
                                fill={node.color}
                                className="transition-all duration-300"
                            />
                            {hoveredNode === node.id && (
                                <text x={node.x} y={node.y - 6} fontSize="4" fill="white" textAnchor="middle" className="select-none bg-black/50">
                                    Click to focus
                                </text>
                            )}
                        </g>
                    ))}
                </svg>

                {/* Overlay Info */}
                <div className="absolute bottom-2 left-2 pointer-events-none">
                    <span className="text-[10px] bg-black/60 px-2 py-1 rounded text-slate-400 backdrop-blur-md">
                        {blocks.length} Nodos Activos
                    </span>
                </div>
            </div>
            <div className="mt-3 text-[10px] text-slate-500 italic text-center px-4">
                El grafo visualiza las relaciones semánticas entre los bloques. Pasa el ratón para explorar conexiones.
            </div>
        </div>
    );
};

// 7. ENHANCED RIGHT PANEL TABS
const SynthesisToolkit = () => {
    const [activeTab, setActiveTab] = useState<'notes' | 'graph' | 'sources'>('notes');

    return (
        <div className="h-full flex flex-col">
            {/* Tabs Header */}
            <div className="flex border-b border-white/5">
                <button
                    onClick={() => setActiveTab('notes')}
                    className={cn(
                        "flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2",
                        activeTab === 'notes' ? "border-indigo-500 text-white bg-white/5" : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]"
                    )}
                >
                    Notas
                </button>
                <button
                    onClick={() => setActiveTab('sources')}
                    className={cn(
                        "flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2",
                        activeTab === 'sources' ? "border-emerald-500 text-white bg-white/5" : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]"
                    )}
                >
                    Fuentes
                </button>
                <button
                    onClick={() => setActiveTab('graph')}
                    className={cn(
                        "flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2",
                        activeTab === 'graph' ? "border-purple-500 text-white bg-white/5" : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]"
                    )}
                >
                    Grafo
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0c0c0e]">
                {activeTab === 'notes' && (
                    <div className="p-4 space-y-4">
                        <div className="text-[11px] text-white font-bold uppercase tracking-wide mb-2">NOTAS DEL BLOQUE</div>
                        <textarea
                            className="w-full h-64 bg-black/20 border border-white/10 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 resize-none font-sans leading-relaxed"
                            placeholder="Escribe notas rápidas, ideas o prompts para la síntesis..."
                            defaultValue="- Revisar consistencia en la normativa de ruido.\n- Falta integrar el informe de sostenibilidad económica.\n- Verificar referencias cruzadas en el capítulo 3."
                        />
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                            <h4 className="text-yellow-400 text-xs font-bold mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Atención</h4>
                            <p className="text-[10px] text-yellow-200/80">
                                3 bloques tienen advertencias de calidad baja. Revisa antes de combinar.
                            </p>
                        </div>
                    </div>
                )}

                {activeTab === 'sources' && (
                    <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between text-[11px] text-white font-bold uppercase tracking-wide mb-2">
                            <span>RECURSOS DISPONIBLES</span>
                            <span className="text-zinc-400">4 DOCS</span>
                        </div>
                        {[
                            { title: "Plan General Ordenación.pdf", type: "PDF", size: "24MB" },
                            { title: "Excel_Viabilidad_v3.xlsx", type: "XLS", size: "2MB" },
                            { title: "Normativa_Autonomica.html", type: "WEB", size: "150KB" },
                            { title: "Topo_Survey_2024.dwg", type: "CAD", size: "45MB" },
                        ].map((doc, i) => (
                            <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/5 group">
                                <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-[9px] font-bold text-slate-300">
                                    {doc.type}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs text-slate-200 truncate group-hover:text-white">{doc.title}</div>
                                    <div className="text-[10px] text-slate-500">{doc.size}</div>
                                </div>
                                <ArrowUpRight className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100" />
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'graph' && (
                    <div className="p-4 flex flex-col h-full">
                        <DynamicGraph />
                    </div>
                )}
            </div>
        </div>
    );
};

// 8. TRAY CONTAINER (Visual Grouping)
const ChapterTray = ({
    title,
    children,
    zoomLevel
}: {
    title: string,
    children: React.ReactNode,
    zoomLevel: number
}) => {
    return (
        <div className="flex flex-col h-full mx-1 select-none">
            {/* Tray Content Area */}
            <div className="flex-1 flex gap-2 p-3 pb-8 rounded-t-3xl border-x-2 border-t-2 border-zinc-700 bg-zinc-900/20 backdrop-blur-sm relative grouped-tray shadow-inner">
                {/* Decorative Tray Lip */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1.5 bg-zinc-700 rounded-b-full" />
                {children}
            </div>

            {/* Styled Bottom Label */}
            <div className="h-10 bg-[#0F0F12] border-x border-b border-zinc-700 rounded-b-lg flex items-center justify-center relative shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 absolute left-3" />
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{title}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 absolute right-3" />

                {/* Connection lines to next tray */}
                <div className="absolute top-1/2 -right-4 w-4 h-px bg-zinc-700/50" />
                <div className="absolute top-1/2 -left-4 w-4 h-px bg-zinc-700/50" />
            </div>
        </div>
    );
};

// --- MODIFIED VESSEL COLUMN (V4.3 - Fixed Borders & Percentage) ---
const VesselColumn = ({
    section,
    activeBlock,
    zoomLevel,
    selectedBlocks,
    onSelectBlock,
    onBlockClick
}: {
    section: SynthesisSection,
    activeBlock: SynthesisBlock | null,
    zoomLevel: number,
    selectedBlocks: string[],
    onSelectBlock: (id: string) => void,
    onBlockClick: (block: SynthesisBlock) => void
}) => {
    const { getBlocksByContainer } = useSynthesis();
    const blocks = getBlocksByContainer(section.id);
    const { setNodeRef, isOver } = useSortable({ id: section.id, data: { type: 'Section', section } });

    // Check compatibility logic (Same as before)
    const checkCompatibility = (blockType: string, sectionTitle: string) => {
        const title = sectionTitle.toLowerCase();
        if (title.includes('antecedentes') && (blockType === 'general' || blockType === 'technical')) return true;
        if (title.includes('normativa') && blockType === 'legal') return true;
        if (title.includes('económico') && blockType === 'financial') return true;
        if (title.includes('territorial') && blockType === 'technical') return true;
        if (title.includes('ordenación') && (blockType === 'technical' || blockType === 'general')) return true;
        return false;
    };

    const dragStatus = (!activeBlock || !isOver) ? 'neutral' : checkCompatibility(activeBlock.source_type, section.title) ? 'compatible' : 'incompatible';

    // Semantic Progress Mock: Sum of "Quality Coverage" rather than just count.
    // In real app, this would be computed by AI. 
    // Here we sum (Quality * 10) as a proxy for "Content Value".
    const semanticValue = blocks.reduce((acc, b) => acc + (b.quality_score * 8), 0);
    const progress = Math.min(semanticValue, 100);

    const isCompact = blocks.length > 4; // Threshold for switching to compact mode

    const containerSelection = blocks.filter(b => selectedBlocks.includes(b.id));

    return (
        <div
            ref={setNodeRef}
            className="flex flex-col h-full relative group transition-all duration-300"
            style={{
                minWidth: `${(isCompact ? 340 : 280) * zoomLevel}px`, // Slightly wider in compact mode to fit 2 cols
                maxWidth: `${(isCompact ? 380 : 320) * zoomLevel}px`,
            }}
        >
            <div className="flex-1 flex flex-col relative">

                {/* Header (Floating OUTSIDE the bordered bowl) - Modified V4.5 */}
                <div className="px-3 pb-2 flex items-center gap-3 z-10 relative">
                    {/* Progress Indicator (Moved Left) */}
                    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: `${32 * zoomLevel}px`, height: `${32 * zoomLevel}px` }}>
                        <svg className="w-full h-full -rotate-90">
                            <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-white/5" />
                            <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="3" fill="transparent"
                                className={cn("transition-all duration-700 ease-out", progress >= 100 ? "text-emerald-500" : "text-indigo-500")}
                                strokeDasharray={100}
                                strokeDashoffset={100 - progress}
                                strokeLinecap="round"
                            />
                        </svg>
                        <span className="absolute font-bold text-white text-[11px]">{Math.round(progress)}%</span>
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className={cn("font-bold tracking-wide uppercase truncate transition-colors duration-300",
                            dragStatus === 'compatible' ? "text-emerald-400" :
                                dragStatus === 'incompatible' ? "text-red-400" : "text-slate-200"
                        )} style={{ fontSize: `${0.9 * zoomLevel}rem` }}>
                            {section.title}
                        </h3>
                    </div>
                </div>

                {/* VESSEL BODY: Open Top Style with Borders starting BELOW the header text base */}
                <div className={cn(
                    "flex-1 flex flex-col rounded-b-2xl border-x-2 border-b-2 transition-all duration-300 relative overflow-hidden backdrop-blur-sm mt-1 mx-1",
                    "bg-[#09090b]/40",
                    dragStatus === 'compatible' ? "border-dashed border-emerald-500/60 bg-emerald-950/20" :
                        dragStatus === 'incompatible' ? "border-dashed border-red-500/60 bg-red-950/20" :
                            "border-solid border-white/20 hover:border-white/30"
                )}>
                    {/* Contextual Merge Bar */}
                    <AnimatePresence>
                        {containerSelection.length >= 2 && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="bg-indigo-900/30 border-b border-indigo-500/30 overflow-hidden mx-2 mt-2 rounded"
                            >
                                <div className="flex items-center justify-between px-3 py-1.5">
                                    <span className="text-[9px] text-indigo-300 font-mono">{containerSelection.length} sel.</span>
                                    <button className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-[9px] text-white font-medium transition-colors">
                                        <GitMerge className="w-2.5 h-2.5" /> Une
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Content */}
                    <div className="flex-1 p-3 overflow-y-auto custom-scrollbar flex flex-col justify-end relative z-10 min-h-0">
                        {blocks.length === 0 && !isOver && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10 pointer-events-none">
                                <span className="text-[9px] tracking-[0.2em] font-light uppercase text-white/10">Vacío</span>
                            </div>
                        )}

                        <SortableContext items={blocks.map(b => b.id)} strategy={isCompact ? rectSortingStrategy : verticalListSortingStrategy}>
                            <div className={cn(
                                isCompact ? "grid grid-cols-2 gap-2" : "flex flex-col-reverse gap-2"
                            )}>
                                {blocks.map(block => {
                                    const isCompatible = checkCompatibility(block.source_type, section.title);
                                    return (
                                        <div key={block.id} className={isCompact ? "h-full" : ""}>
                                            <BlockCard
                                                block={block}
                                                isIncompatible={!isCompatible}
                                                onClick={() => onBlockClick(block)}
                                                isSelected={selectedBlocks.includes(block.id)}
                                                onToggleSelect={() => onSelectBlock(block.id)}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </SortableContext>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 3. FLOATING EDITOR WINDOW (Non-Modal)
const FloatingBlockEditor = ({ block, onClose }: { block: SynthesisBlock, onClose: () => void }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            drag
            dragMomentum={false}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] bg-[#0F0F12] border border-white/10 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden ring-1 ring-white/5"
        >
            {/* Drag Handle & Header */}
            <div className="h-10 bg-white/5 border-b border-white/5 flex items-center justify-between px-4 cursor-move active:cursor-grabbing">
                <div className="flex items-center gap-2 text-slate-400">
                    <GripHorizontal className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Editor Rápido</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 uppercase">{block.source_type}</span>
                    <button onClick={onClose} className="hover:text-white text-slate-500 transition-colors"><X className="w-4 h-4" /></button>
                </div>
            </div>

            {/* Content Actions */}
            <div className="p-4 border-b border-white/5 bg-black/20 flex gap-2">
                <button className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-xs text-slate-300 border border-white/5 transition-colors">
                    <Sparkles className="w-3 h-3 text-purple-400" /> Mejorar con AI
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-xs text-slate-300 border border-white/5 transition-colors">
                    <Edit3 className="w-3 h-3 text-blue-400" /> Corregir Estilo
                </button>
                <div className="flex-1" />
                <button className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-medium transition-colors shadow-lg shadow-emerald-500/20">
                    Guardar Cambios
                </button>
            </div>

            {/* Editable Area */}
            <div className="flex-1 p-6 overflow-y-auto bg-[#0a0a0c] font-serif text-slate-300 leading-relaxed text-sm selection:bg-indigo-500/30 focus:outline-none" contentEditable suppressContentEditableWarning>
                {block.content}
            </div>

            <div className="h-6 bg-black/40 border-t border-white/5 flex items-center px-4 justify-between text-[10px] text-slate-600">
                <span>{block.content.length} caracteres</span>
                <span>ID: {block.id}</span>
            </div>
        </motion.div>
    );
};

// 4. Research Pool (Extracted from old bottom pool logic - UPDATED V4.3)
const ResearchPool = () => {
    const { blocks } = useSynthesis();
    const [editingBlock, setEditingBlock] = useState<SynthesisBlock | null>(null); // For modal
    const [filterText, setFilterText] = useState('');
    const [filterType, setFilterType] = useState<string>('all');

    // MAKE POOL DROPPABLE so blocks can be returned here
    const { setNodeRef } = useDroppable({ id: 'pool' });

    const handleBlockClick = (block: SynthesisBlock) => {
        setEditingBlock(block);
    };

    const poolBlocks = blocks.filter(b => b.container_id === 'pool');
    const filteredBlocks = poolBlocks.filter(b => {
        if (filterType !== 'all' && b.source_type !== filterType) return false;
        if (filterText && !b.title.toLowerCase().includes(filterText.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="flex flex-col h-full border-t border-white/5">
            {/* POOL TOOLBAR */}
            <div className="h-10 shrink-0 border-b border-white/5 bg-[#09090b] flex items-center px-4 gap-4">
                <div className="flex items-center gap-2 text-slate-400 bg-white/5 px-2 py-1.5 rounded border border-white/5 flex-1 max-w-[300px]">
                    <Search className="w-3.5 h-3.5" />
                    <input
                        type="text"
                        placeholder="Filtrar por palabra clave..."
                        className="bg-transparent border-none outline-none text-xs w-full text-white placeholder:text-slate-400"
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                    />
                </div>

                <div className="h-4 w-px bg-white/10" />

                <div className="flex items-center gap-1">
                    {['all', 'legal', 'technical', 'general'].map(t => (
                        <button
                            key={t}
                            onClick={() => setFilterType(t)}
                            className={cn(
                                "text-[10px] uppercase font-bold px-3 py-1 rounded transition-all",
                                filterType === t ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-white hover:bg-white/10"
                            )}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                <div className="flex-1 text-right">
                    <span className="text-xs text-emerald-400 font-bold font-mono tracking-tight">{filteredBlocks.length} BLOQUES DISPONIBLES</span>
                </div>
            </div>

            {/* BLOCKS GRID (Matches Vessel Sizing) */}
            <div ref={setNodeRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-[#050505]">
                <SortableContext items={filteredBlocks.map(b => b.id)} strategy={rectSortingStrategy}>
                    <div className="flex flex-wrap gap-3 items-start content-start">
                        {filteredBlocks.map(block => (
                            // Enforce fixed width
                            <div key={block.id} className="w-[300px] shrink-0">
                                <BlockCard block={block} onClick={() => handleBlockClick(block)} />
                            </div>
                        ))}
                    </div>
                </SortableContext>

                <AnimatePresence>
                    {editingBlock && <FloatingBlockEditor block={editingBlock} onClose={() => setEditingBlock(null)} />}
                </AnimatePresence>
            </div>
        </div>
    );
};


// --- MAIN BOARD CONTENT ---
function SynthesisBoardContent() {
    const { sections, blocks, moveBlock } = useSynthesis();
    const [activeId, setActiveId] = useState<string | null>(null);
    const activeBlock = activeId ? blocks.find(b => b.id === activeId) : null;

    // UI State for Panels & Zoom
    const [leftPanelWidth, setLeftPanelWidth] = useState(380);
    const [rightPanelWidth, setRightPanelWidth] = useState(320);
    const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
    const [isRightCollapsed, setIsRightCollapsed] = useState(false); // Manual toggle
    const [zoomLevel, setZoomLevel] = useState(1);

    // Selection & Floating Editor State
    const [selectedBlocks, setSelectedBlocks] = useState<string[]>([]); // For merge
    const [editingBlock, setEditingBlock] = useState<SynthesisBlock | null>(null); // For modal

    // Scroll Ref for Navigator
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Grouping Logic (Mocked for V4)
    // In a real app, this would come from a proper hierarchical data structure
    const chapters = [
        { id: 'chap-1', title: '1. CONTEXTO', sections: sections.slice(0, 2) }, // Antecedentes, Info Territorial
        { id: 'chap-2', title: '2. PROPUESTA', sections: sections.slice(2, 3) }, // Ordenación
        { id: 'chap-3', title: '3. VIABILIDAD', sections: sections.slice(3, 5) }, // Normativa, Economico
    ];

    // Persistence
    useEffect(() => {
        const saved = localStorage.getItem('synthesis-layout');
        if (saved) {
            const parsed = JSON.parse(saved);
            setLeftPanelWidth(parsed.left || 380);
            setRightPanelWidth(parsed.right || 320);
        }
    }, []);

    const saveLayout = (l: number, r: number) => {
        localStorage.setItem('synthesis-layout', JSON.stringify({ left: l, right: r }));
    };

    // Resizing Handlers
    const draggingLeft = useRef(false);
    const draggingRight = useRef(false);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (draggingLeft.current) {
                const newWidth = Math.max(200, Math.min(600, e.clientX - 72));
                setLeftPanelWidth(newWidth);
            }
            if (draggingRight.current) {
                const newWidth = Math.max(200, Math.min(500, window.innerWidth - e.clientX));
                setRightPanelWidth(newWidth);
            }
        };
        const handleMouseUp = () => {
            if (draggingLeft.current || draggingRight.current) saveLayout(leftPanelWidth, rightPanelWidth);
            draggingLeft.current = false;
            draggingRight.current = false;
            document.body.style.cursor = 'default';
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [leftPanelWidth, rightPanelWidth]);

    const handleBlockClick = (block: SynthesisBlock) => {
        setEditingBlock(block);
    };

    const handleToggleSelect = (id: string) => {
        setSelectedBlocks(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // DND Logic
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);
    const handleDragEnd = (e: DragEndEvent) => {
        const { active, over } = e;
        setActiveId(null);
        if (!over) return;

        const activeBlockId = active.id as string;
        const overId = over.id as string;

        const targetSection = sections.find(s => s.id === overId);
        if (targetSection) {
            moveBlock(activeBlockId, targetSection.id);
            return;
        }
        if (overId === 'pool') {
            moveBlock(activeBlockId, 'pool');
            return;
        }
        const targetBlock = blocks.find(b => b.id === overId);
        if (targetBlock) {
            moveBlock(activeBlockId, targetBlock.container_id, overId);
        }
    };

    return (
        <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex flex-col h-screen max-h-screen bg-[#050505] overflow-hidden font-sans text-slate-200">
                {/* TOOLBAR */}
                <header className="h-14 px-4 flex items-center justify-between border-b border-white/5 bg-[#09090b] z-30 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                            <Layout className="w-4 h-4" />
                        </div>
                        <h1 className="text-lg font-bold text-white tracking-tight">Tablero de Síntesis</h1>
                    </div>
                    {/* Center: Quick Stats */}
                    <div className="flex items-center gap-8 text-xs font-medium text-slate-400 hidden md:flex">
                        <div className="flex items-center gap-2">
                            <span>ESTADO:</span>
                            <span className="text-yellow-400 font-bold bg-yellow-400/10 px-2 py-0.5 rounded">EN PROGRESO</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span>BLOQUES:</span>
                            <span className="text-white font-bold text-lg">{blocks.length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span>SECCIONES:</span>
                            <span className="text-white font-bold text-lg">{sections.length}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsRightCollapsed(!isRightCollapsed)} className={cn("p-2 rounded hover:bg-white/5", !isRightCollapsed ? "text-indigo-400" : "text-slate-500")}>
                            {isRightCollapsed ? <MoreVertical className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                        </button>
                    </div>
                </header>

                <div className="flex flex-1 overflow-hidden relative">

                    {/* LEFT PANEL (Preview) */}
                    <motion.div
                        animate={{
                            width: isLeftCollapsed ? 0 : leftPanelWidth,
                            opacity: isLeftCollapsed ? 0 : 1,
                            marginRight: isLeftCollapsed ? 0 : 0
                        }}
                        className="border-r border-white/10 bg-[#0c0c0e] flex flex-col shrink-0 relative z-20"
                    >
                        <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 shrink-0">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Vista Previa</span>
                            <button onClick={() => setIsLeftCollapsed(true)} className="p-1 hover:text-white text-slate-600"><ChevronLeft className="w-3 h-3" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 font-sans text-sm text-slate-400 leading-relaxed text-justify space-y-4">
                            <p className="opacity-50">Selecciona o arrastra bloques para previsualizar...</p>
                        </div>
                        {!isLeftCollapsed && (
                            <div className="absolute right-[-2px] top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500/50 z-50 transition-colors" onMouseDown={() => { draggingLeft.current = true; document.body.style.cursor = 'col-resize'; }} />
                        )}
                    </motion.div>

                    {/* Left Panel Handle (Visible when collapsed) */}
                    {isLeftCollapsed && (
                        <button
                            onClick={() => setIsLeftCollapsed(false)}
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-24 bg-indigo-500/20 hover:bg-indigo-500/40 border-y border-r border-indigo-500/30 rounded-r-lg z-50 flex items-center justify-center transition-all group"
                        >
                            <ChevronRight className="w-3 h-3 text-indigo-400 group-hover:scale-125 transition-transform" />
                        </button>
                    )}

                    {/* MIDDLE: MAIN WORKSPACE */}
                    <main className="flex-1 flex flex-col min-w-0 bg-[#050505] relative">
                        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />

                        {/* Upper: Vessel Stream (Grouped by Trays) */}
                        <div
                            ref={scrollContainerRef}
                            className="flex-1 overflow-x-auto overflow-y-hidden px-8 py-6 flex items-end scrollbar-hide [&::-webkit-scrollbar]:hidden"
                        >
                            <div className="flex h-full w-full min-w-max pb-4 items-end gap-6">
                                {/* Map through Chapters (Trays) instead of flat Sections */}
                                {chapters.map(chapter => (
                                    <ChapterTray key={chapter.id} title={chapter.title} zoomLevel={zoomLevel}>
                                        <div className="flex gap-2 h-full items-end">
                                            {chapter.sections.map(section => (
                                                <VesselColumn
                                                    key={section.id}
                                                    section={section}
                                                    activeBlock={activeBlock || null}
                                                    zoomLevel={zoomLevel}
                                                    selectedBlocks={selectedBlocks}
                                                    onSelectBlock={handleToggleSelect}
                                                    onBlockClick={handleBlockClick}
                                                />
                                            ))}
                                        </div>
                                    </ChapterTray>
                                ))}
                                <div className="w-24 shrink-0" />
                            </div>
                        </div>

                        {/* NAV & POOL AREA Container */}
                        <div className="flex flex-col border-t border-white/10 bg-[#09090b] z-20 relative shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                            {/* 1. TIMELINE NAVIGATOR (Zoom/Scroll) */}
                            <TimelineNavigator
                                scrollRef={scrollContainerRef}
                                contentWidth={2000} // Mock
                                containerWidth={1000} // Mock
                                onScrollChange={() => { }}
                                onZoomChange={() => { }}
                                zoomLevel={zoomLevel}
                            />

                            {/* 2. RESEARCH POOL */}
                            <div className="h-[220px] relative">
                                <ResearchPool />
                            </div>
                        </div>
                    </main>

                    {/* RIGHT PANEL (Toolkit) */}
                    <div className="relative flex shrink-0">
                        {isRightCollapsed && (
                            <button
                                onClick={() => setIsRightCollapsed(false)}
                                className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-24 bg-indigo-500/20 hover:bg-indigo-500/40 border-y border-l border-indigo-500/30 rounded-l-lg z-50 flex items-center justify-center transition-all group"
                            >
                                <ChevronLeft className="w-3 h-3 text-indigo-400 group-hover:scale-125 transition-transform" />
                            </button>
                        )}
                        <AnimatePresence>
                            {!isRightCollapsed && (
                                <motion.div
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: rightPanelWidth, opacity: 1 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    className="border-l border-white/10 bg-[#0c0c0e] flex flex-col shrink-0 relative"
                                >
                                    <div className="absolute left-[-2px] top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500/50 z-50 transition-colors" onMouseDown={() => { draggingRight.current = true; document.body.style.cursor = 'col-resize'; }} />

                                    <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 shrink-0">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Toolkit</span>
                                        <button onClick={() => setIsRightCollapsed(true)} className="p-1 hover:text-white text-slate-600"><ChevronRight className="w-3 h-3" /></button>
                                    </div>

                                    {/* New Tabs Toolkit */}
                                    <SynthesisToolkit />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <AnimatePresence>
                    {editingBlock && <FloatingBlockEditor block={editingBlock} onClose={() => setEditingBlock(null)} />}
                </AnimatePresence>

                <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.8' } } }) }}>
                    {activeBlock ? <BlockCard block={activeBlock} isOverlay /> : null}
                </DragOverlay>
            </div>
        </DndContext>
    );
}

export default function SynthesisBoard() {
    return (
        <SynthesisProvider>
            <SynthesisBoardContent />
        </SynthesisProvider>
    );
}
