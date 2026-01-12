'use client';

import { useState, useRef, useEffect } from 'react';
import { Resource } from '@docnex/shared';
import { createResource, deleteResource } from '@/lib/api';
import { LucideEye, Plus, Network } from 'lucide-react';
import ProvenanceGraph from '@/components/visualizations/ProvenanceGraph';
import { getProvenanceGraphData } from '@/actions/synthesis';

interface ResourcesSectionProps {
    projectId: string;
    documentId?: string;
    resources: Resource[];
    onResourcesChange: () => void;
    onLinkResource?: (resourceId: string) => void;
    onOpenResource?: (resource: Resource) => void;
}

export default function ResourcesSection({
    projectId,
    documentId,
    resources,
    onResourcesChange,
    onLinkResource,
    onOpenResource
}: ResourcesSectionProps) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newUrl, setNewUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');
    const [graphData, setGraphData] = useState<{ nodes: any[], links: any[] }>({ nodes: [], links: [] });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch graph data on mount/change
    useEffect(() => {
        if (viewMode === 'graph') {
            getProvenanceGraphData(undefined, projectId).then(res => {
                if (res.success && res.nodes) {
                    setGraphData({ nodes: res.nodes, links: res.links || [] });
                }
            });
        }
    }, [viewMode, projectId]);

    const handleAddLink = async () => {
        if (!newTitle.trim()) return;

        try {
            await createResource(projectId, newTitle, 'url', { source_uri: newUrl || undefined }, documentId);
            setNewTitle('');
            setNewUrl('');
            setShowAddForm(false);
            onResourcesChange();
        } catch (err) {
            console.error('Error creating resource:', err);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            // For now, just create a resource entry with the file name
            // Full file upload would require storage integration
            await createResource(projectId, file.name, 'other', {}, documentId);
            onResourcesChange();
        } catch (err) {
            console.error('Error uploading file:', err);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (resourceId: string) => {
        if (!confirm('¿Eliminar este recurso?')) return;
        try {
            await deleteResource(resourceId);
            onResourcesChange();
        } catch (err) {
            console.error('Error deleting resource:', err);
        }
    };

    return (
        <div className="space-y-3 h-full flex flex-col">
            {/* Header / Toggle */}
            <div className="flex items-center justify-between pb-2 border-b border-border">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recursos ({resources.length})</h4>
                <div className="flex items-center gap-1 bg-muted p-1 rounded-md">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-1 rounded ${viewMode === 'list' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        title="Lista"
                    >
                        <div className="w-3.5 h-3.5 flex flex-col justify-between">
                            <div className="w-full h-[2px] bg-current" />
                            <div className="w-full h-[2px] bg-current" />
                            <div className="w-full h-[2px] bg-current" />
                        </div>
                    </button>
                    <button
                        onClick={() => setViewMode('graph')}
                        className={`p-1 rounded ${viewMode === 'graph' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        title="Grafo de Procedencia"
                    >
                        <Network className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {viewMode === 'graph' ? (
                <div className="flex-1 min-h-[300px] border border-border rounded-lg overflow-hidden">
                    <ProvenanceGraph
                        data={graphData}
                        width={280}
                        height={400} // Approximate side panel height
                        onNodeClick={(node) => {
                            if (node.type === 'document' && typeof window !== 'undefined') {
                                // Navigate logic could go here
                                alert(`Documento: ${node.name}`);
                            }
                        }}
                    />
                </div>
            ) : (
                <div className="space-y-3 overflow-y-auto flex-1">
                    {/* Add resource buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="flex-1 py-1.5 text-xs border border-border text-foreground rounded hover:bg-accent transition-colors"
                        >
                            🔗 Añadir enlace
                        </button>
                        <label className="flex-1">
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                onChange={handleFileUpload}
                                accept=".pdf,.docx,.doc,.txt,.md"
                            />
                            <span className="block py-1.5 text-xs border border-border text-foreground rounded hover:bg-accent transition-colors cursor-pointer text-center">
                                {uploading ? '⏳ Subiendo...' : '📁 Subir archivo'}
                            </span>
                        </label>
                    </div>

                    {/* Add link form */}
                    {showAddForm && (
                        <div className="bg-card border border-border rounded-lg p-3 space-y-2">
                            <input
                                type="text"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="Título del recurso"
                                className="w-full p-2 border border-border bg-background text-foreground rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <input
                                type="url"
                                value={newUrl}
                                onChange={(e) => setNewUrl(e.target.value)}
                                placeholder="URL (opcional)"
                                className="w-full p-2 border border-border bg-background text-foreground rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setShowAddForm(false)}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAddLink}
                                    disabled={!newTitle.trim()}
                                    className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded hover:opacity-90 disabled:opacity-50 transition-all"
                                >
                                    Guardar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Resources list */}
                    {resources.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">Sin recursos</p>
                    ) : (
                        <div className="space-y-2">
                            {resources.map((resource) => (
                                <div
                                    key={resource.id}
                                    className="bg-card border border-border rounded-lg p-3"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1">
                                                <span className="text-sm">
                                                    {resource.kind === 'pdf' ? '📄' :
                                                        resource.kind === 'url' ? '🔗' :
                                                            resource.kind === 'docx' ? '📝' : '📎'}
                                                </span>
                                                <span className="text-sm font-medium text-foreground truncate">
                                                    {resource.title}
                                                </span>
                                            </div>
                                            {resource.source_uri && (
                                                <a
                                                    href={resource.source_uri}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-primary hover:opacity-80 transition-opacity truncate block"
                                                >
                                                    {resource.source_uri}
                                                </a>
                                            )}
                                        </div>
                                        <div className="flex gap-1">
                                            {onOpenResource && (
                                                <button
                                                    onClick={() => onOpenResource?.(resource)}
                                                    className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                                                    title="Abrir en panel lateral"
                                                >
                                                    <LucideEye className="w-4 h-4" />
                                                </button>
                                            )}
                                            {onLinkResource && (
                                                <button
                                                    onClick={() => onLinkResource(resource.id)}
                                                    className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                                                    title="Vincular a bloque"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(resource.id)}
                                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                                title="Eliminar"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
