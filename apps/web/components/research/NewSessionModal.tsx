'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    FileText,
    FolderOpen,
    Check,
    Loader2,
    Search,
    AlertCircle
} from 'lucide-react';
import {
    Project,
    Document,
    createResearchSession
} from '@/lib/api';

interface NewSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    projects: Project[];
    researchDocs: Document[];
    onSessionCreated: () => void;
}

export default function NewSessionModal({
    isOpen,
    onClose,
    projects,
    researchDocs,
    onSessionCreated
}: NewSessionModalProps) {
    const [name, setName] = useState('');
    const [projectId, setProjectId] = useState('');
    const [description, setDescription] = useState('');
    const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setName('');
            setProjectId(projects[0]?.id || '');
            setDescription('');
            setSelectedDocs([]);
            setSearchQuery('');
            setError(null);
        }
    }, [isOpen, projects]);

    // Filter documents by search and selected project
    const filteredDocs = researchDocs.filter(doc => {
        const matchesSearch = !searchQuery ||
            doc.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesProject = !projectId || doc.project_id === projectId;
        return matchesSearch && matchesProject;
    });

    const toggleDocSelection = (docId: string) => {
        setSelectedDocs(prev =>
            prev.includes(docId)
                ? prev.filter(id => id !== docId)
                : [...prev, docId]
        );
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            setError('El nombre de la sesión es obligatorio');
            return;
        }
        if (!projectId) {
            setError('Selecciona un proyecto');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await createResearchSession(
                projectId,
                name.trim(),
                selectedDocs,
                description.trim() || undefined
            );
            onSessionCreated();
        } catch (err) {
            console.error('Error creating session:', err);
            setError('Error al crear la sesión');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="w-full max-w-2xl max-h-[90vh] overflow-hidden bg-card rounded-2xl shadow-2xl border border-border"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-border">
                        <div>
                            <h2 className="text-xl font-bold text-foreground">
                                Nueva Sesión de Investigación
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Agrupa documentos para sintetizar información
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                        >
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Form */}
                    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                        {/* Error Message */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600"
                            >
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span className="text-sm">{error}</span>
                            </motion.div>
                        )}

                        {/* Session Name */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-foreground">
                                Nombre de la sesión <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: Análisis normativo LISTA 2025"
                                className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                                autoFocus
                            />
                        </div>

                        {/* Project Selection */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-foreground">
                                Proyecto <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <FolderOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <select
                                    value={projectId}
                                    onChange={(e) => setProjectId(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer"
                                >
                                    <option value="">Seleccionar proyecto...</option>
                                    {projects.map((project) => (
                                        <option key={project.id} value={project.id}>
                                            {project.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-foreground">
                                Descripción <span className="text-muted-foreground">(opcional)</span>
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe el objetivo de esta sesión de investigación..."
                                rows={3}
                                className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
                            />
                        </div>

                        {/* Document Selection */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium text-foreground">
                                    Documentos fuente
                                </label>
                                <span className="text-xs text-muted-foreground">
                                    {selectedDocs.length} seleccionados
                                </span>
                            </div>

                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar documentos..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-muted/30 border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                                />
                            </div>

                            {/* Document List */}
                            <div className="max-h-[200px] overflow-y-auto border border-border rounded-xl divide-y divide-border">
                                {filteredDocs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <FileText className="w-8 h-8 text-muted-foreground/50 mb-2" />
                                        <p className="text-sm text-muted-foreground">
                                            No hay documentos de investigación disponibles
                                        </p>
                                    </div>
                                ) : (
                                    filteredDocs.map((doc) => (
                                        <button
                                            key={doc.id}
                                            onClick={() => toggleDocSelection(doc.id)}
                                            className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${selectedDocs.includes(doc.id)
                                                    ? 'bg-primary/10'
                                                    : 'hover:bg-muted/50'
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedDocs.includes(doc.id)
                                                    ? 'bg-primary border-primary'
                                                    : 'border-border'
                                                }`}>
                                                {selectedDocs.includes(doc.id) && (
                                                    <Check className="w-3 h-3 text-primary-foreground" />
                                                )}
                                            </div>
                                            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">
                                                    {doc.title}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(doc.updated_at).toLocaleDateString('es-ES')}
                                                </p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-muted/20">
                        <button
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !name.trim() || !projectId}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Creando...</span>
                                </>
                            ) : (
                                <span>Crear Sesión</span>
                            )}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
