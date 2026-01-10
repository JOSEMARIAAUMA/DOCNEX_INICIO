'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Upload, Loader2, Sparkles, CheckCircle,
    AlertTriangle, Database, Globe, Scale, Bookmark
} from 'lucide-react';
import { aiService } from '@/lib/ai/service';
import { createResource } from '@/lib/api';

interface RegisterResourceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function RegisterResourceModal({ isOpen, onClose, onSuccess }: RegisterResourceModalProps) {
    const [step, setStep] = useState<'upload' | 'analyzing' | 'review'>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            processWithAI(selected);
        }
    };

    const processWithAI = async (file: File) => {
        setStep('analyzing');
        try {
            // Mocking text extraction for now, usually we'd parse PDF/Docx
            const text = `Documento: ${file.name}. Contenido simulado para análisis de normativa urbana y administrativa.`;
            const analysis = await aiService.analyzeLibraryResource(text);
            setAiAnalysis(analysis);
            setStep('review');
        } catch (err) {
            console.error("AI Analysis failed:", err);
            setStep('review');
        }
    };

    const handleSave = async () => {
        if (!file || !aiAnalysis) return;
        setSaving(true);
        try {
            // Create global resource (projectId = null)
            await createResource(
                '', // projectId empty for global
                file.name,
                'pdf', // Assuming PDF for now
                {
                    range: 'REGIONAL', // Default or from AI if we refine prompt
                    compliance_type: 'OBLIGATORY',
                    jurisdiction: 'Andalucía',
                    summary: aiAnalysis.key_mandates?.join('. ') || '',
                    area: aiAnalysis.theme
                }
            );
            onSuccess();
            onClose();
        } catch (err) {
            console.error("Failed to save resource:", err);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-2xl bg-card border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
            >
                <header className="p-8 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                            <Sparkles className="w-6 h-6 text-primary" /> Registrar en Repositorio
                        </h2>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Sincronización con el Bibliotecario AI</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-muted-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </header>

                <div className="flex-1 p-10">
                    <AnimatePresence mode="wait">
                        {step === 'upload' && (
                            <motion.div
                                key="upload"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[2.5rem] py-20 group hover:border-primary/50 transition-colors cursor-pointer relative"
                            >
                                <input
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={handleFileChange}
                                />
                                <div className="p-6 bg-primary/10 rounded-full mb-6 group-hover:scale-110 transition-transform duration-500">
                                    <Upload className="w-10 h-10 text-primary" />
                                </div>
                                <p className="text-lg font-bold mb-1">Arrastra la Norma o Documento</p>
                                <p className="text-sm text-muted-foreground">PDF, Word o TXT (MAX 50MB)</p>
                            </motion.div>
                        )}

                        {step === 'analyzing' && (
                            <motion.div
                                key="analyzing"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-20"
                            >
                                <div className="relative mb-10">
                                    <Loader2 className="w-20 h-20 text-primary animate-spin" />
                                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary/40" />
                                </div>
                                <h3 className="text-xl font-black mb-2 animate-pulse tracking-widest uppercase">Detectando Temática</h3>
                                <p className="text-sm text-muted-foreground max-w-xs text-center">
                                    El Analista AI está extrayendo los mandatos clave y clasificando la normativa...
                                </p>
                            </motion.div>
                        )}

                        {step === 'review' && aiAnalysis && (
                            <motion.div
                                key="review"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="space-y-8"
                            >
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 shadow-inner">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Bookmark className="w-4 h-4 text-primary" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tema Detectado</span>
                                        </div>
                                        <div className="text-lg font-black text-primary">{aiAnalysis.theme}</div>
                                        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">Perfil: {aiAnalysis.profile}</div>
                                    </div>
                                    <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 shadow-inner">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Globe className="w-4 h-4 text-primary" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Jurisdicción Sugerida</span>
                                        </div>
                                        <div className="text-lg font-black">Andalucía</div>
                                        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">Rango: Regional (LISTA)</div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                                        <Scale className="w-3.5 h-3.5" /> Mandatos Identificados
                                    </h4>
                                    <div className="flex flex-col gap-2">
                                        {aiAnalysis.key_mandates?.map((mandate: string, i: number) => (
                                            <div key={i} className="flex gap-3 items-start p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                                <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                                <span className="text-xs leading-relaxed">{mandate}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <footer className="p-8 border-t border-white/5 flex gap-4 bg-muted/20">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest border border-white/10 hover:bg-white/5 transition-all"
                    >
                        Cancelar
                    </button>
                    {step === 'review' && (
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-black"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                            Indexar Norma
                        </button>
                    )}
                </footer>
            </motion.div>
        </div>
    );
}
