'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Search,
    Filter,
    LayoutGrid,
    List,
    FileText,
    Clock,
    CheckCircle2,
    Archive,
    Star,
    ChevronDown,
    GripVertical,
    MoreVertical,
    Trash2,
    Play,
    Award,
    Edit3
} from 'lucide-react';
import { QualityBadge } from '@/components/quality/QualityBadge';
import { calculateQualityScore } from '@/lib/ai/quality-scorer';
import Link from 'next/link';
import {
    ResearchSession,
    Project,
    Document,
    listResearchDocuments,
    updateDocumentQualityRating,
    deleteResearchSession
} from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/UiCard';
import NewSessionModal from '@/components/research/NewSessionModal';

interface ResearchDashboardProps {
    sessions: ResearchSession[];
    projects: Project[];
    onRefresh: () => void;
}

type ViewMode = 'grid' | 'list';
type StatusFilter = 'all' | 'active' | 'completed';
type SortOption = 'updated' | 'created' | 'name';

export default function ResearchDashboard({
    sessions,
    projects,
    onRefresh
}: ResearchDashboardProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [sortBy, setSortBy] = useState<SortOption>('updated');
    const [showFilters, setShowFilters] = useState(false);
    const [onlyHighQuality, setOnlyHighQuality] = useState(false);
    const [showNewSessionModal, setShowNewSessionModal] = useState(false);
    const [researchDocs, setResearchDocs] = useState<Document[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(true);

    // Fetch research documents
    useEffect(() => {
        const fetchDocs = async () => {
            setLoadingDocs(true);
            try {
                const docs = await listResearchDocuments();
                setResearchDocs(docs);
            } catch (err) {
                console.error('Error fetching research docs:', err);
            } finally {
                setLoadingDocs(false);
            }
        };
        fetchDocs();
    }, []);

    // Filter and sort sessions
    const filteredSessions = useMemo(() => {
        let result = [...sessions];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(s =>
                s.name.toLowerCase().includes(query) ||
                s.metadata?.description?.toString().toLowerCase().includes(query)
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            result = result.filter(s => s.status === statusFilter);
        }

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'created':
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                case 'updated':
                default:
                    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            }
        });

        return result;
    }, [sessions, searchQuery, statusFilter, sortBy]);

    // Get documents not in any session
    const orphanDocs = useMemo(() => {
        const sessionDocIds = new Set(
            sessions.flatMap(s => s.source_document_ids || [])
        );
        let docs = researchDocs.filter(doc => !sessionDocIds.has(doc.id));

        if (onlyHighQuality) {
            docs = docs.filter(doc => {
                // Calc score dynamic or use metadata
                const score = calculateQualityScore(doc).score;
                return score >= 75; // Gold or Platinum
            });
        }

        return docs;
    }, [researchDocs, sessions, onlyHighQuality]);

    const activeSessions = filteredSessions.filter(s => s.status === 'active');
    const completedSessions = filteredSessions.filter(s => s.status === 'completed');

    const handleDeleteSession = async (sessionId: string) => {
        if (confirm('¿Eliminar esta sesión de investigación?')) {
            try {
                await deleteResearchSession(sessionId);
                onRefresh();
            } catch (err) {
                console.error('Error deleting session:', err);
            }
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Toolbar */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap items-center gap-4"
            >
                {/* New Session Button */}
                <button
                    onClick={() => setShowNewSessionModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                >
                    <Plus className="w-5 h-5" />
                    <span>Nueva Sesión</span>
                </button>

                {/* Search */}
                <div className="flex-1 min-w-[200px] max-w-md relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar sesiones..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                </div>

                {/* Filter Toggle */}
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${showFilters
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/20'
                        }`}
                >
                    <Filter className="w-4 h-4" />
                    <span className="text-sm font-medium">Filtros</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>

                {/* High Quality Toggle */}
                <button
                    onClick={() => setOnlyHighQuality(!onlyHighQuality)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${onlyHighQuality
                        ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-500/30 text-amber-700 dark:text-amber-400'
                        : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/20'
                        }`}
                    title="Mostrar solo documentos de alta calidad (Gold/Platinum)"
                >
                    <Award className="w-4 h-4" />
                    <span className="text-sm font-medium hidden sm:inline">Alta Calidad</span>
                </button>

                {/* View Toggle */}
                <div className="flex items-center bg-muted/50 rounded-lg p-1 border border-border">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'grid'
                            ? 'bg-card shadow text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'list'
                            ? 'bg-card shadow text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>
            </motion.div>

            {/* Filter Panel */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="flex flex-wrap gap-4 p-4 bg-muted/30 rounded-xl border border-border">
                            {/* Status Filter */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    Estado
                                </label>
                                <div className="flex gap-2">
                                    {(['all', 'active', 'completed'] as StatusFilter[]).map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => setStatusFilter(status)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${statusFilter === status
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                                                }`}
                                        >
                                            {status === 'all' ? 'Todos' : status === 'active' ? 'Activos' : 'Completados'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sort */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    Ordenar por
                                </label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                                    className="px-3 py-1.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                >
                                    <option value="updated">Última actualización</option>
                                    <option value="created">Fecha de creación</option>
                                    <option value="name">Nombre</option>
                                </select>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Active Sessions */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <h2 className="text-lg font-semibold text-foreground">
                        Sesiones Activas
                    </h2>
                    <span className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground">
                        {activeSessions.length}
                    </span>
                </div>

                {activeSessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/20 rounded-xl border border-dashed border-border">
                        <FileText className="w-12 h-12 text-muted-foreground/50 mb-3" />
                        <p className="text-muted-foreground text-sm">
                            No hay sesiones activas
                        </p>
                        <button
                            onClick={() => setShowNewSessionModal(true)}
                            className="mt-3 text-primary text-sm font-medium hover:underline"
                        >
                            Crear primera sesión
                        </button>
                    </div>
                ) : (
                    <div className={viewMode === 'grid'
                        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                        : 'flex flex-col gap-3'
                    }>
                        {activeSessions.map((session, index) => (
                            <SessionCard
                                key={session.id}
                                session={session}
                                viewMode={viewMode}
                                index={index}
                                onDelete={() => handleDeleteSession(session.id)}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Completed Sessions */}
            {completedSessions.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <h2 className="text-lg font-semibold text-foreground">
                            Sesiones Completadas
                        </h2>
                        <span className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground">
                            {completedSessions.length}
                        </span>
                    </div>

                    <div className={viewMode === 'grid'
                        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                        : 'flex flex-col gap-3'
                    }>
                        {completedSessions.map((session, index) => (
                            <SessionCard
                                key={session.id}
                                session={session}
                                viewMode={viewMode}
                                index={index}
                                onDelete={() => handleDeleteSession(session.id)}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Research Materials (Not in Session) */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <Archive className="w-4 h-4 text-muted-foreground" />
                    <h2 className="text-lg font-semibold text-foreground">
                        Materiales de Investigación
                    </h2>
                    <span className="text-xs text-muted-foreground">
                        (sin asignar a sesión)
                    </span>
                    <span className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground ml-auto">
                        {orphanDocs.length}
                    </span>
                </div>

                {loadingDocs ? (
                    <div className="flex items-center justify-center py-8">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
                        />
                    </div>
                ) : orphanDocs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/20 rounded-xl border border-dashed border-border">
                        <FileText className="w-10 h-10 text-muted-foreground/50 mb-2" />
                        <p className="text-muted-foreground text-sm">
                            Todos los materiales están asignados a sesiones
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {orphanDocs.map((doc, index) => (
                            <DocumentRow
                                key={doc.id}
                                document={doc}
                                index={index}
                                onRatingChange={(rating) => updateDocumentQualityRating(doc.id, rating)}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* New Session Modal */}
            <NewSessionModal
                isOpen={showNewSessionModal}
                onClose={() => setShowNewSessionModal(false)}
                projects={projects}
                researchDocs={researchDocs}
                onSessionCreated={() => {
                    setShowNewSessionModal(false);
                    onRefresh();
                }}
            />
        </div>
    );
}

// Session Card Component
interface SessionCardProps {
    session: ResearchSession;
    viewMode: ViewMode;
    index: number;
    onDelete: () => void;
}

function SessionCard({ session, viewMode, index, onDelete }: SessionCardProps) {
    const [showMenu, setShowMenu] = useState(false);

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

    if (viewMode === 'list') {
        return (
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
            >
                <Link href={`/research/${session.id}`}>
                    <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-lg transition-all group">
                        <GripVertical className="w-4 h-4 text-muted-foreground/50" />

                        <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                                {session.name}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                {session.document_count} documentos
                            </p>
                        </div>

                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[session.status]}`}>
                            {statusLabels[session.status]}
                        </span>

                        <span className="text-xs text-muted-foreground">
                            {new Date(session.updated_at).toLocaleDateString('es-ES')}
                        </span>

                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowMenu(!showMenu);
                            }}
                            className="p-1 rounded-md hover:bg-muted transition-colors"
                        >
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>
                </Link>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="relative"
        >
            <Link href={`/research/${session.id}`}>
                <Card className="h-full hover:border-primary/30 hover:shadow-xl transition-all group cursor-pointer">
                    <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[session.status]}`}>
                                {statusLabels[session.status]}
                            </span>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowMenu(!showMenu);
                                }}
                                className="p-1 rounded-md hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </button>
                        </div>
                        <CardTitle className="text-lg mt-3 group-hover:text-primary transition-colors">
                            {session.name}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <FileText className="w-4 h-4" />
                                <span>{session.document_count} docs</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                <span>{new Date(session.updated_at).toLocaleDateString('es-ES')}</span>
                            </div>
                        </div>

                        {!!session.metadata?.description && (
                            <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                                {(session.metadata.description as string) || ''}
                            </p>
                        )}

                        {/* Quick Actions */}
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                            <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors">
                                <Play className="w-4 h-4" />
                                Continuar
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </Link>

            {/* Context Menu */}
            <AnimatePresence>
                {showMenu && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute top-12 right-4 z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[160px]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowMenu(false)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                            <Edit3 className="w-4 h-4" />
                            Editar
                        </button>
                        <button
                            onClick={() => {
                                setShowMenu(false);
                                onDelete();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Eliminar
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// Document Row Component
interface DocumentRowProps {
    document: Document;
    index: number;
    onRatingChange: (rating: number) => void;
}

function DocumentRow({ document, index, onRatingChange }: DocumentRowProps) {
    const [rating, setRating] = useState<number>(
        ((document as any).metadata as Record<string, unknown>)?.quality_score as number || 0
    );
    const [hoveredStar, setHoveredStar] = useState<number>(0);

    const handleRatingClick = (newRating: number) => {
        setRating(newRating);
        onRatingChange(newRating);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-all group"
        >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
                <Link
                    href={`/documents/${document.id}/view`}
                    className="font-medium text-foreground hover:text-primary transition-colors block truncate"
                >
                    {document.title}
                </Link>
                <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                        INVESTIGACIÓN
                    </span>
                    <QualityBadge score={calculateQualityScore(document).score} className="scale-90 origin-left" />
                    <span className="text-xs text-muted-foreground">
                        {new Date(document.updated_at).toLocaleDateString('es-ES')}
                    </span>
                </div>
            </div>

            {/* Quality Rating */}
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        onClick={() => handleRatingClick(star)}
                        onMouseEnter={() => setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(0)}
                        className="p-0.5 transition-transform hover:scale-110"
                    >
                        <Star
                            className={`w-4 h-4 transition-colors ${star <= (hoveredStar || rating)
                                ? 'text-yellow-500 fill-yellow-500'
                                : 'text-muted-foreground/30'
                                }`}
                        />
                    </button>
                ))}
            </div>

            {/* Add to Session Button */}
            <button
                className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/20"
            >
                + Añadir a Sesión
            </button>
        </motion.div>
    );
}
