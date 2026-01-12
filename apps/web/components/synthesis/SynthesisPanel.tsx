'use client';

import React, { useState } from 'react';
import { Send, FileText, Download, Sparkles, AlertCircle, CheckCircle2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface SynthesisPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: () => Promise<void>;
    synthesizedContent?: string;
    isGenerating: boolean;
}

export default function SynthesisPanel({
    isOpen,
    onClose,
    onGenerate,
    synthesizedContent,
    isGenerating
}: SynthesisPanelProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-5xl h-full max-h-[90vh] rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden ring-1 ring-white/5">

                {/* Header */}
                <div className="h-20 border-b border-white/5 px-8 flex items-center justify-between bg-gradient-to-r from-black to-[#050505]">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-[#d4ae7b]/10 border border-[#d4ae7b]/20 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-[#d4ae7b]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Motor de Síntesis Ejecutiva</h2>
                            <p className="text-[10px] text-[#d4ae7b] uppercase font-black tracking-widest mt-0.5 opacity-60">Generación de Informe Final 10/10</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-white/5 rounded-2xl text-white/40 hover:text-white transition-all"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                    {!synthesizedContent && !isGenerating ? (
                        <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                            <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-8 shadow-2xl ring-1 ring-primary/20">
                                <FileText className="w-10 h-10 text-primary" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-4 italic">¿Listo para el impacto?</h3>
                            <p className="text-sm text-white/40 leading-relaxed mb-10">
                                La IA consolidará todos los bloques, hallazgos de investigación y resultados de auditoría en un informe ejecutivo profesional listo para su entrega.
                            </p>
                            <button
                                onClick={onGenerate}
                                className="w-full py-5 bg-primary text-primary-foreground rounded-2xl font-bold text-sm tracking-widest uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-[0_20px_40px_rgba(212,174,123,0.3)] flex items-center justify-center gap-3 group"
                            >
                                <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                Iniciar Lanzamiento de Síntesis
                            </button>
                        </div>
                    ) : isGenerating ? (
                        <div className="h-full flex flex-col items-center justify-center">
                            <div className="relative w-32 h-32 mb-12">
                                <div className="absolute inset-0 rounded-full border-4 border-[#d4ae7b]/10" />
                                <div className="absolute inset-0 rounded-full border-4 border-t-[#d4ae7b] animate-spin" />
                                <div className="absolute inset-4 rounded-full border-4 border-[#d4ae7b]/5 animate-pulse" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles className="w-10 h-10 text-[#d4ae7b] animate-bounce" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3 animate-pulse italic">Orquestando Inteligencia...</h3>
                            <div className="flex flex-col gap-2 items-center">
                                <p className="text-xs text-white/40 uppercase tracking-[0.2em]">Consolidando Bloques</p>
                                <p className="text-xs text-white/40 uppercase tracking-[0.2em] opacity-50">Validando Auditoría</p>
                                <p className="text-xs text-white/40 uppercase tracking-[0.2em] opacity-30">Aplicando Tono Consultoría</p>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="prose prose-invert prose-amber max-w-none bg-white/[0.02] p-10 rounded-[2.5rem] border border-white/5 shadow-inner leading-relaxed">
                                <ReactMarkdown>
                                    {synthesizedContent || ''}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {synthesizedContent && !isGenerating && (
                    <div className="h-24 border-t border-white/5 px-12 flex items-center justify-between bg-black/40">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Informe listo para exportación</span>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={onGenerate}
                                className="px-6 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all text-[11px] font-bold uppercase tracking-widest"
                            >
                                Regenerar Síntesis
                            </button>
                            <button className="px-8 py-3 bg-[#d4ae7b] text-black rounded-xl font-bold text-[11px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg flex items-center gap-2">
                                <Download className="w-4 h-4" />
                                Descargar Informe (PDF)
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
