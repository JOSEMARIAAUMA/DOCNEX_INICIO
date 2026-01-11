'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/UiCard";
import { Button } from "@/components/ui/UiButton";
import { Wand2, Save, RotateCcw, Plus, Trash2, User, Copy, Check, Sparkles } from "lucide-react";
import { AIContext, AIProfile } from "@/types/ai";

const AGENTE_BASE_CONTEXT: AIContext = {
    role: 'Asistente Ejecutivo Senior especializado en Gestión Documental, Derecho y Análisis Técnico',
    tone: 'formal',
    objective: 'Asistir de manera integral en la creación, estructuración, análisis y refinamiento de documentos complejos, asegurando coherencia semántica, rigor jurídico y claridad técnica.',
    customInstructions: `1. **Gestión de Documentos Largos**: Mantén siempre el contexto global del documento. Si se analiza una sección, relaciónala con los objetivos generales del texto.
2. **Mapeo y Estructura**: Al sugerir cambios, respeta y refuerza la jerarquía del documento (Títulos, Artículos, Cláusulas). Sugiere mejoras en la organización lógica si detectas fragmentación.
3. **Análisis Semántico**: Identifica contradicciones, términos ambiguos o definiciones inconsistentes a lo largo del texto.
4. **Redacción Técnica y Jurídica**: Privilegia la precisión sobre la ornamentación. Usa terminología estándar del sector (legal, ingenieril o corporativo) según corresponda. Evita la voz pasiva innecesaria.
5. **Formato de Salida**: Presenta tus respuestas de forma estructurada (Bullet points para listas, Tablas para comparaciones, Negrillas para conceptos clave).
6. **Planificación**: Si se solicita un plan o reporte, desglósalo en pasos accionables con responsables y entregables claros.
7. **Neutralidad**: Mantén una postura objetiva. Si das una opinión, fundamentala en el texto o en principios generales aceptados.`
};


const DEFAULT_PROFILES: AIProfile[] = [
    {
        id: 'default-base',
        name: 'Agente Base (DocNex)',
        description: 'Perfil maestro optimizado para gestión documental general, análisis y redacción técnica.',
        context: AGENTE_BASE_CONTEXT,
        is_active: true,
        last_modified: Date.now()
    },
    {
        id: 'legal-advisor',
        name: 'Asesor Legal',
        description: 'Especialista en revisión de contratos y búsqueda de riesgos legales.',
        context: {
            role: 'Abogado Senior Especialista en Derecho Corporativo y Contractual',
            tone: 'legal',
            objective: 'Analizar documentos con rigor jurídico estricto, identificando riesgos, cláusulas abusivas y lagunas legales.',
            customInstructions: 'Cita normativa aplicable cuando sea pertinente. Prioriza la protección legal de la parte representada.'
        },
        is_active: false,
        last_modified: Date.now()
    }
];

