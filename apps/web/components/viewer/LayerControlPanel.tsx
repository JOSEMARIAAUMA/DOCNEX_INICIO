'use client';

import React from 'react';
import { Layers, StickyNote, Tags, Layout, Eye, Sparkles, CheckCircle2 } from 'lucide-react';

interface LayerControlPanelProps {
    showMapping: boolean;
    setShowMapping: (v: boolean) => void;
    showNotes: boolean;
    setShowNotes: (v: boolean) => void;
    showTags: boolean;
    setShowTags: (v: boolean) => void;
    showSubBlocks: boolean;
    setShowSubBlocks: (v: boolean) => void;
    showSupport: boolean;
    setShowSupport: (v: boolean) => void;
    showVersions: boolean;
    setShowVersions: (v: boolean) => void;
    showResearch: boolean;
    setShowResearch: (v: boolean) => void;
    showAudit: boolean;
    setShowAudit: (v: boolean) => void;
}

export function LayerControlPanel({
    showMapping, setShowMapping,
    showNotes, setShowNotes,
    showTags, setShowTags,
    showSubBlocks, setShowSubBlocks,
    showSupport, setShowSupport,
    showVersions, setShowVersions,
    showResearch, setShowResearch,
    showAudit, setShowAudit
}: LayerControlPanelProps) {
    const [isExpanded, setIsExpanded] = React.useState(false);

    return (
        <div className="absolute top-6 right-8 z-30 flex flex-col items-end gap-2">

            {/* Toggle / Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="bg-card border border-border shadow-lg rounded-full px-4 py-2 flex items-center gap-2 hover:bg-muted transition-all backdrop-blur-md bg-card/95 ring-1 ring-border/50 group"
            >
                <Layers className={`w-4 h-4 text-primary transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">
                    {isExpanded ? 'Ocultar Capas' : 'Capas de Información'}
                </span>
            </button>

            {/* Expanded Panel */}
            <div className={`
                bg-card border border-border shadow-2xl rounded-3xl p-3 flex flex-col gap-1 backdrop-blur-md bg-card/95 ring-1 ring-border/50 transition-all duration-300 origin-top-right
                ${isExpanded ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-4 pointer-events-none absolute top-full right-0 mt-2'}
            `}>
                <div className="grid grid-cols-1 gap-1">
                    <LayerToggle
                        active={showMapping}
                        onClick={() => setShowMapping(!showMapping)}
                        icon={<Layout className="w-4 h-4" />}
                        label="Mapeo Estructural"
                        color="text-blue-500"
                    />

                    <LayerToggle
                        active={showNotes}
                        onClick={() => setShowNotes(!showNotes)}
                        icon={<StickyNote className="w-4 h-4" />}
                        label="Notas de Revisión"
                        color="text-amber-500"
                    />

                    <LayerToggle
                        active={showSupport}
                        onClick={() => setShowSupport(!showSupport)}
                        icon={<Eye className="w-4 h-4" />}
                        label="Documentos Apoyo"
                        color="text-indigo-500"
                    />

                    <LayerToggle
                        active={showVersions}
                        onClick={() => setShowVersions(!showVersions)}
                        icon={<Layers className="w-4 h-4" />}
                        label="Versiones / Historial"
                        color="text-rose-500"
                    />

                    <LayerToggle
                        active={showTags}
                        onClick={() => setShowTags(!showTags)}
                        icon={<Tags className="w-4 h-4" />}
                        label="Etiquetas Semánticas"
                        color="text-emerald-500"
                    />

                    <LayerToggle
                        active={showSubBlocks}
                        onClick={() => setShowSubBlocks(!showSubBlocks)}
                        icon={<Layout className="w-4 h-4 rotate-90" />}
                        label="Mostrar Sub-bloques"
                        color="text-purple-500"
                    />

                    <LayerToggle
                        active={showResearch}
                        onClick={() => setShowResearch(!showResearch)}
                        icon={<Sparkles className="w-4 h-4" />}
                        label="Inteligencia Investigadora"
                        color="text-amber-400"
                    />

                    <LayerToggle
                        active={showAudit}
                        onClick={() => setShowAudit(!showAudit)}
                        icon={<CheckCircle2 className="w-4 h-4" />}
                        label="Auditoría Red Team"
                        color="text-emerald-400"
                    />
                </div>
            </div>
        </div>
    );
}

function LayerToggle({ active, onClick, icon, label, color }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, color: string }) {
    return (
        <button
            onClick={onClick}
            className={`
                group flex items-center gap-3 p-2 rounded-2xl transition-all w-48 text-left
                ${active
                    ? 'bg-primary/10 border border-primary/20 shadow-sm'
                    : 'hover:bg-muted border border-transparent opacity-60 hover:opacity-100'
                }
            `}
        >
            <div className={`
                w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300
                ${active ? 'bg-background shadow-md scale-105' : 'bg-muted/50'}
                ${active ? color : 'text-muted-foreground'}
            `}>
                {icon}
            </div>
            <div className="flex flex-col items-start overflow-hidden">
                <span className={`text-[11px] font-bold leading-tight ${active ? 'text-foreground' : 'text-muted-foreground'} truncate w-full`}>{label}</span>
                <span className="text-[9px] font-medium text-muted-foreground/60 leading-none mt-0.5">
                    {active ? 'CAPA ACTIVA' : 'OCULTO'}
                </span>
            </div>
            {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            )}
        </button>
    );
}
