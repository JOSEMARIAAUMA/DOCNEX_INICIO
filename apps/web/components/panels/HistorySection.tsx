'use client';

import { useState, useEffect } from 'react';
import { DocumentHistory } from '@docnex/shared';
import { listDocumentHistory } from '@/lib/api';
import { restoreDocumentFromHistory } from '@/actions/documents';
import { LucideHistory, LucideRotateCcw, LucideFileText, LucideLayoutGrid, LucideRefreshCcw } from 'lucide-react';

interface HistorySectionProps {
    documentId: string;
    onRestore: () => void;
    refreshTrigger?: number;
}

export default function HistorySection({ documentId, onRestore, refreshTrigger = 0 }: HistorySectionProps) {
    const [history, setHistory] = useState<DocumentHistory[]>([]);
    const [loading, setLoading] = useState(false);
    const [restoringId, setRestoringId] = useState<string | null>(null);

    useEffect(() => {
        if (documentId) {
            loadHistory();
        }
    }, [documentId, refreshTrigger]);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const data = await listDocumentHistory(documentId);
            setHistory(data);
        } catch (err) {
            console.error('Error loading history:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (historyId: string) => {
        if (!confirm('¿Estás seguro de que deseas restaurar este estado? El contenido actual será reemplazado (pero se guardará un respaldo automático en este historial).')) {
            return;
        }

        setRestoringId(historyId);
        try {
            const res = await restoreDocumentFromHistory(historyId);
            if (res.success) {
                onRestore();
                await loadHistory();
            }
        } catch (err) {
            console.error('Error restoring from history:', err);
            alert('Error al restaurar: ' + (err as Error).message);
        } finally {
            setRestoringId(null);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getActionIcon = (type: string) => {
        switch (type) {
            case 'import_replace': return <LucideRefreshCcw className="w-3 h-3 text-red-500" />;
            case 'import_merge': return <LucideLayoutGrid className="w-3 h-3 text-amber-500" />;
            case 'restore': return <LucideRotateCcw className="w-3 h-3 text-blue-500" />;
            default: return <LucideFileText className="w-3 h-3 text-muted-foreground" />;
        }
    };

    const getActionLabel = (type: string) => {
        switch (type) {
            case 'import_replace': return 'Sustitución';
            case 'import_merge': return 'Fusión';
            case 'restore': return 'Restauración';
            default: return 'Edición';
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                    <LucideHistory className="w-4 h-4 text-primary" />
                    Historial de Cambios
                </h3>
                <button
                    onClick={loadHistory}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title="Refrescar historial"
                >
                    <LucideRefreshCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {loading && history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <LucideRefreshCcw className="w-6 h-6 animate-spin mb-2" />
                    <p className="text-xs italic">Cargando eventos...</p>
                </div>
            ) : history.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <p className="text-xs text-muted-foreground italic">No hay eventos registrados en el historial todavía.</p>
                </div>
            ) : (
                <div className="space-y-3 max-h-[600px] overflow-auto pr-1">
                    {history.map((item) => (
                        <div
                            key={item.id}
                            className="bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-colors group relative"
                        >
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 p-1.5 bg-muted rounded-full">
                                    {getActionIcon(item.action_type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                            {getActionLabel(item.action_type)}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                            {formatDate(item.created_at)}
                                        </span>
                                    </div>
                                    <p className="text-xs font-medium text-foreground mt-0.5 leading-snug">
                                        {item.description}
                                    </p>

                                    {item.snapshot && (
                                        <div className="mt-2 flex items-center gap-2">
                                            <button
                                                onClick={() => handleRestore(item.id)}
                                                disabled={restoringId !== null}
                                                className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded text-[10px] font-bold transition-all disabled:opacity-50"
                                            >
                                                {restoringId === item.id ? (
                                                    <LucideRefreshCcw className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <LucideRotateCcw className="w-3 h-3" />
                                                )}
                                                RESTAURAR ESTADO
                                            </button>
                                            <span className="text-[9px] text-muted-foreground italic">
                                                ({Array.isArray(item.snapshot) ? item.snapshot.length : 0} bloques)
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <p className="text-[10px] text-muted-foreground bg-muted/50 p-2 rounded leading-relaxed border border-border/50">
                ⚠️ Las operaciones de restauración reemplazan todo el contenido actual por la versión seleccionada. Se guarda un respaldo automático del estado previo antes de aplicar la restauración.
            </p>
        </div>
    );
}