export default function AIContextConfig() {
    const [profiles, setProfiles] = useState<AIProfile[]>(DEFAULT_PROFILES);
    const [selectedProfileId, setSelectedProfileId] = useState<string>('default-base');
    const [isSaving, setIsSaving] = useState(false);

    // Derived state for the active profile being edited
    const activeEditingProfile = profiles.find(p => p.id === selectedProfileId) || profiles[0];

    useEffect(() => {
        const savedProfiles = localStorage.getItem('docnex_ai_profiles');
        if (savedProfiles) {
            try {
                const parsed = JSON.parse(savedProfiles);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setProfiles(parsed);
                    const active = parsed.find((p: AIProfile) => p.is_active);
                    if (active) setSelectedProfileId(active.id);
                }
            } catch (e) {
                console.error("Failed to load AI profiles", e);
            }
        } else {
            // First time: save defaults
            localStorage.setItem('docnex_ai_profiles', JSON.stringify(DEFAULT_PROFILES));
            // Also save the legacy context for backward compatibility just in case
            localStorage.setItem('docnex_ai_context', JSON.stringify(AGENTE_BASE_CONTEXT));
        }
    }, []);

    const saveToLocalStorage = (newProfiles: AIProfile[]) => {
        localStorage.setItem('docnex_ai_profiles', JSON.stringify(newProfiles));

        // Sync active profile to legacy key for simple hooks
        const active = newProfiles.find(p => p.is_active);
        if (active) {
            localStorage.setItem('docnex_ai_context', JSON.stringify(active.context));
            // Trigger update in other components
            window.dispatchEvent(new Event('ai_context_updated'));
        }
    };

    const handleCreateProfile = () => {
        const newProfile: AIProfile = {
            id: crypto.randomUUID(),
            name: 'Nuevo Agente',
            description: 'Perfil personalizado',
            context: { ...AGENTE_BASE_CONTEXT, role: 'Nuevo Asistente' },
            is_active: false,
            last_modified: Date.now()
        };
        const updated = [...profiles, newProfile];
        setProfiles(updated);
        setSelectedProfileId(newProfile.id);
        saveToLocalStorage(updated);
    };

    const handleDeleteProfile = (id: string) => {
        if (profiles.length <= 1) {
            alert("Debe existir al menos un perfil.");
            return;
        }
        if (confirm('¿Eliminar este perfil?')) {
            const updated = profiles.filter(p => p.id !== id);
            setProfiles(updated);
            // If we deleted the selected one, select the first available
            if (id === selectedProfileId) {
                setSelectedProfileId(updated[0].id);
            }
            saveToLocalStorage(updated);
        }
    };

    const handleActivateProfile = (id: string) => {
        const updated = profiles.map(p => ({
            ...p,
            is_active: p.id === id
        }));
        setProfiles(updated);
        setSelectedProfileId(id);
        saveToLocalStorage(updated);

        // Visual feedback
        const btn = document.getElementById(`activate-btn-${id}`);
        if (btn) {
            btn.innerText = "¡Activado!";
            setTimeout(() => btn.innerText = "Activar", 1000);
        }
    };

    const updateCurrentProfile = (field: keyof AIProfile | 'context', value: any) => {
        const updated = profiles.map(p => {
            if (p.id === selectedProfileId) {
                if (field === 'context') {
                    return { ...p, context: { ...p.context, ...value }, last_modified: Date.now() };
                }
                return { ...p, [field]: value, last_modified: Date.now() };
            }
            return p;
        });
        setProfiles(updated);
    };

    const handleSaveManual = () => {
        setIsSaving(true);
        saveToLocalStorage(profiles);
        setTimeout(() => setIsSaving(false), 500);
    };

    return (
        <div className="flex gap-6 h-[600px]">
            {/* Sidebar: Profile List */}
            <div className="w-1/3 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Perfiles (Gems)</h3>
                    <Button variant="ghost" size="sm" onClick={handleCreateProfile}>
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {profiles.map(profile => (
                        <div
                            key={profile.id}
                            onClick={() => setSelectedProfileId(profile.id)}
                            className={`group relative p-3 rounded-xl border cursor-pointer transition-all ${selectedProfileId === profile.id
                                ? 'bg-primary/5 border-primary shadow-sm'
                                : 'bg-card border-border hover:border-primary/50'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-1">
                                <span className="font-semibold text-sm truncate pr-2">{profile.name}</span>
                                {profile.is_active && (
                                    <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold uppercase tracking-widest shrink-0">
                                        Activo
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {profile.description}
                            </p>

                            {/* Actions on hover */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                {!profile.is_active && (
                                    <button
                                        id={`activate-btn-${profile.id}`}
                                        onClick={(e) => { e.stopPropagation(); handleActivateProfile(profile.id); }}
                                        className="p-1.5 bg-green-500 text-white rounded-md hover:scale-110 transition-transform"
                                        title="Activar este perfil"
                                    >
                                        <Check className="w-3 h-3" />
                                    </button>
                                )}
                                {profiles.length > 1 && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteProfile(profile.id); }}
                                        className="p-1.5 bg-destructive text-destructive-foreground rounded-md hover:scale-110 transition-transform"
                                        title="Eliminar perfil"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Area: Editor */}
            <Card className="flex-1 bg-card border-border shadow-md flex flex-col overflow-hidden">
                <CardHeader className="border-b border-border py-4 bg-muted/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <input
                                    className="text-lg font-bold bg-transparent border-none outline-none focus:underline decoration-primary underline-offset-4"
                                    value={activeEditingProfile.name}
                                    onChange={(e) => updateCurrentProfile('name', e.target.value)}
                                />
                                <input
                                    className="text-xs text-muted-foreground bg-transparent border-none outline-none w-full"
                                    value={activeEditingProfile.description}
                                    onChange={(e) => updateCurrentProfile('description', e.target.value)}
                                />
                            </div>
                        </div>
                        <Button
                            size="sm"
                            onClick={handleSaveManual}
                            disabled={isSaving}
                            className="flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Rol Virtual</label>
                            <input
                                type="text"
                                value={activeEditingProfile.context.role}
                                onChange={(e) => updateCurrentProfile('context', { role: e.target.value })}
                                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tono de Comunicación</label>
                            <select
                                value={activeEditingProfile.context.tone}
                                onChange={(e) => updateCurrentProfile('context', { tone: e.target.value })}
                                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                            >
                                <option value="formal">👔 Formal Corporativo</option>
                                <option value="tecnico">🔧 Técnico / Ingenieril</option>
                                <option value="legal">⚖️ Legal / Jurídico</option>
                                <option value="casual">👋 Casual / Directo</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Objetivo Principal</label>
                        <textarea
                            value={activeEditingProfile.context.objective}
                            onChange={(e) => updateCurrentProfile('context', { objective: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none leading-relaxed"
                        />
                    </div>

                    <div className="space-y-2 flex-1 flex flex-col min-h-0">
                        <label className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                            <Wand2 className="w-3 h-3" />
                            Ingeniería de Prompts (Instrucciones)
                        </label>
                        <textarea
                            value={activeEditingProfile.context.customInstructions}
                            onChange={(e) => updateCurrentProfile('context', { customInstructions: e.target.value })}
                            placeholder="Escribe instrucciones precisas para guiar el comportamiento del modelo..."
                            className="flex-1 min-h-[200px] p-4 bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-mono leading-relaxed resize-none"
                        />
                        <p className="text-[10px] text-muted-foreground text-right">
                            *Estas instrucciones se inyectan en cada interacción con la IA.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
