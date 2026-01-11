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
    const [cloudUrl, setCloudUrl] = useState('');
    const [aiAnalysis, setAiAnalysis] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [resourceType, setResourceType] = useState<'file' | 'link'>('file');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            processWithAI(selected.name, `Contenido simulado del archivo para análisis técnico.`);
        }
    };

    const handleCloudSubmit = () => {
        if (!cloudUrl) return;
        processWithAI(cloudUrl, `Contenido extraído del enlace cloud: ${cloudUrl}`);
    };

    const processWithAI = async (title: string, text: string) => {
        setStep('analyzing');
        try {
            const analysis = await aiService.analyzeLibraryResource(text);
            setAiAnalysis(analysis);
            setStep('review');
        } catch (err) {
            console.error("AI Analysis failed:", err);
            setStep('review');
        }
    };

    const handleSave = async () => {
        if ((resourceType === 'file' && !file) || (resourceType === 'link' && !cloudUrl) || !aiAnalysis) return;
        setSaving(true);
        try {
            const extension = file?.name.split('.').pop()?.toLowerCase() || 'url';
            let kind: any = 'pdf';
            if (resourceType === 'link') {
                kind = cloudUrl.includes('google.com') ? 'google_doc' : 'url';
            } else {
                if (['xlsx', 'xls', 'csv'].includes(extension)) kind = 'spreadsheet';
                else if (['json', 'xml', 'html'].includes(extension)) kind = extension;
                else if (extension === 'md') kind = 'markdown';
                else if (extension === 'pptx') kind = 'powerpoint';
                else kind = extension === 'pdf' ? 'pdf' : 'docx';
            }

            await createResource(
                '',
                file?.name || cloudUrl.split('/').pop() || 'Nuevo Recurso',
                kind,
                {
                    range: 'REGIONAL',
                    compliance_type: 'OBLIGATORY',
                    jurisdiction: 'Andalucía',
                    summary: aiAnalysis.key_mandates?.join('. ') || '',
                    area: aiAnalysis.theme,
                    source_uri: cloudUrl || undefined
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
                            <div className="space-y-6">
                                <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10 w-fit mx-auto">
                                    <button
                                        onClick={() => setResourceType('file')}
                                        className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${resourceType === 'file' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        Subir Archivo
                                    </button>
                                    <button
                                        onClick={() => setResourceType('link')}
                                        className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${resourceType === 'link' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        Vincular Cloud (GDocs, ELI...)
                                    </button>
                                </div>

                                {resourceType === 'file' ? (
                                    <motion.div
                                        key="upload-file"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[2.5rem] py-20 group hover:border-primary/50 transition-colors cursor-pointer relative"
                                    >
                                        <input
                                            type="file"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={handleFileChange}
                                            accept=".pdf,.docx,.doc,.txt,.json,.xml,.html,.csv,.xlsx,.xls,.md,.pptx"
                                        />
                                        <div className="p-6 bg-primary/10 rounded-full mb-6 group-hover:scale-110 transition-transform duration-500">
                                            <Upload className="w-10 h-10 text-primary" />
                                        </div>
                                        <p className="text-lg font-bold mb-1">Arrastra el archivo maestro</p>
                                        <p className="text-sm text-muted-foreground">PDF, Word, Markdown, PowerPoint, XML, Excel o CSV</p>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="upload-link"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-4"
                                    >
                                        <div className="relative group">
                                            <Globe className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                            <input
                                                type="url"
                                                placeholder="https://docs.google.com/... o https://publications.europa.eu/..."
                                                value={cloudUrl}
                                                onChange={(e) => setCloudUrl(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 focus:border-primary/50 rounded-[2rem] pl-16 pr-8 py-6 outline-none text-sm transition-all"
                                            />
                                        </div>
                                        <button
                                            onClick={handleCloudSubmit}
                                            disabled={!cloudUrl}
                                            className="w-full py-4 bg-primary text-primary-foreground rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                                        >
                                            Analizar Enlace
                                        </button>
                                        <p className="text-[10px] text-center text-muted-foreground uppercase font-medium tracking-widest">Compatible con Google Workspace y Repositorios XML/ELI</p>
                                    </motion.div>
                                )}
                            </div>
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
