'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Loader2, Save, Globe, Scale, Bookmark, Tag
} from 'lucide-react';
import { updateResource } from '@/lib/api';
import { RegulatoryResource } from './RegulatoryCard';

interface EditResourceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    resource: RegulatoryResource | null;
}

export default function EditResourceModal({ isOpen, onClose, onSuccess, resource }: EditResourceModalProps) {
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState('');
    const [theme, setTheme] = useState('');
    const [range, setRange] = useState<'ESTATAL' | 'REGIONAL' | 'SUBREGIONAL' | 'MUNICIPAL'>('REGIONAL');
    const [complianceType, setComplianceType] = useState<'OBLIGATORY' | 'RECOMMENDATION' | 'REFERENCE'>('OBLIGATORY');
    const [jurisdiction, setJurisdiction] = useState('');
    const [area, setArea] = useState('');
    const [summary, setSummary] = useState('');

    useEffect(() => {
        if (resource) {
            setTitle(resource.title || '');
            setTheme(resource.theme || '');
            setRange(resource.meta?.range || 'REGIONAL');
            setComplianceType(resource.meta?.compliance_type || 'OBLIGATORY');
            setJurisdiction(resource.meta?.jurisdiction || '');
            setArea(resource.meta?.area || '');
            setSummary(resource.meta?.summary || '');
        }
    }, [resource]);

    const handleSave = async () => {
        if (!resource) return;
        setSaving(true);
        try {
            await updateResource(resource.id, {
                title,
                theme,
                meta: {
                    ...resource.meta,
                    range,
                    compliance_type: complianceType,
                    jurisdiction,
                    area,
                    summary
                }
            });
            onSuccess();
            onClose();
        } catch (err) {
            console.error("Failed to update resource:", err);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen || !resource) return null;

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
                            <Tag className="w-6 h-6 text-primary" /> Editar Metadatos
                        </h2>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Refinar clasificación del recurso</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-muted-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </header>

                <div className="flex-1 p-8 overflow-y-auto max-h-[60vh] no-scrollbar">
                    <div className="space-y-6">
                        {/* Title */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Título del Recurso</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-primary/50 outline-none transition-all font-bold"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            {/* Compliance Type */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block flex items-center gap-2">
                                    <Scale className="w-3 h-3" /> Vinculación
                                </label>
                                <select
                                    value={complianceType}
                                    onChange={(e) => setComplianceType(e.target.value as any)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-primary/50 outline-none transition-all font-bold"
                                >
                                    <option value="OBLIGATORY">Obligatorio (Ley/Decreto)</option>
                                    <option value="RECOMMENDATION">Recomendado</option>
                                    <option value="REFERENCE">Referencia Técnica</option>
                                </select>
                            </div>

                            {/* Range */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block flex items-center gap-2">
                                    <Globe className="w-3 h-3" /> Ámbito
                                </label>
                                <select
                                    value={range}
                                    onChange={(e) => setRange(e.target.value as any)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-primary/50 outline-none transition-all font-bold"
                                >
                                    <option value="ESTATAL">Estatal</option>
                                    <option value="REGIONAL">Regional</option>
                                    <option value="SUBREGIONAL">Subregional</option>
                                    <option value="MUNICIPAL">Municipal</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            {/* Theme/Field */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block flex items-center gap-2">
                                    <Bookmark className="w-3 h-3" /> Temática
                                </label>
                                <input
                                    type="text"
                                    value={theme}
                                    onChange={(e) => setTheme(e.target.value)}
                                    placeholder="Ej: Urbanismo, Vivienda..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-primary/50 outline-none transition-all font-bold"
                                />
                            </div>

                            {/* Jurisdiction */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block flex items-center gap-2">
                                    <Globe className="w-3 h-3" /> Jurisdicción
                                </label>
                                <input
                                    type="text"
                                    value={jurisdiction}
                                    onChange={(e) => setJurisdiction(e.target.value)}
                                    placeholder="Ej: Andalucía, España..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-primary/50 outline-none transition-all font-bold"
                                />
                            </div>
                        </div>

                        {/* Summary */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Resumen / Descripción</label>
                            <textarea
                                value={summary}
                                onChange={(e) => setSummary(e.target.value)}
                                rows={3}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-primary/50 outline-none transition-all font-medium resize-none"
                            />
                        </div>
                    </div>
                </div>

                <footer className="p-8 border-t border-white/5 flex gap-4 bg-muted/20">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest border border-white/10 hover:bg-white/5 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-black"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Guardar Cambios
                    </button>
                </footer>
            </motion.div>
        </div>
    );
}
