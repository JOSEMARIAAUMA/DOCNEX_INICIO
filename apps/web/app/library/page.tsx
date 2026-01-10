'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Library, Search, Plus, BookOpen, Scale, Globe,
    ChevronRight, ArrowLeft, Info, AlertTriangle, CheckCircle,
    LayoutGrid, List, MoreVertical, Bookmark, Map as MapIcon,
    Database, Zap
} from 'lucide-react';
import Link from 'next/link';
import { listGlobalRegulatoryResources } from '@/lib/api';
import LibraryCognitiveGraph from '@/components/visual/LibraryCognitiveGraph';
import RegisterResourceModal from '@/components/library/RegisterResourceModal';

// Types for Regulatory Library
interface RegulatoryResource {
    id: string;
    title: string;
    theme?: string;
    meta: {
        area: string;
        range: 'ESTATAL' | 'REGIONAL' | 'SUBREGIONAL' | 'MUNICIPAL';
        compliance_type: 'OBLIGATORY' | 'RECOMMENDATION' | 'REFERENCE';
        jurisdiction: string;
        version_date: string;
        summary?: string;
    };
    created_at: string;
}

export default function LibraryPage() {
    const [resources, setResources] = useState<RegulatoryResource[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'graph'>('grid');
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);

    // Filters
    const [filterRange, setFilterRange] = useState<string | null>(null);
    const [filterCompliance, setFilterCompliance] = useState<string | null>(null);
    const [filterJurisdiction, setFilterJurisdiction] = useState<string | null>(null);
    const [filterTheme, setFilterTheme] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await listGlobalRegulatoryResources();
            // Ensure data matches our expected interface
            setResources((data || []) as any[]);
        } catch (err) {
            console.error("Error loading global resources:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredResources = useMemo(() => {
        return resources.filter(res => {
            const matchesSearch = res.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                res.meta?.summary?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRange = !filterRange || res.meta?.range === filterRange;
            const matchesCompliance = !filterCompliance || res.meta?.compliance_type === filterCompliance;
            const matchesJurisdiction = !filterJurisdiction || res.meta?.jurisdiction === filterJurisdiction;
            const matchesTheme = !filterTheme || res.theme === filterTheme;

            return matchesSearch && matchesRange && matchesCompliance && matchesJurisdiction && matchesTheme;
        });
    }, [resources, searchQuery, filterRange, filterCompliance, filterJurisdiction, filterTheme]);

    const getComplianceStyles = (type: string) => {
        switch (type) {
            case 'OBLIGATORY': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'RECOMMENDATION': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
            default: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
        }
    };

    return (
        <div className="h-screen flex bg-background text-foreground overflow-hidden font-sans selection:bg-primary/20">
            {/* Sidebar: Librarian Filters */}
            <aside className="w-80 border-r border-border bg-card/30 backdrop-blur-xl flex flex-col p-8 gap-8 shrink-0 z-50 overflow-y-auto no-scrollbar">
                <div className="flex flex-col gap-2 shrink-0">
                    <Link href="/documents" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-4 group lowercase first-letter:uppercase">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-xs font-bold uppercase tracking-widest">Regresar al Despacho</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20">
                            <Library className="w-7 h-7 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight leading-none mb-1">La Librería</h1>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-[0.2em]">Caja de Herramientas Normativa</p>
                        </div>
                    </div>
                </div>

                {/* Status Bar */}
                <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-2xl border border-border/40 shrink-0">
                    <div className="flex-1">
                        <span className="block text-[9px] font-black text-muted-foreground uppercase opacity-60">Sincronización AI</span>
                        <div className="flex items-center gap-2 mt-1">
                            <Zap className="w-3 h-3 text-green-500 animate-pulse" />
                            <span className="text-xs font-bold">Analista Activo</span>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-border/40" />
                    <div className="text-right">
                        <span className="block text-xl font-black leading-none">{filteredResources.length}</span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Leyes</span>
                    </div>
                </div>

                {/* Advanced Filters */}
                <div className="space-y-8 pb-10">
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4 flex items-center gap-2">
                            <Globe className="w-3 h-3" /> Por Jurisdicción
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {['Andalucía', 'España', 'Cádiz', 'Europa'].map(place => (
                                <button
                                    key={place}
                                    onClick={() => setFilterJurisdiction(filterJurisdiction === place ? null : place)}
                                    className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all ${filterJurisdiction === place
                                            ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20'
                                            : 'bg-muted/50 border-border/50 text-muted-foreground hover:bg-muted'
                                        }`}
                                >
                                    {place}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4 flex items-center gap-2">
                            <Bookmark className="w-3 h-3" /> Por Tema Especializado
                        </h3>
                        <div className="space-y-1">
                            {['Urbanismo', 'Arquitectura', 'Vivienda', 'Patrimonio', 'Medio Ambiente'].map(theme => (
                                <button
                                    key={theme}
                                    onClick={() => setFilterTheme(filterTheme === theme ? null : theme)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all ${filterTheme === theme
                                            ? 'bg-primary/5 border-primary text-primary font-black'
                                            : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted/40'
                                        }`}
                                >
                                    <span className="text-xs">{theme}</span>
                                    {filterTheme === theme && <CheckCircle className="w-3.5 h-3.5" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4 flex items-center gap-2">
                            <Scale className="w-3 h-3" /> Vinculación Jurídica
                        </h3>
                        <div className="space-y-2">
                            {[
                                { id: 'OBLIGATORY', label: 'Obligatorio', icon: AlertTriangle, color: 'text-red-500' },
                                { id: 'RECOMMENDATION', label: 'Recomendado', icon: Info, color: 'text-amber-500' },
                                { id: 'REFERENCE', label: 'Referencia', icon: BookOpen, color: 'text-blue-500' }
                            ].map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => setFilterCompliance(filterCompliance === type.id ? null : type.id)}
                                    className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${filterCompliance === type.id
                                            ? 'bg-card border-primary shadow-lg ring-1 ring-primary/20'
                                            : 'bg-muted/40 border-transparent hover:border-border/50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <type.icon className={`w-4 h-4 ${type.color}`} />
                                        <span className={`text-xs font-bold ${filterCompliance === type.id ? 'text-primary' : 'text-foreground'}`}>{type.label}</span>
                                    </div>
                                    <div className={`w-1.5 h-1.5 rounded-full ${type.color} opacity-40`} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Librarian's Note */}
                <div className="mt-auto p-6 bg-primary/5 rounded-[2.5rem] border border-primary/10 relative overflow-hidden group shrink-0">
                    <div className="absolute -top-4 -right-4 w-16 h-16 bg-primary/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                        <Database className="w-3 h-3" /> Memoria Colectiva
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed italic">
                        "La normativa es la base, pero tu experiencia es el cemento. No olvides subir tus 'lecciones aprendidas' para el futuro."
                    </p>
                </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-slate-50/10 dark:bg-transparent relative">
                {/* Header */}
                <header className="h-24 px-12 border-b border-border/60 bg-card/60 backdrop-blur-md flex items-center justify-between sticky top-0 z-40 shrink-0">
                    <div className="relative w-full max-w-xl group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar en el Repositorio Maestro..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-muted/40 border border-transparent focus:bg-card focus:border-primary/30 rounded-2xl pl-12 pr-6 py-3.5 text-sm outline-none transition-all placeholder:text-muted-foreground/50 font-medium"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex bg-muted/80 p-1.5 rounded-xl border border-border/50 shadow-inner">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:bg-card/50'}`}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('graph')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'graph' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:bg-card/50'}`}
                            >
                                <MapIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <button
                            onClick={() => setIsRegisterOpen(true)}
                            className="bg-primary text-primary-foreground px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 group"
                        >
                            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" /> Registrar Norma
                        </button>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden relative">
                    <AnimatePresence mode="wait">
                        {viewMode === 'grid' ? (
                            <motion.div
                                key="grid"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="h-full overflow-y-auto no-scrollbar p-12"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-20">
                                    {loading ? (
                                        Array(8).fill(0).map((_, i) => (
                                            <div key={i} className="h-72 bg-card/50 rounded-[2.5rem] border border-border/50 animate-pulse" />
                                        ))
                                    ) : (
                                        filteredResources.map((res, idx) => (
                                            <motion.div
                                                key={res.id}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: idx * 0.03 }}
                                                className="group relative bg-card/60 backdrop-blur-sm border border-border/80 hover:border-primary/50 rounded-[2.5rem] p-8 transition-all hover:shadow-2xl hover:shadow-primary/5 flex flex-col h-72"
                                            >
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className={`px-3 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase border ${getComplianceStyles(res.meta?.compliance_type || 'REFERENCE')}`}>
                                                        {res.meta?.compliance_type || 'REFERENCIA'}
                                                    </div>
                                                    <button className="p-2 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-3 text-[10px] font-bold text-primary uppercase tracking-wider">
                                                        <span className="px-2 py-0.5 bg-primary/5 rounded-md border border-primary/10">{res.meta?.range}</span>
                                                        <span className="opacity-40">•</span>
                                                        <span className="text-muted-foreground truncate">{res.theme || 'Universal'}</span>
                                                    </div>
                                                    <h3 className="text-xl font-bold leading-tight group-hover:text-primary transition-colors cursor-pointer line-clamp-2 mb-2">
                                                        {res.title}
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed opacity-70">
                                                        {res.meta?.summary || 'Documento normativo indexado en el repositorio maestro de DOCNEX.'}
                                                    </p>
                                                </div>

                                                <div className="mt-8 flex items-center justify-between text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                                    <div className="flex items-center gap-2">
                                                        <Globe className="w-3.5 h-3.5 text-primary/40" />
                                                        {res.meta?.jurisdiction || 'General'}
                                                    </div>
                                                    <div className="flex items-center gap-2 group-hover:text-primary transition-colors cursor-pointer group-hover:gap-3 transition-all">
                                                        Explorar <ChevronRight className="w-3 h-3" />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}

                                    {!loading && filteredResources.length === 0 && (
                                        <div className="col-span-full py-40 flex flex-col items-center justify-center text-center opacity-40 grayscale">
                                            <Library className="w-20 h-20 mb-6" />
                                            <h3 className="text-2xl font-black mb-2 tracking-tighter">Sin resultados maestros</h3>
                                            <p className="text-sm max-w-xs mx-auto">El bibliotecario no ha encontrado normas que coincidan con estos filtros en el repositorio global.</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="graph"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="h-full w-full p-8"
                            >
                                <LibraryCognitiveGraph
                                    resources={filteredResources}
                                    onResourceClick={(id) => console.log('Click on', id)}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            <RegisterResourceModal
                isOpen={isRegisterOpen}
                onClose={() => setIsRegisterOpen(false)}
                onSuccess={loadData}
            />
        </div>
    );
}
