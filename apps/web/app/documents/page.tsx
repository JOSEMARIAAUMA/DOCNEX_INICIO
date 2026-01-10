'use client';

import { useEffect, useState } from 'react';
import { Project, Document, getActiveProject, listDocuments, createDocument } from '@/lib/api';

import Link from 'next/link';

export default function DocumentListPage() {
    const [project, setProject] = useState<Project | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [newDocTitle, setNewDocTitle] = useState('');
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        const proj = await getActiveProject();
        if (proj) {
            setProject(proj);
            const docs = await listDocuments(proj.id);
            // Internal filter: Hide Strategy Docs from main view
            setDocuments(docs.filter(d => !d.title.startsWith('ESTRATEGIA:')));
        }
        setLoading(false);
    };

    useEffect(() => {
        const init = async () => {
            await loadData();
        };
        init();
    }, []);

    const handleCreate = async () => {
        if (!project || !newDocTitle.trim()) return;
        await createDocument(project.id, newDocTitle);
        setNewDocTitle('');
        loadData();
    };

    if (loading) return <div className="p-8 text-foreground">Cargando...</div>;

    if (!project) return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4 text-foreground">No se encontró el Proyecto</h1>
            <p className="text-muted-foreground">Asegúrate de que la base de datos tiene un workspace y proyecto configurados.</p>
        </div>
    );

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-foreground">Documentos</h1>

            <div className="mb-8 flex gap-4">
                <input
                    type="text"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    placeholder="Título del Nuevo Documento"
                    className="border border-border bg-background text-foreground p-2 rounded flex-1 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                    onClick={handleCreate}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded hover:opacity-90 disabled:opacity-50 transition-all"
                    disabled={!newDocTitle.trim()}
                >
                    Crear Documento
                </button>
            </div>

            <div className="grid gap-4">
                {documents.length === 0 ? (
                    <p className="text-muted-foreground">No hay documentos aún. Crea uno arriba.</p>
                ) : (
                    documents.map(doc => (
                        <div
                            key={doc.id}
                            className="flex items-center justify-between border border-border bg-card text-card-foreground p-4 rounded hover:border-primary/50 transition-all group"
                        >
                            <Link href={`/documents/${doc.id}`} className="flex-1">
                                <h2 className="text-xl font-semibold hover:text-primary transition-colors">{doc.title}</h2>
                                <span className="text-sm text-muted-foreground mr-4">Estado: {doc.status}</span>
                                <span className="text-xs text-muted-foreground/60">Actualizado: {new Date(doc.updated_at).toLocaleDateString()}</span>
                            </Link>

                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={async () => {
                                        if (confirm('Duplicates this document?')) {
                                            const { duplicateDocument } = await import('@/lib/api');
                                            await duplicateDocument(doc.id);
                                            loadData();
                                        }
                                    }}
                                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                                    title="Duplicar"
                                >
                                    📋
                                </button>
                                <button
                                    onClick={async () => {
                                        if (confirm('Archive this document?')) {
                                            const { archiveDocument } = await import('@/lib/api');
                                            await archiveDocument(doc.id);
                                            loadData();
                                        }
                                    }}
                                    className="p-2 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 rounded"
                                    title="Archivar"
                                >
                                    📦
                                </button>
                                <button
                                    onClick={async (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        // Removed confirm dialog to fix UI blocking issues
                                        const { deleteDocument } = await import('@/lib/api');
                                        await deleteDocument(doc.id);
                                        loadData();
                                    }}
                                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded"
                                    title="Eliminar"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
