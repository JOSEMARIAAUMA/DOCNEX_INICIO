'use client';

import React, { useState } from 'react';
import { Layout, Sparkles, Wand2, ArrowRight, CheckCircle2, ChevronRight, Hash, FileText, X } from 'lucide-react';

interface ScaffoldWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (objective: string) => Promise<void>;
    isGenerating: boolean;
    documentTitle: string;
}

export default function ScaffoldWizard({
    isOpen,
    onClose,
    onGenerate,
    isGenerating,
    documentTitle
}: ScaffoldWizardProps) {
    const [objective, setObjective] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#111111] border border-white/10 w-full max-w-2xl rounded-[2rem] shadow-[0_32px_64px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            <Layout className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Arquitecto Documental AI</h2>
                            <p className="text-xs text-white/40 mt-0.5">Generación Inteligente de Estructura</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-white/20 hover:text-white transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8">
                    {!isGenerating ? (
                        <div className="space-y-6">
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest block mb-2">Proyecto Seleccionado</span>
                                <h3 className="text-white font-bold">{documentTitle}</h3>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold text-white/60 uppercase tracking-widest ml-1">¿Cuál es el objetivo principal del documento?</label>
                                <textarea
                                    value={objective}
                                    onChange={(e) => setObjective(e.target.value)}
                                    placeholder="Ej: Redactar un informe de impacto sobre la nueva ley de vivienda andaluza enfocada en la simplificación administrativa..."
                                    className="w-full h-32 bg-black/40 border border-white/10 rounded-2xl p-5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-white/20 resize-none transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center text-center gap-2 group hover:bg-white/10 transition-all cursor-default">
                                    <Hash className="w-5 h-5 text-primary/60 group-hover:text-primary transition-colors" />
                                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">Jerarquía 3 Niveles</span>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center text-center gap-2 group hover:bg-white/10 transition-all cursor-default">
                                    <Sparkles className="w-5 h-5 text-primary/60 group-hover:text-primary transition-colors" />
                                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">Precisión Técnica</span>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center text-center gap-2 group hover:bg-white/10 transition-all cursor-default">
                                    <CheckCircle2 className="w-5 h-5 text-primary/60 group-hover:text-primary transition-colors" />
                                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">Validación de Gaps</span>
                                </div>
                            </div>

                            <button
                                onClick={() => onGenerate(objective)}
                                disabled={!objective.trim()}
                                className="w-full py-5 bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-[0_20px_40px_rgba(212,174,123,0.2)] flex items-center justify-center gap-3 disabled:opacity-30 disabled:hover:scale-100"
                            >
                                <Wand2 className="w-4 h-4" />
                                Generar Arquitectura Documental
                            </button>
                        </div>
                    ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 mb-8 relative">
                                <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
                                <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2 animate-pulse italic">Diseñando Estructura...</h3>
                            <p className="text-sm text-white/40 max-w-xs leading-relaxed">
                                El Arquitecto AI está analizando tu objetivo para crear una jerarquía técnica optimizada.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer Tip */}
                <div className="px-8 py-4 bg-white/5 border-t border-white/5 flex items-center justify-center gap-3">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">IA de Generación Estructural v3.0 [Proactive]</p>
                </div>
            </div>
        </div>
    );
}
