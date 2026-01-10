'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/UiCard";
import { Button } from "@/components/ui/UiButton";
import { Wand2, Save, RotateCcw } from "lucide-react";

export interface AIContext {
    role: string;
    tone: 'formal' | 'tecnico' | 'casual' | 'legal';
    objective: string;
    customInstructions: string;
}

const DEFAULT_CONTEXT: AIContext = {
    role: 'Asistente Experto en Análisis Documental',
    tone: 'formal',
    objective: 'Ayudar al usuario a comprender, organizar y refinar documentos complejos con precisión y claridad.',
    customInstructions: '',
};

export default function AIContextConfig() {
    const [context, setContext] = useState<AIContext>(DEFAULT_CONTEXT);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('docnex_ai_context');
        if (saved) {
            try {
                setContext(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load AI context", e);
            }
        }
    }, []);

    const handleSave = () => {
        setIsSaving(true);
        localStorage.setItem('docnex_ai_context', JSON.stringify(context));
        setHasChanges(false);
        setTimeout(() => setIsSaving(false), 500);
    };

    const handleReset = () => {
        if (confirm('¿Estás seguro de que quieres restablecer el ADN de la IA a los valores por defecto?')) {
            setContext(DEFAULT_CONTEXT);
            setHasChanges(true);
        }
    };

    const updateContext = (updates: Partial<AIContext>) => {
        setContext(prev => ({ ...prev, ...updates }));
        setHasChanges(true);
    };

    return (
        <Card className="bg-card border-border shadow-md">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Wand2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">ADN de la IA</CardTitle>
                            <CardDescription>
                                Define la personalidad y comportamiento global de la inteligencia artificial.
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleReset}
                            className="flex items-center gap-2"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Restablecer
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={!hasChanges || isSaving}
                            className="flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Rol de la IA</label>
                        <input
                            type="text"
                            value={context.role}
                            onChange={(e) => updateContext({ role: e.target.value })}
                            placeholder="Ej: Abogado Senior, Consultor Estratégico..."
                            className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary transition-all text-sm"
                        />
                        <p className="text-[10px] text-muted-foreground italic">
                            Define quién cree ser la IA al responder.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Tono de Voz</label>
                        <select
                            value={context.tone}
                            onChange={(e) => updateContext({ tone: e.target.value as any })}
                            className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary transition-all text-sm appearance-none"
                        >
                            <option value="formal">Formal y Profesional</option>
                            <option value="tecnico">Altamente Técnico</option>
                            <option value="legal">Legal / Normativo</option>
                            <option value="casual">Casual y Directo</option>
                        </select>
                        <p className="text-[10px] text-muted-foreground italic">
                            Ajusta el estilo lingüístico de las respuestas.
                        </p>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Objetivo Principal</label>
                    <textarea
                        value={context.objective}
                        onChange={(e) => updateContext({ objective: e.target.value })}
                        placeholder="Define qué busca lograr la IA con sus intervenciones..."
                        rows={2}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary transition-all text-sm resize-none"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Instrucciones Adicionales (Prompt Engineering)</label>
                    <textarea
                        value={context.customInstructions}
                        onChange={(e) => updateContext({ customInstructions: e.target.value })}
                        placeholder="Instrucciones específicas permanentes (ej: 'Responde siempre en español de España', 'Evita el uso de jerga innecesaria')..."
                        rows={3}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary transition-all text-sm"
                    />
                </div>
            </CardContent>
        </Card>
    );
}
