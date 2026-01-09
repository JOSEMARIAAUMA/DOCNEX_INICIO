'use client';

import { useState, useEffect } from 'react';
import { BlockVersion, DocumentBlock } from '@docnex/shared';
import { listBlockVersions, createBlockVersion, restoreBlockVersion, deleteBlockVersion } from '@/lib/api';
import { Trash2, Copy, RotateCcw, Eye, RefreshCw, CheckSquare, Square, Download, MoreVertical } from 'lucide-react';

interface VersionsSectionProps {
    block: DocumentBlock | null;
    onRestore: (title: string, content: string) => void;
    onCompare?: (version: BlockVersion) => void;
    comparingVersionId?: string;
    refreshTrigger?: number;
}

export default function VersionsSection({ block, onRestore, onCompare, comparingVersionId, refreshTrigger = 0 }: VersionsSectionProps) {
    const [versions, setVersions] = useState<BlockVersion[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (block) {
            loadVersions();
        } else {
            setVersions([]);
        }
        setSelectedIds(new Set()); // Reset selection when block changes
    }, [block?.id, refreshTrigger]);

    const loadVersions = async () => {
        if (!block) return;
        setLoading(true);
        try {
            const data = await listBlockVersions(block.id);
            setVersions(data);
        } catch (err) {
            console.error('Error loading versions:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveVersion = async () => {
        if (!block) return;
        setSaving(true);
        try {
            await createBlockVersion(block);
            await loadVersions();
        } catch (err) {
            console.error('Error saving version:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleRestore = async (versionId: string) => {
        if (!confirm('¿Restaurar esta versión? El contenido actual será reemplazado.')) return;

        try {
            const restored = await restoreBlockVersion(versionId);
            if (restored) {
                onRestore(restored.title, restored.content);
            }
        } catch (err) {
            console.error('Error restoring version:', err);
        }
    };

    const handleDelete = async (versionId: string) => {
        if (!confirm('¿Eliminar esta versión?')) return;
        try {
            await deleteBlockVersion(versionId);
            await loadVersions();
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(versionId);
                return next;
            });
        } catch (err) {
            console.error('Error deleting version:', err);
            alert('Error al eliminar la versión');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`¿Eliminar las ${selectedIds.size} versiones seleccionadas?`)) return;

        setLoading(true);
        try {
            for (const id of Array.from(selectedIds)) {
                await deleteBlockVersion(id);
            }
            setSelectedIds(new Set());
            await loadVersions();
        } catch (err) {
            console.error('Error in bulk delete:', err);
            alert('Error al eliminar algunas versiones');
            await loadVersions();
        } finally {
            setLoading(false);
        }
    };

    const handleBulkCopy = () => {
        if (selectedIds.size === 0) return;
        const selectedVersions = versions.filter(v => selectedIds.has(v.id));
        const combinedContent = selectedVersions
            .map(v => `--- Versión ${v.version_number} (${formatDate(v.created_at)}) ---\n${v.content}`)
            .join('\n\n');

        navigator.clipboard.writeText(combinedContent);
        alert('Contenido de las versiones seleccionadas copiado al portapapeles');
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === versions.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(versions.map(v => v.id)));
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!block) {
        return <p className="text-sm text-muted-foreground italic p-4">Selecciona un bloque para ver sus versiones</p>;
    }

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header Actions */}
            <div className="p-3 border-b border-border space-y-3">
                <button
                    onClick={handleSaveVersion}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
                    {saving ? 'Guardando...' : 'Guardar versión actual'}
                </button>

                {/* Selection Bar */}
                <div className="flex items-center justify-between px-1">
                    <button
                        onClick={toggleSelectAll}
                        className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                    >
                        {selectedIds.size === versions.length && versions.length > 0
                            ? <CheckSquare className="w-4 h-4 text-primary" />
                            : <Square className="w-4 h-4" />
                        }
                        {selectedIds.size > 0 ? `${selectedIds.size} seleccionadas` : 'Seleccionar todas'}
                    </button>

                    <button
                        onClick={loadVersions}
                        disabled={loading}
                        className="p-1.5 text-muted-foreground hover:text-primary transition-colors hover:bg-primary/10 rounded-md"
                        title="Actualizar lista"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Bulk Action Icons - visible when items selected */}
                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg animate-in slide-in-from-top-2">
                        <button
                            onClick={handleBulkDelete}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 rounded transition-colors"
                            title="Eliminar seleccionadas"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Eliminar
                        </button>
                        <div className="w-px h-4 bg-primary/20" />
                        <button
                            onClick={handleBulkCopy}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded transition-colors"
                            title="Copiar seleccionadas"
                        >
                            <Copy className="w-3.5 h-3.5" />
                            Copiar
                        </button>
                        <div className="w-px h-4 bg-primary/20" />
                        <button
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded transition-colors opacity-50 cursor-not-allowed"
                            title="Exportar (Próximamente)"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Exportar
                        </button>
                    </div>
                )}
            </div>

            {/* Versions list */}
            <div className="flex-1 overflow-y-auto p-3">
                {loading && versions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                        <RefreshCw className="w-6 h-6 animate-spin mb-2 opacity-50" />
                        <p className="text-sm">Cargando versiones...</p>
                    </div>
                ) : versions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground opacity-50">
                        <p className="text-sm italic">Sin versiones guardadas</p>
                    </div>
                ) : (
                    <div className="space-y-3 pb-4">
                        {versions.map((version) => {
                            const isSelected = selectedIds.has(version.id);
                            return (
                                <div
                                    key={version.id}
                                    className={`group relative bg-card border transition-all duration-200 rounded-xl overflow-hidden ${isSelected
                                            ? 'border-primary ring-1 ring-primary/20 shadow-md'
                                            : 'border-border hover:border-primary/40 hover:shadow-sm'
                                        }`}
                                >
                                    <div className="p-3">
                                        <div className="flex items-start gap-3">
                                            {/* Selection Checkbox */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleSelect(version.id); }}
                                                className={`mt-0.5 transition-colors ${isSelected ? 'text-primary' : 'text-muted-foreground/40 group-hover:text-muted-foreground'}`}
                                            >
                                                {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                            </button>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase">
                                                            v{version.version_number}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground/70 font-medium">
                                                            {formatDate(version.created_at)}
                                                        </span>
                                                    </div>
                                                </div>

                                                <h5 className="text-sm font-semibold text-foreground mt-1.5 truncate">
                                                    {version.title || 'Versión sin título'}
                                                </h5>
                                                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                                    {version.content ? version.content.replace(/<[^>]*>/g, '') : 'Sin contenido...'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Row Actions - Clean and professional */}
                                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                                            <button
                                                onClick={() => onCompare?.(version)}
                                                className={`flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-md transition-all ${comparingVersionId === version.id
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                                                    }`}
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                {comparingVersionId === version.id ? 'Comparando' : 'Comparar'}
                                            </button>

                                            <button
                                                onClick={() => handleRestore(version.id)}
                                                className="flex items-center gap-1.5 text-[11px] font-bold text-primary hover:bg-primary/10 px-2 py-1 rounded-md transition-all"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                                Restaurar
                                            </button>

                                            {!isSelected && (
                                                <button
                                                    onClick={() => handleDelete(version.id)}
                                                    className="ml-auto p-1.5 text-muted-foreground/50 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                                                    title="Eliminar versión"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
