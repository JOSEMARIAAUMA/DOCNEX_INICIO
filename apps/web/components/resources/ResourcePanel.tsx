'use client';

import { useState, useRef, useEffect } from 'react';
import { Resource, ResourceExtract } from '@docnex/shared';
import { uploadFile, getPublicUrl } from '@/lib/storage';
import { createFileResource, deleteResource, updateResource, listResourceExtracts, createLink } from '@/lib/api';

interface ResourcePanelProps {
    projectId: string;
    resources: Resource[];
    linkedResourceIds: string[];
    onResourcesChange: () => void;
    onLinkResource: (resourceId: string, extractId?: string) => void;
}

export default function ResourcePanel({
    projectId,
    resources,
    linkedResourceIds,
    onResourcesChange,
    onLinkResource
}: ResourcePanelProps) {
    const [uploading, setUploading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [expandedResourceId, setExpandedResourceId] = useState<string | null>(null);
    const [extracts, setExtracts] = useState<Record<string, ResourceExtract[]>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const result = await uploadFile(projectId, file);

            // Determine kind from mime type
            let kind = 'other';
            if (file.type === 'application/pdf') kind = 'pdf';
            else if (file.type.includes('word') || file.name.endsWith('.docx')) kind = 'docx';
            else if (file.type === 'text/plain' || file.name.endsWith('.txt')) kind = 'txt';

            await createFileResource({
                projectId,
                title: file.name,
                kind: kind as any,
                filePath: result.path,
                mimeType: file.type,
                fileSize: file.size
            });

            onResourcesChange();
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Upload failed. Check console for details.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const toggleExtracts = async (resourceId: string) => {
        if (expandedResourceId === resourceId) {
            setExpandedResourceId(null);
            return;
        }

        setExpandedResourceId(resourceId);
        if (!extracts[resourceId]) {
            const resExtracts = await listResourceExtracts(resourceId);
            setExtracts(prev => ({ ...prev, [resourceId]: resExtracts }));
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this resource?')) return;
        try {
            await deleteResource(id);
            onResourcesChange();
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    const handleEditSave = async (id: string) => {
        try {
            await updateResource(id, { title: editTitle });
            setEditingId(null);
            onResourcesChange();
        } catch (err) {
            console.error('Update failed:', err);
        }
    };

    const getFileUrl = (resource: Resource) => {
        if (resource.file_path) {
            return getPublicUrl(resource.file_path);
        }
        return resource.source_uri || '#';
    };

    const formatFileSize = (bytes: number | null) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="h-full flex flex-col bg-card border-l border-border">
            {/* Header */}
            <div className="p-4 border-b border-border">
                <h3 className="font-bold text-foreground mb-4">Recursos</h3>

                {/* Upload zone */}
                <div
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${uploading ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        }`}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.docx,.txt,.md"
                        onChange={handleFileSelect}
                    />
                    {uploading ? (
                        <span className="text-primary text-sm font-medium animate-pulse">Subiendo...</span>
                    ) : (
                        <span className="text-muted-foreground text-sm flex flex-col items-center gap-2">
                            <span className="text-2xl">📎</span>
                            Haz clic o arrastra un archivo aquí
                        </span>
                    )}
                </div>
            </div>

            {/* Resource list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {resources.map(res => (
                    <div key={res.id} className="flex flex-col gap-1">
                        <div
                            className={`border rounded-lg p-3 text-sm group relative transition-all ${linkedResourceIds.includes(res.id)
                                ? 'bg-primary/10 border-primary/30 shadow-sm'
                                : 'bg-card border-border hover:border-primary/30 hover:shadow-sm'
                                }`}
                        >
                            {editingId === res.id ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                        className="flex-1 border border-border bg-background px-2 py-1 rounded text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
                                        autoFocus
                                    />
                                    <button onClick={() => handleEditSave(res.id)} className="text-xs text-primary font-bold">✓</button>
                                    <button onClick={() => setEditingId(null)} className="text-xs text-muted-foreground">✕</button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-start justify-between pr-10">
                                        <div
                                            className="font-medium truncate cursor-pointer hover:text-blue-600"
                                            onClick={() => toggleExtracts(res.id)}
                                        >
                                            {expandedResourceId === res.id ? '▼' : '▶'} {res.title}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded">
                                            {res.kind}
                                        </span>
                                        {res.file_size && (
                                            <span className="text-[10px] text-muted-foreground opacity-70">
                                                {formatFileSize(res.file_size)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Action buttons */}
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => onLinkResource(res.id)}
                                            className="text-xs p-1.5 hover:bg-primary/20 rounded-md transition-colors"
                                            title="Vincular todo el recurso"
                                        >
                                            🔗
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditTitle(res.title);
                                                setEditingId(res.id);
                                            }}
                                            className="text-xs p-1.5 hover:bg-accent rounded-md transition-colors"
                                            title="Editar título"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleDelete(res.id)}
                                            className="text-xs p-1.5 hover:bg-red-500/10 text-red-500 rounded-md transition-colors"
                                            title="Eliminar"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Extracts dropdown */}
                        {expandedResourceId === res.id && (
                            <div className="ml-4 border-l-2 border-primary/20 pl-4 py-2 space-y-2 animate-in slide-in-from-top-1 duration-200">
                                {extracts[res.id]?.length === 0 ? (
                                    <div className="text-[10px] text-muted-foreground italic py-1">Sin extractos aún</div>
                                ) : (
                                    extracts[res.id]?.map(ext => (
                                        <div
                                            key={ext.id}
                                            className="p-3 bg-muted/50 rounded-lg text-xs border border-transparent hover:border-primary/30 group relative transition-all"
                                        >
                                            <div className="font-bold text-primary text-[10px] mb-1 uppercase tracking-wider">{ext.label}</div>
                                            <div className="text-muted-foreground italic line-clamp-3 leading-relaxed">"{ext.excerpt}"</div>

                                            <button
                                                onClick={() => onLinkResource(res.id, ext.id)}
                                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded-md shadow-sm transition-all font-medium"
                                            >
                                                Vincular
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {resources.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-12 italic">
                        Sin recursos aún. Sube uno para comenzar a vincular.
                    </p>
                )}
            </div>
        </div>
    );
}
