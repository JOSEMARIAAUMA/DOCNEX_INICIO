'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import {
    Project, Document, Workspace,
    getWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace,
    listProjectsByWorkspace, createProject, updateProject, deleteProject,
    listProjects, listDocuments, createDocument,
    exportProjectToJSON, importProjectFromJSON
} from '@/lib/api';
import Link from 'next/link';
import {
    Folder, ChevronDown, Plus, Search, Filter, MoreVertical,
    LayoutGrid, List, Trash2, Archive, Edit2, Download, Upload,
    Globe, Briefcase, GraduationCap, Building2, User, Settings,
    ArrowRight, Clock, FileText, Link2, Box, ChevronLeft, Layout,
    Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DocumentListPage() {
    // Data State
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [projectDocuments, setProjectDocuments] = useState<Document[]>([]);
    const [allDocumentsPreview, setAllDocumentsPreview] = useState<Record<string, Document[]>>({});

    // UI State
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [activeTab, setActiveTab] = useState<'all' | 'active' | 'archived'>('all');

    // Modals / Input State
    const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newDocTitle, setNewDocTitle] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const iconInputRef = useRef<HTMLInputElement>(null);

    // Initial Load
    const loadInitialData = async () => {
        setLoading(true);
        try {
            const ws = await getWorkspaces();
            setWorkspaces(ws);

            const savedWsId = localStorage.getItem('lastWorkspaceId');
            const savedProjId = localStorage.getItem('lastProjectId');

            let wsId = selectedWorkspaceId || savedWsId;
            if (!wsId && ws.length > 0) {
                // Try to find EXAM first as it's the requested default
                const exam = ws.find(w => w.name === 'EXAM');
                wsId = exam ? exam.id : ws[0].id;
            }

            if (wsId) {
                setSelectedWorkspaceId(wsId);
                localStorage.setItem('lastWorkspaceId', wsId);
            }

            if (savedProjId && !selectedProjectId) {
                handleOpenProject(savedProjId);
            }
        } catch (e) {
            console.error('Error loading initial data:', e);
        } finally {
            setLoading(false);
        }
    };

    const loadWorkspaceContent = async () => {
        if (!selectedWorkspaceId) return;
        setLoading(true);
        try {
            const projs = await listProjectsByWorkspace(selectedWorkspaceId);
            setProjects(projs);

            const previewMap: Record<string, Document[]> = {};
            for (const p of projs) {
                const docs = await listDocuments(p.id);
                previewMap[p.id] = docs.slice(0, 3);
            }
            setAllDocumentsPreview(previewMap);
        } catch (e) {
            console.error('Error loading projects:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedWorkspaceId && !selectedProjectId) {
            loadWorkspaceContent();
        }
    }, [selectedWorkspaceId, selectedProjectId]);

    // Handlers
    const handleOpenProject = async (id: string) => {
        setSelectedProjectId(id);
        localStorage.setItem('lastProjectId', id);
        setLoading(true);
        try {
            const docs = await listDocuments(id);
            setProjectDocuments(docs.filter(d => !d.title.startsWith('ESTRATEGIA:')));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleBackToDashboard = () => {
        setSelectedProjectId(null);
        localStorage.removeItem('lastProjectId');
    };

    const handleAddWorkspace = async () => {
        if (!newTitle.trim()) return;
        const ws = await createWorkspace(newTitle);
        if (ws) {
            setNewTitle('');
            setShowNewWorkspaceModal(false);
            setSelectedWorkspaceId(ws.id);
            loadInitialData();
        }
    };

    const handleAddProject = async () => {
        if (!selectedWorkspaceId || !newTitle.trim()) return;
        const proj = await createProject(selectedWorkspaceId, newTitle, newDesc);
        if (proj) {
            setNewTitle('');
            setNewDesc('');
            setShowNewProjectModal(false);
            loadWorkspaceContent();
        }
    };

    const handleCreateDocument = async () => {
        if (!selectedProjectId || !newDocTitle.trim()) return;
        setLoading(true);
        try {
            await createDocument(selectedProjectId, newDocTitle);
            setNewDocTitle('');
            const docs = await listDocuments(selectedProjectId);
            setProjectDocuments(docs.filter(d => !d.title.startsWith('ESTRATEGIA:')));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        if (confirm('¿Eliminar este expediente y todos sus documentos de forma permanente? Esta acción no se puede deshacer.')) {
            setLoading(true);
            try {
                await deleteProject(id);
                // Optimistic update
                setProjects(prev => prev.filter(p => p.id !== id));
                await loadWorkspaceContent();
            } catch (err) {
                console.error("Error deleting project:", err);
                alert("Error al eliminar el expediente. Por favor, intente de nuevo.");
            } finally {
                setLoading(false);
            }
        }
    };

    const handleUpdateWorkspaceIcon = async (wsId: string, file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64 = e.target?.result as string;
            await updateWorkspace(wsId, { icon_url: base64 } as any);
            loadInitialData();
        };
        reader.readAsDataURL(file);
    };

    const handleImportClick = () => fileInputRef.current?.click();

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedWorkspaceId) return;
        setLoading(true);
        try {
            const text = await file.text();
            await importProjectFromJSON(text, selectedWorkspaceId);
            loadWorkspaceContent();
        } catch (err) {
            alert('Error:' + err);
        } finally {
            setLoading(false);
        }
    };

    // Filtered Logic
    const filteredProjects = useMemo(() => {
        let result = projects;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
        }
        return result;
    }, [projects, searchQuery]);

    const currentWorkspace = workspaces.find(w => w.id === selectedWorkspaceId);
    const currentProject = projects.find(p => p.id === selectedProjectId);

    // Helpers
    const getWorkspaceIcon = (ws: Workspace) => {
        if ((ws as any).icon_url) {
            return <img src={(ws as any).icon_url} className="w-full h-full object-cover rounded-2xl" alt={ws.name} />;
        }
        const n = ws.name.toLowerCase();
        if (n.includes('jurídico') || n.includes('ley')) return <Briefcase className="w-5 h-5" />;
        if (n.includes('arquitectura')) return <Building2 className="w-5 h-5" />;
        if (n.includes('universidad') || n.includes('acad')) return <GraduationCap className="w-5 h-5" />;
        return <Globe className="w-5 h-5" />;
    };

    if (loading && !selectedWorkspaceId) {
        return (
            <div className="h-screen flex items-center justify-center bg-background text-foreground">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-medium text-muted-foreground">Sincronizando DOCNEX...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex bg-background overflow-hidden font-sans text-foreground">
            {/* Sidebar: Workspaces */}
            <aside className="w-24 border-r border-border bg-card flex flex-col items-center py-8 gap-6 shrink-0 z-50 shadow-xl overflow-hidden">
                <Link href="/" className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 transition-all mb-2">
                    <Layout className="w-7 h-7 text-primary-foreground" />
                </Link>

                <div className="flex-1 flex flex-col gap-6 overflow-y-auto no-scrollbar w-full items-center px-1">
                    {workspaces.map(ws => (
                        <div key={ws.id} className="flex flex-col items-center gap-1.5 w-full">
                            <div className="relative group">
                                <button
                                    onClick={() => { setSelectedWorkspaceId(ws.id); setSelectedProjectId(null); localStorage.setItem('lastWorkspaceId', ws.id); }}
                                    className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${selectedWorkspaceId === ws.id
                                        ? 'bg-primary text-primary-foreground shadow-lg'
                                        : 'bg-muted border border-border/50 text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground'
                                        }`}
                                >
                                    {getWorkspaceIcon(ws)}
                                    <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[100] shadow-xl">
                                        {ws.name}
                                    </div>
                                    {selectedWorkspaceId === ws.id && <motion.div layoutId="ws_active" className="absolute -left-3 w-1.5 h-8 bg-primary rounded-r-full" />}
                                </button>

                                {selectedWorkspaceId === ws.id && (
                                    <button
                                        onClick={() => iconInputRef.current?.click()}
                                        className="absolute -bottom-1 -right-1 p-1 bg-card border border-border rounded-full shadow-sm text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Camera className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            <span className={`text-[11px] font-bold uppercase tracking-tighter truncate w-full text-center px-0.5 ${selectedWorkspaceId === ws.id ? 'text-primary' : 'text-muted-foreground'}`}>
                                {ws.name.split(' ')[0]}
                            </span>
                        </div>
                    ))}

                    <input
                        type="file"
                        ref={iconInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && selectedWorkspaceId) handleUpdateWorkspaceIcon(selectedWorkspaceId, file);
                        }}
                    />

                    <button
                        onClick={() => setShowNewWorkspaceModal(true)}
                        className="w-12 h-12 rounded-2xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-all active:scale-95 shrink-0"
                    >
                        <Plus className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex flex-col gap-4 mt-auto">
                    <button className="w-12 h-12 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground transition-all">
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-slate-50/10 dark:bg-transparent">
                {/* Header */}
                <header className="h-20 border-b border-border bg-card/60 backdrop-blur-xl px-10 flex items-center justify-between sticky top-0 z-40">
                    <div className="flex items-center gap-4">
                        {selectedProjectId && (
                            <button
                                onClick={handleBackToDashboard}
                                className="p-2.5 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition-all flex items-center gap-1 group"
                            >
                                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            </button>
                        )}
                        <div className="flex flex-col">
                            <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
                                {selectedProjectId ? currentProject?.name : (currentWorkspace?.name || 'Workspace')}
                                {!selectedProjectId && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20">
                                        {filteredProjects.length} PROYECTOS
                                    </span>
                                )}
                            </h2>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-0.5">
                                {selectedProjectId ? `Expediente en ${currentWorkspace?.name}` : 'Documentos y Relaciones Semánticas'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Filtrar por nombre o etiqueta..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-80 bg-muted/40 border border-border/50 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:bg-card focus:ring-2 focus:ring-primary/20 outline-none border-transparent transition-all"
                            />
                        </div>

                        <div className="h-8 w-px bg-border/60 mx-2" />

                        {!selectedProjectId && (
                            <button
                                onClick={() => setShowNewProjectModal(true)}
                                className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                NUEVO EXPEDIENTE
                            </button>
                        )}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto no-scrollbar px-10 py-10">
                    {selectedProjectId ? (
                        /* PROJECT DETAIL VIEW */
                        <div className="max-w-6xl mx-auto">
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
                                {/* Project Banner/Actions */}
                                <div className="bg-card border border-border rounded-[2.5rem] p-10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 border-b-8 border-b-primary/10">
                                    <div className="max-w-xl text-card-foreground">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-3 bg-primary/10 rounded-2xl">
                                                <Folder className="w-8 h-8 text-primary" />
                                            </div>
                                            <span className="text-xs font-black text-primary tracking-[0.2em] uppercase">Expediente Maestro</span>
                                        </div>
                                        <h1 className="text-4xl font-black mb-4 leading-tight">{currentProject?.name}</h1>
                                        <p className="text-muted-foreground text-lg leading-relaxed">{currentProject?.description || 'Gestiona la estructura documental y relaciones cognitivas para este proyecto.'}</p>
                                    </div>
                                    <div className="flex flex-col gap-3 w-full md:w-auto">
                                        <button className="flex items-center justify-center gap-2 px-6 py-3 bg-foreground text-background rounded-2xl font-bold hover:bg-primary transition-all">
                                            <Globe className="w-4 h-4" /> Ver Grafo Global
                                        </button>
                                        <button className="flex items-center justify-center gap-2 px-6 py-3 bg-muted hover:bg-muted-foreground/10 rounded-2xl font-bold transition-all text-foreground">
                                            <Archive className="w-4 h-4" /> Archivar Caso
                                        </button>
                                    </div>
                                </div>

                                {/* Documents Section */}
                                <div className="flex items-center justify-between border-b border-border pb-6">
                                    <h3 className="text-xl font-black flex items-center gap-2">
                                        <FileText className="w-6 h-6 text-primary" />
                                        DOCUMENTOS
                                        <span className="text-xs font-bold bg-muted px-2 py-1 rounded-md text-muted-foreground ml-2">{projectDocuments.length}</span>
                                    </h3>
                                    <div className="flex gap-4">
                                        <input
                                            type="text"
                                            placeholder="Título del nuevo documento..."
                                            value={newDocTitle}
                                            onChange={e => setNewDocTitle(e.target.value)}
                                            className="bg-card border border-border rounded-xl px-4 py-2 text-sm outline-none w-64 focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
                                        />
                                        <button
                                            onClick={handleCreateDocument}
                                            disabled={!newDocTitle.trim()}
                                            className="bg-primary text-primary-foreground p-2 rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                        >
                                            <Plus className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                                    {projectDocuments.map((doc, idx) => (
                                        <motion.div
                                            key={doc.id}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="group relative bg-card border border-border hover:border-primary/50 rounded-3xl p-8 transition-all hover:shadow-2xl hover:shadow-primary/5 text-card-foreground"
                                        >
                                            <div className="w-14 h-14 bg-primary/5 text-primary rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-all transform group-hover:rotate-6">
                                                <FileText className="w-7 h-7" />
                                            </div>
                                            <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">{doc.title}</h3>
                                            <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-8">
                                                <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {new Date(doc.updated_at).toLocaleDateString()}</span>
                                                <span className="w-1 h-1 bg-muted rounded-full" />
                                                <span>{doc.status || 'Draft'}</span>
                                            </div>

                                            <Link
                                                href={`/documents/${doc.id}`}
                                                className="w-full flex items-center justify-center gap-2 py-4 bg-muted hover:bg-primary hover:text-primary-foreground rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                                            >
                                                Entrar al Editor <ArrowRight className="w-4 h-4" />
                                            </Link>
                                        </motion.div>
                                    ))}
                                    {projectDocuments.length === 0 && (
                                        <div className="col-span-full py-20 bg-muted/20 border-2 border-dashed border-border rounded-[3rem] flex flex-col items-center justify-center text-center">
                                            <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
                                            <p className="text-muted-foreground font-bold">Sin documentos en este expediente.</p>
                                            <p className="text-xs text-muted-foreground mt-1 px-8">Crea un nuevo documento arriba para comenzar a estructurar.</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    ) : (
                        /* DASHBOARD VIEW */
                        <div className="max-w-[1600px] mx-auto">
                            <AnimatePresence mode="popLayout">
                                {filteredProjects.length > 0 ? (
                                    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8 pb-10" : "flex flex-col gap-4 pb-10"}>
                                        {filteredProjects.map((p, idx) => (
                                            <motion.div
                                                key={p.id}
                                                initial={{ opacity: 0, y: 30 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                layout
                                                className={`group relative bg-card border border-border/80 hover:border-primary/50 active:scale-[0.98] rounded-[2rem] transition-all duration-500 overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-primary/5 text-card-foreground ${viewMode === 'list' ? 'flex items-center p-6 h-32' : 'flex flex-col h-full'
                                                    }`}
                                            >
                                                <div className={viewMode === 'grid' ? "p-8 flex-1" : "flex-1 px-4"}>
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div className="w-14 h-14 bg-muted/50 rounded-2xl flex items-center justify-center text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary transition-all">
                                                            <Folder className="w-7 h-7" />
                                                        </div>
                                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-50">
                                                            <button
                                                                className="p-2.5 bg-card/80 backdrop-blur-sm border border-border/50 hover:bg-muted rounded-xl transition-all text-muted-foreground shadow-sm"
                                                                title="Editar expediente"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDeleteProject(p.id, e)}
                                                                className="p-2.5 bg-red-500/10 backdrop-blur-sm border border-red-500/20 hover:bg-red-500 hover:text-white rounded-xl transition-all text-red-500 shadow-sm"
                                                                title="Eliminar expediente"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors line-clamp-1">{p.name}</h3>
                                                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-6">
                                                        {p.description || `Expediente activo en ${currentWorkspace?.name}. Gestiona sus fuentes y relaciones.`}
                                                    </p>

                                                    {viewMode === 'grid' && (
                                                        <div className="space-y-3 mb-8">
                                                            <div className="h-px bg-border/50 w-full mb-4" />
                                                            {allDocumentsPreview[p.id]?.length > 0 ? (
                                                                allDocumentsPreview[p.id].map(doc => (
                                                                    <div key={doc.id} className="flex items-center gap-2.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors">
                                                                        <FileText className="w-3.5 h-3.5 opacity-50" />
                                                                        <span className="line-clamp-1">{doc.title}</span>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <p className="text-[10px] italic text-muted-foreground uppercase">Expediente sin documentos aún</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={() => handleOpenProject(p.id)}
                                                    className={`mt-auto w-full p-6 text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-between group-hover:bg-primary group-hover:text-primary-foreground ${viewMode === 'list' ? 'bg-transparent w-auto ml-auto px-10' : 'bg-muted/50 border-t border-border/40'
                                                        }`}
                                                >
                                                    Explorar Contenido
                                                    <ArrowRight className="w-4 h-4" />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-[70vh] flex flex-col items-center justify-center text-center">
                                        <div className="w-32 h-32 bg-primary/5 rounded-full flex items-center justify-center mb-10 border border-primary/10">
                                            <Folder className="w-12 h-12 text-primary/40" />
                                        </div>
                                        <h1 className="text-4xl font-black mb-4 tracking-tighter text-foreground">Sin expedientes activos</h1>
                                        <p className="text-muted-foreground text-lg max-w-sm mx-auto mb-10 leading-relaxed">Este workspace está sincronizado pero no contiene expedientes aún. Crea uno nuevo para comenzar.</p>
                                        <div className="flex gap-4">
                                            <button onClick={() => setShowNewProjectModal(true)} className="bg-primary text-primary-foreground px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/30 active:scale-95 transition-all">Crear Expediente</button>
                                            <button onClick={handleImportClick} className="bg-card border border-border px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-muted transition-all text-card-foreground">Restaurar Copia</button>
                                        </div>
                                        <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportFile} />
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </main>

            {/* Modals */}
            <AnimatePresence>
                {showNewWorkspaceModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-6">
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-card border border-border rounded-[3rem] p-12 max-w-lg w-full shadow-2xl overflow-hidden relative text-card-foreground">
                            <div className="absolute top-0 right-0 p-8">
                                <Box className="w-20 h-20 text-primary/5 -rotate-12" />
                            </div>
                            <h2 className="text-3xl font-black mb-4 tracking-tight">Nuevo Workspace</h2>
                            <p className="text-muted-foreground text-lg mb-10">Crea un ecosistema documental para un nuevo cliente o departamento.</p>

                            <div className="space-y-6 mb-12">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary block mb-3">Nombre del Espacio</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        className="w-full bg-muted/50 border-2 border-transparent focus:border-primary/50 rounded-2xl px-6 py-4 text-xl font-bold shadow-inner outline-none transition-all text-foreground"
                                        placeholder="Ej: DocNex Legal"
                                        value={newTitle}
                                        onChange={e => setNewTitle(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-6">
                                <button onClick={() => setShowNewWorkspaceModal(false)} className="flex-1 py-4 bg-muted hover:bg-muted-foreground/10 rounded-2xl font-black uppercase tracking-widest text-xs transition-all text-foreground">Cancelar</button>
                                <button onClick={handleAddWorkspace} className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/40 transition-all">Crear Espacio</button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {showNewProjectModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-6">
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-card border border-border rounded-[3rem] p-12 max-w-lg w-full shadow-2xl relative overflow-hidden text-card-foreground">
                            <div className="absolute top-0 right-0 p-8">
                                <Plus className="w-24 h-24 text-primary/5" />
                            </div>
                            <h2 className="text-3xl font-black mb-4 tracking-tight">Nuevo Expediente</h2>
                            <p className="text-muted-foreground text-lg mb-10">Sincronizando con <b>{currentWorkspace?.name}</b></p>

                            <div className="space-y-8 mb-12">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary block mb-3">Título Maestro</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        className="w-full bg-muted/50 border-2 border-transparent focus:border-primary/50 rounded-2xl px-6 py-4 text-xl font-bold shadow-inner outline-none transition-all text-foreground"
                                        placeholder="Ej: Análisis NEX-109..."
                                        value={newTitle}
                                        onChange={e => setNewTitle(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary block mb-3">Alcance / Descripción</label>
                                    <textarea
                                        className="w-full bg-muted/50 border-2 border-transparent focus:border-primary/50 rounded-2xl px-6 py-4 text-sm font-medium shadow-inner h-32 resize-none outline-none transition-all text-foreground"
                                        placeholder="Describe brevemente el objetivo del expediente..."
                                        value={newDesc}
                                        onChange={e => setNewDesc(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-6">
                                <button onClick={() => setShowNewProjectModal(false)} className="flex-1 py-4 bg-muted hover:bg-muted-foreground/10 rounded-2xl font-black uppercase tracking-widest text-xs transition-all text-foreground">Descartar</button>
                                <button onClick={handleAddProject} className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/40 transition-all">Inicializar</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
