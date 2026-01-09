'use client';

import { useState, useEffect } from 'react';
import { BlockVersion, DocumentBlock } from '@docnex/shared';
import { listBlockVersions, createBlockVersion, restoreBlockVersion, deleteBlockVersion } from '@/lib/api';

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

    useEffect(() => {
        if (block) {
            loadVersions();
        } else {
            setVersions([]);
        }
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
        } catch (err) {
            console.error('Error deleting version:', err);
        }
    };

    const handleCopy = (content: string) => {
        navigator.clipboard.writeText(content);
        alert('Contenido copiado al portapapeles');
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
        return <p className="text-sm text-muted-foreground italic">Selecciona un bloque</p>;
    }

    return (
        <div className="space-y-3">
            {/* Save current version button */}
            <button
                onClick={handleSaveVersion}
                disabled={saving}
                className="w-full py-2 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
            >
                {saving ? 'Guardando...' : '📸 Guardar versión actual'}
            </button>

            {/* Versions list */}
            {loading ? (
                <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : versions.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Sin versiones guardadas</p>
            ) : (
                <div className="space-y-2">
                    {versions.map((version) => (
                        <div
                            key={version.id}
                            className="bg-card border border-border rounded-lg p-3"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                                            v{version.version_number}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {formatDate(version.created_at)}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-foreground truncate mt-1">
                                        {version.title || 'Sin título'}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {version.content?.substring(0, 80) || 'Sin contenido'}...
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-2 pt-2 border-t border-border">
                                {onCompare && (
                                    <button
                                        onClick={() => onCompare(version)}
                                        className={`text-xs transition-all ${comparingVersionId === version.id
                                                ? 'text-primary font-medium'
                                                : 'text-muted-foreground hover:text-primary'
                                            }`}
                                        title="Comparar con versión actual"
                                    >
                                        {comparingVersionId === version.id ? '✓ Comparando' : '👁️ Comparar'}
                                    </button>
                                )}
                                <button
                                    onClick={() => handleRestore(version.id)}
                                    className="text-xs text-primary hover:opacity-80 transition-opacity"
                                    title="Restaurar esta versión"
                                >
                                    ↩️ Restaurar
                                </button>
                                <button
                                    onClick={() => handleCopy(version.content)}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    title="Copiar contenido"
                                >
                                    📋 Copiar
                                </button>
                                <button
                                    onClick={() => handleDelete(version.id)}
                                    className="text-xs text-muted-foreground hover:text-foreground ml-auto transition-colors"
                                    title="Eliminar"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
