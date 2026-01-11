'use client';

import React, { useEffect, useState } from 'react';
import { fetchResourceContent } from '@/lib/api';
import { FileText, Loader2, AlertCircle } from 'lucide-react';

interface ResourceIntegratedViewerProps {
    resourceId: string;
    title: string;
}

export function ResourceIntegratedViewer({ resourceId, title }: ResourceIntegratedViewerProps) {
    const [content, setContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadContent() {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchResourceContent(resourceId);
                setContent(data.content);
            } catch (err) {
                console.error('Error loading resource content:', err);
                setError('No se pudo cargar el contenido del recurso.');
            } finally {
                setLoading(false);
            }
        }
        loadContent();
    }, [resourceId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin opacity-50" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cargando recurso...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-red-500">
                <AlertCircle className="w-8 h-8 opacity-50" />
                <p className="text-sm font-medium">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-border pb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-foreground">{title}</h2>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Documento de Apoyo</p>
                </div>
            </div>

            <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap leading-relaxed text-foreground/80">
                    {content}
                </div>
            </div>

            <div className="mt-12 pt-6 border-t border-border/20 flex justify-center opacity-20 select-none">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Fin del Recurso</span>
            </div>
        </div>
    );
}
