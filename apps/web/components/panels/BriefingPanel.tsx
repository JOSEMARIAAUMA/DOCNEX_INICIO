'use client';

import React, { useState } from 'react';
import { Lightbulb, Copy, Check, Globe, Image as ImageIcon, Sparkles, ExternalLink, Loader2 } from 'lucide-react';

interface BriefingPanelProps {
    briefing?: string;
    imagePrompts?: string;
    isLoading: boolean;
    onGenerate: () => void;
}

export default function BriefingPanel({ briefing, imagePrompts, isLoading, onGenerate }: BriefingPanelProps) {
    const [copiedBriefing, setCopiedBriefing] = useState(false);
    const [copiedImages, setCopiedImages] = useState(false);

    const handleCopy = (text: string, setter: (v: boolean) => void) => {
        navigator.clipboard.writeText(text);
        setter(true);
        setTimeout(() => setter(false), 2000);
    };

    if (!briefing && !imagePrompts && !isLoading) {
        return (
            <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lightbulb className="w-8 h-8 text-primary opacity-50" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Potenciación de Inteligencia</h3>
                <p className="text-xs text-muted-foreground leading-relaxed px-4">
                    Genera briefings estratégicos para expandir esta investigación en herramientas externas como NotebookLM o Midjourney.
                </p>
                <button
                    onClick={onGenerate}
                    className="w-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 py-2 rounded-lg flex items-center justify-center transition-all text-xs font-bold"
                >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generar Briefings
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 overflow-y-auto max-h-[80vh] scrollbar-thin">
            {/* External Research Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-emerald-500" />
                        <h3 className="text-xs font-black uppercase tracking-tighter text-emerald-500">Investigación en NotebookLM</h3>
                    </div>
                    {briefing && (
                        <button
                            onClick={() => handleCopy(briefing, setCopiedBriefing)}
                            className="p-1.5 hover:bg-muted rounded-md transition-all"
                        >
                            {copiedBriefing ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                        </button>
                    )}
                </div>
                {isLoading ? (
                    <div className="h-40 bg-muted/30 animate-pulse rounded-xl border border-dashed border-border flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-500/50" />
                    </div>
                ) : briefing ? (
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 text-[13px] leading-relaxed text-foreground/80 prose prose-invert prose-sm max-w-full">
                        <div dangerouslySetInnerHTML={{ __html: briefing.replace(/\n/g, '<br/>') }} />
                    </div>
                ) : null}
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground italic">
                    <ExternalLink className="w-3 h-3" />
                    <span>Usa este prompt en NotebookLM para expandir el alcance del expediente.</span>
                </div>
            </div>

            {/* Visual Annex Section */}
            <div className="space-y-4 border-t border-border pt-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-amber-500" />
                        <h3 className="text-xs font-black uppercase tracking-tighter text-amber-500">Anexo de Síntesis Visual</h3>
                    </div>
                    {imagePrompts && (
                        <button
                            onClick={() => handleCopy(imagePrompts, setCopiedImages)}
                            className="p-1.5 hover:bg-muted rounded-md transition-all"
                        >
                            {copiedImages ? <Check className="w-4 h-4 text-amber-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                        </button>
                    )}
                </div>
                {isLoading ? (
                    <div className="h-40 bg-muted/30 animate-pulse rounded-xl border border-dashed border-border flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-amber-500/50" />
                    </div>
                ) : imagePrompts ? (
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 text-[13px] leading-relaxed text-foreground/80 whitespace-pre-wrap font-mono text-[11px]">
                        {imagePrompts}
                    </div>
                ) : null}
            </div>

            <button
                onClick={onGenerate}
                disabled={isLoading}
                className="w-full text-[10px] uppercase font-bold tracking-widest border border-border py-2 rounded-lg hover:bg-muted disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-primary" />}
                {isLoading ? 'Analizando...' : 'Regenerar Briefings'}
            </button>
        </div>
    );
}
