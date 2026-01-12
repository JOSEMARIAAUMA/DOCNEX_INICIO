'use client';

import { useEffect, useState, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ChevronRight,
    Home,
    FlaskConical,
    FileText,
    Play,
    Settings,
    Trash2,
    Plus,
    Clock,
    CheckCircle2,
    Archive,
    MoreVertical,
    ArrowLeft,
    Layers,
    History,
    Target,
    Edit3,
    X
} from 'lucide-react';
import {
    getResearchSession,
    getDocumentsByIds,
    listSynthesisOperations,
    updateResearchSession,
    removeDocumentFromSession,
    deleteResearchSession,
    ResearchSession,
    Document,
    SynthesisOperation
} from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/UiCard';

interface SessionDetailPageProps {
    params: Promise<{ sessionId: string }>;
}

export default function SessionDetailPage({ params }: SessionDetailPageProps) {
    const { sessionId } = use(params);
    const router = useRouter();

    const [session, setSession] = useState<ResearchSession | null>(null);
    const [sourceDocs, setSourceDocs] = useState<Document[]>([]);
    const [operations, setOperations] = useState<SynthesisOperation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const sessionData = await getResearchSession(sessionId);
            if (!sessionData) {
                setError('Sesión no encontrada');
                return;
            }
            setSession(sessionData);
            setEditName(sessionData.name);
            setEditDescription((sessionData.metadata?.description as string) || '');

            // Fetch source documents
            if (sessionData.source_document_ids?.length > 0) {
                const docs = await getDocumentsByIds(sessionData.source_document_ids);
                setSourceDocs(docs);
            }

            // Fetch operations history
            const ops = await listSynthesisOperations(sessionId);
            setOperations(ops);
        } catch (err) {
            console.error('Error fetching session data:', err);
            setError('Error al cargar la sesión');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [sessionId]);

    const handleRemoveDocument = async (docId: string) => {
        if (!session) return;
        if (confirm('¿Eliminar este documento de la sesión?')) {
            try {
                await removeDocumentFromSession(sessionId, docId);
                setSourceDocs(prev => prev.filter(d => d.id !== docId));
                setSession(prev => prev ? {
                    ...prev,
                    source_document_ids: prev.source_document_ids.filter(id => id !== docId),
                    document_count: (prev.document_count || 0) - 1
                } : null);
            } catch (err) {
                console.error('Error removing document:', err);
            }
        }
    };

    const handleUpdateSession = async () => {
        if (!session) return;
        try {
            await updateResearchSession(sessionId, {
                name: editName,
                metadata: { ...session.metadata, description: editDescription }
            });
            setSession(prev => prev ? {
                ...prev,
                name: editName,
                metadata: { ...prev.metadata, description: editDescription }
            } : null);
            setIsEditing(false);
        } catch (err) {
            console.error('Error updating session:', err);
        }
    };

    const handleDeleteSession = async () => {
        if (confirm('¿Eliminar esta sesión de investigación? Esta acción no se puede deshacer.')) {
            try {
                await deleteResearchSession(sessionId);
                router.push('/research');
            } catch (err) {
                console.error('Error deleting session:', err);
            }
        }
    };

    const handleStatusChange = async (newStatus: 'active' | 'completed' | 'abandoned') => {
        if (!session) return;
        try {
            await updateResearchSession(sessionId, { status: newStatus });
            setSession(prev => prev ? { ...prev, status: newStatus } : null);
        } catch (err) {
            console.error('Error updating status:', err);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
                />
            </div>
        );
    }

    if (error || !session) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4">
                <p className="text-destructive">{error || 'Sesión no encontrada'}</p>
                <Link
                    href="/research"
                    className="text-primary hover:underline"
                >
                    Volver al Centro de Investigación
                </Link>
            </div>
        );
    }

    const statusColors = {
        active: 'bg-green-500/10 text-green-600 border-green-500/20',
        completed: 'bg-primary/10 text-primary border-primary/20',
        abandoned: 'bg-muted text-muted-foreground border-border'
    };

    const statusLabels = {
        active: 'Activa',
        completed: 'Completada',
        abandoned: 'Abandonada'
    };

    return (
        <div className="h-full flex flex-col overflow-hidden bg-background">
            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-shrink-0 border-b border-border bg-card/50 backdrop-blur-sm"
            >
                <div className="px-6 py-4">
                    {/* Breadcrumbs */}
                    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Link
                            href="/"
                            className="hover:text-foreground transition-colors flex items-center gap-1"
                        >
                            <Home className="w-4 h-4" />
                            <span>Workspace</span>
                        </Link>
                        <ChevronRight className="w-4 h-4" />
                        <Link
                            href="/research"
                            className="hover:text-foreground transition-colors"
                        >
                            Research
                        </Link>
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-foreground font-medium truncate max-w-[200px]">
                            {session.name}
                        </span>
                    </nav>

                    {/* Title & Actions */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/research"
                                className="p-2 rounded-lg hover:bg-muted transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                            </Link>
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                                <FlaskConical className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="text-2xl font-bold text-foreground tracking-tight bg-transparent border-b-2 border-primary focus:outline-none"
                                        autoFocus
                                    />
                                ) : (
                                    <h1 className="text-2xl font-bold text-foreground tracking-tight">
                                        {session.name}
                                    </h1>
                                )}
                                <div className="flex items-center gap-3 mt-1">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[session.status]}`}>
                                        {statusLabels[session.status]}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        {session.document_count} documentos
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleUpdateSession}
                                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
                                    >
                                        Guardar
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                                        title="Editar"
                                    >
                                        <Edit3 className="w-5 h-5 text-muted-foreground" />
                                    </button>
                                    <button
                                        onClick={handleDeleteSession}
                                        className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-5 h-5 text-red-500" />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </motion.header>

            {/* Main Content */}
            <main className="flex-1 overflow-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Source Documents */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Source Documents */}
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-primary" />
                                        Documentos Fuente
                                    </CardTitle>
                                    <button className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
                                        <Plus className="w-3 h-3" />
                                        Añadir
                                    </button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {sourceDocs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/20 rounded-xl border border-dashed border-border">
                                        <FileText className="w-10 h-10 text-muted-foreground/50 mb-2" />
                                        <p className="text-muted-foreground text-sm">
                                            No hay documentos en esta sesión
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {sourceDocs.map((doc, index) => (
                                            <motion.div
                                                key={doc.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border hover:border-primary/30 transition-all group"
                                            >
                                                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                    <FileText className="w-4 h-4 text-primary" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <Link
                                                        href={`/documents/${doc.id}/view`}
                                                        className="font-medium text-foreground hover:text-primary transition-colors block truncate"
                                                    >
                                                        {doc.title}
                                                    </Link>
                                                    <p className="text-xs text-muted-foreground">
                                                        Actualizado {new Date(doc.updated_at).toLocaleDateString('es-ES')}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveDocument(doc.id)}
                                                    className="p-1.5 rounded-md hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                                    title="Quitar de la sesión"
                                                >
                                                    <X className="w-4 h-4 text-red-500" />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Target Document Selection */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2">
                                    <Target className="w-5 h-5 text-primary" />
                                    Documento Destino
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {session.target_document_id ? (
                                    <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
                                        <FileText className="w-5 h-5 text-primary" />
                                        <span className="font-medium text-foreground">
                                            Documento de síntesis configurado
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/20 rounded-xl border border-dashed border-border">
                                        <Target className="w-10 h-10 text-muted-foreground/50 mb-2" />
                                        <p className="text-muted-foreground text-sm mb-3">
                                            Selecciona o crea un documento destino para la síntesis
                                        </p>
                                        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                                            Crear documento de síntesis
                                        </button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Start Synthesis */}
                        {sourceDocs.length >= 2 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center justify-center p-6 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl border border-primary/20"
                            >
                                <button
                                    onClick={() => router.push(`/research/${sessionId}/synthesis-wizard`)}
                                    className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-xl text-lg font-semibold shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
                                >
                                    <Layers className="w-6 h-6" />
                                    Iniciar Asistente de Síntesis
                                </button>
                            </motion.div>
                        )}
                    </div>

                    {/* Right Column: Session Info & History */}
                    <div className="space-y-6">
                        {/* Session Metadata */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2">
                                    <Settings className="w-5 h-5 text-primary" />
                                    Información
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Description */}
                                <div>
                                    <label className="text-xs text-muted-foreground uppercase tracking-wide">
                                        Descripción
                                    </label>
                                    {isEditing ? (
                                        <textarea
                                            value={editDescription}
                                            onChange={(e) => setEditDescription(e.target.value)}
                                            className="w-full mt-1 px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                            rows={3}
                                        />
                                    ) : (
                                        <p className="text-sm text-foreground mt-1">
                                            {(session.metadata?.description as string) || 'Sin descripción'}
                                        </p>
                                    )}
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="text-xs text-muted-foreground uppercase tracking-wide">
                                        Estado
                                    </label>
                                    <div className="flex gap-2 mt-2">
                                        {(['active', 'completed', 'abandoned'] as const).map((status) => (
                                            <button
                                                key={status}
                                                onClick={() => handleStatusChange(status)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${session.status === status
                                                    ? statusColors[status]
                                                    : 'bg-muted/30 border-border text-muted-foreground hover:text-foreground'
                                                    }`}
                                            >
                                                {statusLabels[status]}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                                    <div>
                                        <label className="text-xs text-muted-foreground uppercase tracking-wide">
                                            Creada
                                        </label>
                                        <p className="text-sm text-foreground mt-1">
                                            {new Date(session.created_at).toLocaleDateString('es-ES', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground uppercase tracking-wide">
                                            Actualizada
                                        </label>
                                        <p className="text-sm text-foreground mt-1">
                                            {new Date(session.updated_at).toLocaleDateString('es-ES', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Operations History */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2">
                                    <History className="w-5 h-5 text-primary" />
                                    Historial de Operaciones
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {operations.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-6 text-center">
                                        <History className="w-8 h-8 text-muted-foreground/50 mb-2" />
                                        <p className="text-sm text-muted-foreground">
                                            Aún no hay operaciones de síntesis
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {operations.slice(0, 5).map((op) => (
                                            <div
                                                key={op.id}
                                                className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg"
                                            >
                                                <div className={`w-2 h-2 rounded-full ${op.user_approved === true
                                                    ? 'bg-green-500'
                                                    : op.user_approved === false
                                                        ? 'bg-red-500'
                                                        : 'bg-yellow-500'
                                                    }`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-foreground capitalize">
                                                        {op.operation_type}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(op.created_at).toLocaleString('es-ES')}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
