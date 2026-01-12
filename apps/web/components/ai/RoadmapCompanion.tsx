'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Milestone,
    X,
    CheckCircle2,
    Circle,
    Clock,
    ChevronRight,
    Lightbulb,
    Plus,
    Loader2,
    RefreshCw,
    Maximize2,
    Minimize2
} from 'lucide-react';
import { useAIContext } from '@/hooks/use-ai-context';
import { cn } from '@/lib/utils';
import {
    getProjectRoadmapAction,
    generateProjectRoadmapAction,
    updateStepStatusAction
} from '@/actions/roadmap-actions';

type RoadmapStep = {
    id: string;
    order_index: number;
    title: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed';
};

type InteractionHandle = 'move' | 'n' | 's' | 'w' | 'e' | 'nw' | 'ne' | 'sw' | 'se' | null;

export function RoadmapCompanion() {
    const context = useAIContext();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [roadmap, setRoadmap] = useState<any>(null);
    const [mounted, setMounted] = useState(false);

    // Window state
    const [pos, setPos] = useState({ x: window.innerWidth - 880, y: window.innerHeight - 680 });
    const [size, setSize] = useState({ w: 400, h: 600 });
    const [isExpanded, setIsExpanded] = useState(true);
    const [initialized, setInitialized] = useState(false);

    const isInteracting = useRef(false);
    const interactionRef = useRef<{
        handle: InteractionHandle;
        startX: number;
        startY: number;
        startPos: { x: number, y: number };
        startSize: { w: number, h: number };
    }>({
        handle: null,
        startX: 0,
        startY: 0,
        startPos: { x: 0, y: 0 },
        startSize: { w: 0, h: 0 }
    });

    useEffect(() => {
        setMounted(true);
        // Load position from localStorage
        const saved = localStorage.getItem('docnex_roadmap_config');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                setPos(config.pos || pos);
                setSize(config.size || size);
                setIsOpen(config.isOpen || false);
            } catch (e) { }
        }
        setInitialized(true);
    }, []);

    useEffect(() => {
        if (!initialized) return;
        localStorage.setItem('docnex_roadmap_config', JSON.stringify({ pos, size, isOpen }));
    }, [pos, size, isOpen, initialized]);

    const fetchRoadmap = useCallback(async () => {
        if (!context.projectId || context.projectId === 'global') return;
        setLoading(true);
        try {
            const result = await getProjectRoadmapAction(context.projectId);
            if (result.success) {
                setRoadmap(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch roadmap', error);
        } finally {
            setLoading(false);
        }
    }, [context.projectId]);

    useEffect(() => {
        if (isOpen && context.projectId) {
            fetchRoadmap();
        }
    }, [isOpen, context.projectId, fetchRoadmap]);

    const handleGenerate = async () => {
        if (!context.projectId) return;
        setLoading(true);
        try {
            const title = context.metadata?.title || "Proyecto sin título";
            const description = "Generado automáticamente desde el dashboard.";
            await generateProjectRoadmapAction(context.projectId, title, description);
            await fetchRoadmap();
        } catch (error) {
            console.error('Failed to generate roadmap', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (stepId: string, currentStatus: string) => {
        let newStatus: 'pending' | 'in_progress' | 'completed' = 'completed';
        if (currentStatus === 'completed') newStatus = 'pending';
        else if (currentStatus === 'pending') newStatus = 'in_progress';

        try {
            const result = await updateStepStatusAction(stepId, newStatus);
            if (result.success) {
                setRoadmap((prev: any) => ({
                    ...prev,
                    roadmap_steps: prev.roadmap_steps.map((s: any) =>
                        s.id === stepId ? { ...s, status: newStatus } : s
                    )
                }));
            }
        } catch (error) {
            console.error('Failed to update step', error);
        }
    };

    // Interaction logic (same as AI Companion)
    const startInteraction = useCallback((handle: InteractionHandle, e: React.MouseEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        isInteracting.current = true;
        interactionRef.current = {
            handle,
            startX: e.clientX,
            startY: e.clientY,
            startPos: { ...pos },
            startSize: { ...size }
        };

        const onMouseMove = (ev: MouseEvent) => {
            if (!isInteracting.current) return;
            const { handle, startX, startY, startPos, startSize } = interactionRef.current;
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;

            let nx = startPos.x;
            let ny = startPos.y;
            let nw = startSize.w;
            let nh = startSize.h;

            if (handle === 'move') {
                nx = startPos.x + dx;
                ny = startPos.y + dy;
            } else {
                if (handle?.includes('e')) nw = Math.max(300, startSize.w + dx);
                if (handle?.includes('s')) nh = Math.max(200, startSize.h + dy);
                if (handle?.includes('w')) {
                    const diff = startSize.w - dx;
                    if (diff > 300) { nw = diff; nx = startPos.x + dx; }
                }
                if (handle?.includes('n')) {
                    const diff = startSize.h - dy;
                    if (diff > 200) { nh = diff; ny = startPos.y + dy; }
                }
            }

            setPos({ x: nx, y: ny });
            if (handle !== 'move') setSize({ w: nw, h: nh });
        };

        const onMouseUp = () => {
            isInteracting.current = false;
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = 'default';
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        if (handle !== 'move' && handle) {
            const cursorMap: any = { n: 'ns-resize', s: 'ns-resize', w: 'ew-resize', e: 'ew-resize', nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize' };
            document.body.style.cursor = cursorMap[handle] || 'default';
        }
    }, [pos, size]);

    if (!mounted) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[9998]">
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={() => setIsOpen(true)}
                        className="pointer-events-auto absolute bottom-8 right-32 w-16 h-16 rounded-2xl bg-[#1e1e20] border border-white/10 shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-primary group overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
                        <Milestone className="w-8 h-8 relative z-10 group-hover:rotate-12 transition-transform" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-[#1e1e20]" />
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        style={{
                            left: pos.x,
                            top: pos.y,
                            width: size.w,
                            height: isExpanded ? size.h : 64,
                            position: 'absolute'
                        }}
                        className="pointer-events-auto bg-[#0d0d0f] border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.8)] rounded-3xl flex flex-col overflow-hidden select-none"
                    >
                        {/* RESIZE HANDLES */}
                        {isExpanded && (
                            <>
                                <div onMouseDown={(e) => startInteraction('n', e)} className="absolute -top-1 left-4 right-4 h-3 cursor-ns-resize z-[1001]" />
                                <div onMouseDown={(e) => startInteraction('s', e)} className="absolute -bottom-1 left-4 right-4 h-3 cursor-ns-resize z-[1001]" />
                                <div onMouseDown={(e) => startInteraction('w', e)} className="absolute top-4 bottom-4 -left-1 w-3 cursor-ew-resize z-[1001]" />
                                <div onMouseDown={(e) => startInteraction('e', e)} className="absolute top-4 bottom-4 -right-1 w-3 cursor-ew-resize z-[1001]" />
                                <div onMouseDown={(e) => startInteraction('se', e)} className="absolute -bottom-1 -right-1 w-10 h-10 cursor-nwse-resize z-[1002] flex items-end justify-end p-2.5 group">
                                    <div className="w-3 h-3 border-r-2 border-b-2 border-white/20 group-hover:border-primary transition-colors" />
                                </div>
                            </>
                        )}

                        {/* HEADER */}
                        <div
                            onMouseDown={(e) => startInteraction('move', e)}
                            className="p-5 flex items-center justify-between bg-white/[0.03] border-b border-white/5 cursor-move shrink-0"
                        >
                            <div className="flex items-center gap-3.5">
                                <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                                    <Milestone className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">Hoja de Ruta</span>
                                    <span className="text-sm font-bold text-white">Planificación Dinámica</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button onClick={() => setIsExpanded(!isExpanded)} className="p-2.5 hover:bg-white/10 rounded-xl text-white/40 transition-all">
                                    {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                </button>
                                <button onClick={() => setIsOpen(false)} className="p-2.5 hover:bg-red-500/20 hover:text-red-400 rounded-xl text-white/40 transition-all">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="flex-1 overflow-hidden flex flex-col">
                                {/* CONTENT */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                    {loading && !roadmap && (
                                        <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-50">
                                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                            <p className="text-xs font-bold uppercase tracking-widest">Cargando Estrategia...</p>
                                        </div>
                                    )}

                                    {!loading && !roadmap && (
                                        <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6">
                                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                                <Plus className="w-8 h-8 text-white/20" />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-sm font-bold text-white">No hay plan activo</h3>
                                                <p className="text-xs text-white/40 leading-relaxed">Genera un roadmap adaptado a los objetivos de tu proyecto actual.</p>
                                            </div>
                                            <button
                                                onClick={handleGenerate}
                                                className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
                                            >
                                                Generar Hoja de Ruta
                                            </button>
                                        </div>
                                    )}

                                    {roadmap && (
                                        <div className="space-y-8 pb-8">
                                            <div className="space-y-4">
                                                {roadmap.roadmap_steps?.map((step: RoadmapStep, idx: number) => (
                                                    <div
                                                        key={step.id}
                                                        className={cn(
                                                            "relative pl-8 group cursor-pointer",
                                                            step.status === 'completed' ? "opacity-60" : "opacity-100"
                                                        )}
                                                        onClick={() => handleToggleStatus(step.id, step.status)}
                                                    >
                                                        {/* Step Connector */}
                                                        {idx !== roadmap.roadmap_steps.length - 1 && (
                                                            <div className="absolute left-[11px] top-7 bottom-[-24px] w-0.5 bg-white/5 group-hover:bg-primary/20 transition-colors" />
                                                        )}

                                                        {/* Step Icon */}
                                                        <div className={cn(
                                                            "absolute left-0 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                                            step.status === 'completed'
                                                                ? "bg-green-500 border-green-500 text-white"
                                                                : (step.status === 'in_progress' ? "bg-primary/20 border-primary text-primary animate-pulse" : "bg-white/5 border-white/10 text-white/20")
                                                        )}>
                                                            {step.status === 'completed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : (step.status === 'in_progress' ? <Clock className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />)}
                                                        </div>

                                                        {/* Step Details */}
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <h4 className={cn(
                                                                    "text-sm font-bold tracking-tight transition-colors",
                                                                    step.status === 'completed' ? "text-white/40 line-through" : "text-white group-hover:text-primary"
                                                                )}>
                                                                    Paso {step.order_index}: {step.title}
                                                                </h4>
                                                            </div>
                                                            <p className="text-xs text-white/40 leading-relaxed font-medium">
                                                                {step.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* SUGGESTIONS SECTION */}
                                            {roadmap.suggestions && roadmap.suggestions.length > 0 && (
                                                <div className="pt-6 border-t border-white/5 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                    <div className="flex items-center gap-2">
                                                        <Lightbulb className="w-4 h-4 text-yellow-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Sugerencias Estratégicas</span>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {roadmap.suggestions.map((s: string, idx: number) => (
                                                            <div key={idx} className="p-4 rounded-2xl bg-yellow-500/[0.03] border border-yellow-500/10 flex gap-3 group hover:border-yellow-500/30 transition-all">
                                                                <div className="shrink-0 pt-0.5">
                                                                    <RefreshCw className="w-3 h-3 text-yellow-500 group-hover:rotate-180 transition-transform duration-700" />
                                                                </div>
                                                                <p className="text-[11px] font-bold text-white/70 leading-relaxed italic">
                                                                    {s}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* FOOTER ACTIONS */}
                                <div className="p-5 bg-white/[0.02] border-t border-white/5 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-2 text-[9px] font-black text-white/20 uppercase">
                                        <Loader2 className={cn("w-3 h-3", loading ? "animate-spin" : "hidden")} />
                                        <span>Estado del Plan: {roadmap ? (roadmap.roadmap_steps?.every((s: any) => s.status === 'completed') ? 'Finalizado' : 'En Curso') : 'Inactivo'}</span>
                                    </div>
                                    <button
                                        onClick={fetchRoadmap}
                                        className="p-2 rounded-lg hover:bg-white/5 text-white/20 hover:text-white transition-all flex items-center gap-2"
                                        title="Sincronizar Progreso"
                                    >
                                        <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Actualizar</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.03); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(var(--primary-rgb), 0.2); }
            `}</style>
        </div>
    );
}
