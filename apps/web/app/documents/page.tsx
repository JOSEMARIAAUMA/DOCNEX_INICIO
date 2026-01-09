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
            setDocuments(docs);
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
                        <Link
                            key={doc.id}
                            href={`/documents/${doc.id}`}
                            className="block border border-border bg-card text-card-foreground p-4 rounded hover:bg-accent transition"
                        >
                            <h2 className="text-xl font-semibold">{doc.title}</h2>
                            <span className="text-sm text-muted-foreground">Estado: {doc.status}</span>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
