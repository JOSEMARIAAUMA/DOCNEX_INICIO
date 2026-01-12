'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Library, Search, Plus, BookOpen, Scale, Globe,
    ChevronRight, ChevronLeft, ArrowLeft, Info, AlertTriangle, CheckCircle,
    LayoutGrid, List, MoreVertical, Bookmark, Map as MapIcon, Filter,
    Database, Zap, FileText, Link as LinkIcon, FileVideo, Presentation, Loader2,
    Shield, ShieldCheck, FileCheck
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { listGlobalRegulatoryResources, deleteResource, updateResource } from '@/lib/api';
import LibraryCognitiveGraph from '@/components/visual/LibraryCognitiveGraph';
import RegisterResourceModal from '@/components/library/RegisterResourceModal';
import EditResourceModal from '@/components/library/EditResourceModal';
import RegulatoryCard from '@/components/library/RegulatoryCard';
import { sentinel, SentinelAlert } from '@/lib/sentinel';
import { aiService } from '@/lib/ai/service';

// Types for Regulatory Library
interface RegulatoryResource {
    id: string;
    title: string;
    theme?: string;
    kind?: string;
    status: 'ACTIVE' | 'OBSOLETE' | 'VETOED';
    veto_reason?: string;
    replaced_by_id?: string;
    document_id?: string;
    source_uri?: string;
    meta: {
        area: string;
        range: 'ESTATAL' | 'REGIONAL' | 'SUBREGIONAL' | 'MUNICIPAL';
        compliance_type: 'OBLIGATORY' | 'RECOMMENDATION' | 'REFERENCE';
        jurisdiction: string;
        version_date: string;
        summary?: string;
    };
    tags?: string[];
    created_at: string;
}

export default function LibraryPage() {
    const [resources, setResources] = useState<RegulatoryResource[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'graph'>('grid');
    const [libMode, setLibMode] = useState<'regulatory' | 'reference'>('regulatory');
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingResource, setEditingResource] = useState<RegulatoryResource | null>(null);
    const router = useRouter();

    // Multi-Select Filters
    const [selectedRanges, setSelectedRanges] = useState<string[]>([]);
    const [selectedCompliances, setSelectedCompliances] = useState<string[]>([]);
    const [selectedJurisdictions, setSelectedJurisdictions] = useState<string[]>([]);
    const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
    const [showObsolete, setShowObsolete] = useState(false);

    // Sentinel State
    const [alerts, setAlerts] = useState<SentinelAlert[]>([]);
    const [isSentinelChecking, setIsSentinelChecking] = useState(false);
    const [healthStatus, setHealthStatus] = useState<'healthy' | 'warning' | 'critical'>('healthy');
    const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await listGlobalRegulatoryResources(undefined, showObsolete);
            // Ensure data matches our expected interface
            const resources = (data || []) as any[];
            setResources(resources);
            return resources;
        } catch (err) {
            console.error("Error loading global resources:", err);
            return [];
        } finally {
            setLoading(false);
        }
    };

    const runSentinelPass = async (currentResources: RegulatoryResource[]) => {
        setIsSentinelChecking(true);
        try {
            const officialUpdates = await sentinel.checkAllSources();
            setAlerts(officialUpdates);

            if (currentResources.length > 0) {
                const libraryTitles = currentResources.map(r => r.title);
                const aiCheck = await aiService.checkRegulatoryUpdates(libraryTitles, officialUpdates);

                // If AI finds high risk updates, set status to critical
                const hasHighRisk = aiCheck.updates.some(u => u.risk_level === 'high');
                setHealthStatus(hasHighRisk ? 'critical' : officialUpdates.length > 0 ? 'warning' : 'healthy');
            }
        } catch (err) {
            console.error("Sentinel check failed:", err);
        } finally {
            setIsSentinelChecking(false);
        }
    };

    useEffect(() => {
        loadData().then(data => {
            if (data) runSentinelPass(data as any[]);
        });
    }, [showObsolete]);

    const handleRead = (res: any) => {
        if (res.document_id) {
            router.push(`/documents/${res.document_id}/view`);
        } else {
            alert("Este recurso normativo aún no ha sido procesado como documento DOCNEX para lectura. Puedes consultar la fuente original pulsando en 'Explorar Fuente'.");
        }
    };

    const handleAction = async (action: 'delete' | 'archive' | 'external' | 'edit', res: any) => {
        try {
            if (action === 'delete') {
                if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente "${res.title}" del repositorio global?`)) return;
                await deleteResource(res.id);
                loadData();
            } else if (action === 'archive') {
                if (!confirm(`¿Deseas marcar "${res.title}" como obsoleta/vetada?`)) return;
                await updateResource(res.id, { status: 'VETOED' } as any);
                loadData();
            } else if (action === 'external') {
                if (res.source_uri) window.open(res.source_uri, '_blank');
            } else if (action === 'edit') {
                setEditingResource(res);
                setIsEditOpen(true);
            }
        } catch (err) {
            console.error("Error performing action:", err);
            alert("No se pudo completar la acción solicitada.");
        }
    };

    // Dynamic Filter Options extraction
    const availableJurisdictions = useMemo(() => {
        const set = new Set(resources.map(r => r.meta?.jurisdiction).filter((val): val is string => !!val));
        return Array.from(set).sort();
    }, [resources]);

    const availableThemes = useMemo(() => {
        const set = new Set(resources.map(r => r.theme).filter((val): val is string => !!val));
        return Array.from(set).sort();
    }, [resources]);

    const filteredResources = useMemo(() => {
        return resources.filter(res => {
            // Separation by mode
            const isReference = res.meta?.compliance_type === 'REFERENCE' || res.kind === 'example' || (res.tags && res.tags.includes('Referencia'));
            if (libMode === 'regulatory' && isReference) return false;
            if (libMode === 'reference' && !isReference) return false;

            const matchesSearch = res.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                res.meta?.summary?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesRange = selectedRanges.length === 0 || (res.meta?.range && selectedRanges.includes(res.meta.range));
            const matchesCompliance = selectedCompliances.length === 0 || (res.meta?.compliance_type && selectedCompliances.includes(res.meta.compliance_type));
            const matchesJurisdiction = selectedJurisdictions.length === 0 || (res.meta?.jurisdiction && selectedJurisdictions.includes(res.meta.jurisdiction));
            const matchesTheme = selectedThemes.length === 0 || (res.theme && selectedThemes.includes(res.theme));

            return matchesSearch && (matchesRange || false) && (matchesCompliance || false) && (matchesJurisdiction || false) && (matchesTheme || false);
        });
    }, [resources, searchQuery, selectedRanges, selectedCompliances, selectedJurisdictions, selectedThemes, libMode]);

    const toggleFilter = (list: string[], setList: (vals: string[]) => void, value: string) => {
        if (list.includes(value)) {
            setList(list.filter(v => v !== value));
        } else {
            setList([...list, value]);
        }
    };

    const getComplianceStyles = (type: string) => {
        switch (type) {
            case 'OBLIGATORY': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'RECOMMENDATION': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
            default: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
        }
    };

    const getResourceIcon = (kind: string) => {
        switch (kind?.toLowerCase()) {
            case 'pdf': return <FileText className="w-4 h-4" />;
            case 'docx': case 'doc': return <BookOpen className="w-4 h-4" />;
            case 'spreadsheet': case 'xlsx': case 'xls': case 'csv': return <Database className="w-4 h-4" />;
            case 'json': case 'xml': case 'html': return <Zap className="w-4 h-4" />;
            case 'google_doc': return <Globe className="w-4 h-4 text-blue-400" />;
            case 'markdown': return <FileText className="w-4 h-4 text-emerald-400" />;
            case 'powerpoint': return <Presentation className="w-4 h-4 text-orange-400" />;
            default: return <LinkIcon className="w-4 h-4" />;
        }
    };

    return (
        <div className="h-screen flex bg-background text-foreground overflow-hidden font-sans selection:bg-primary/20">
            {/* Sidebar: Librarian Filters */}
            <aside className="w-72 border-r border-border bg-card/10 backdrop-blur-xl flex flex-col p-6 gap-6 shrink-0 z-50 overflow-y-auto no-scrollbar">
                <div className="flex flex-col gap-2 shrink-0">
                    <Link href="/documents" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-4 group lowercase first-letter:uppercase">
                        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">El Despacho</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary rounded-xl shadow-lg shadow-primary/20">
                            <Library className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight leading-none mb-1">DOCNEX AI</h1>
                            <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-[0.2em]">Biblioteca de Alta fidelidad</p>
                        </div>
                    </div>
                </div>

                {/* Status Bar: Sentinel Health Indicator */}
                <div className={`flex items-center gap-3 p-3.5 rounded-2xl border shrink-0 transition-all duration-500 ${healthStatus === 'healthy' ? 'bg-green-500/5 border-green-500/10' :
                    healthStatus === 'warning' ? 'bg-amber-500/5 border-amber-500/10' :
                        'bg-red-500/5 border-red-500/10'
                    }`}>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="block text-[8px] font-black text-muted-foreground uppercase opacity-60">Salud Normativa</span>
                            {isSentinelChecking && <Loader2 className="w-2 h-2 animate-spin text-primary" />}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${healthStatus === 'healthy' ? 'bg-green-500' :
                                healthStatus === 'warning' ? 'bg-amber-500' :
                                    'bg-red-500'
                                }`} />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                {healthStatus === 'healthy' ? 'Sincronizado' :
                                    healthStatus === 'warning' ? 'Ajustes' :
                                        '¡Prioridad!'}
                            </span>
                        </div>
                    </div>
                    <div className="h-6 w-px bg-border/40" />
                    <div className="text-right">
                        <span className="block text-lg font-black leading-none">{filteredResources.length}</span>
                        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Items</span>
                    </div>
                </div>

                <div className="flex flex-col gap-4 py-2 border-y border-border/40 shrink-0">
                    <div className="flex items-center justify-between">
                        <Scale className={`w-3.5 h-3.5 ${showObsolete ? 'text-amber-500' : 'text-muted-foreground'}`} />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Modo Histórico</span>
                        <button
                            onClick={() => setShowObsolete(!showObsolete)}
                            className={`w-9 h-4.5 rounded-full p-1 transition-colors ${showObsolete ? 'bg-amber-500 shadow-md shadow-amber-500/20' : 'bg-muted/40'}`}
                        >
                            <motion.div
                                animate={{ x: showObsolete ? 18 : 0 }}
                                className="w-2.5 h-2.5 bg-white rounded-full translate-x-0"
                            />
                        </button>
                    </div>
                    {showObsolete && (
                        <p className="text-[9px] text-amber-500/60 font-medium leading-relaxed bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                            Visualizando normativa derogada para análisis retrospectivo y comparativas legales.
                        </p>
                    )}
                </div>

                {/* Radar del Centinela (Moved UP) */}
                <div className="flex flex-col gap-4 grow min-h-0">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2 shrink-0">
                        <Zap className="w-3 h-3" /> Radar del Centinela
                    </h3>
                    <div className="flex-1 overflow-y-auto no-scrollbar pb-4 space-y-2">
                        {alerts.length === 0 ? (
                            <div className="p-4 bg-muted/20 rounded-2xl border border-dashed border-border/40 text-[10px] text-muted-foreground text-center italic">
                                Escaneando boletines oficiales...
                            </div>
                        ) : (
                            alerts.map(alert => (
                                <div key={alert.id} className={`p-4 rounded-2xl border transition-all hover:scale-[1.02] cursor-pointer ${alert.severity === 'critical' ? 'bg-red-500/10 border-red-500/20' :
                                    alert.severity === 'warning' ? 'bg-amber-500/10 border-amber-500/20' :
                                        'bg-blue-500/10 border-blue-500/20'
                                    }`}>
                                    <div className="flex justify-between items-center mb-2.5">
                                        <div className="flex gap-2">
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${alert.type === 'DEROGATION' ? 'bg-red-500 text-white' :
                                                alert.type === 'MODIFICATION' ? 'bg-amber-500 text-black' :
                                                    'bg-blue-500 text-white'
                                                }`}>
                                                {alert.type === 'DEROGATION' ? 'Derogación' :
                                                    alert.type === 'MODIFICATION' ? 'Modificación' :
                                                        'Actualización'}
                                            </span>
                                            <div className="px-2 py-0.5 bg-background/50 border border-border/40 rounded text-[8px] font-bold text-muted-foreground">
                                                {alert.source}
                                            </div>
                                        </div>
                                    </div>
                                    <h4 className="text-xs font-black leading-tight mb-2 tracking-tight">{alert.title}</h4>
                                    <p className="text-[10px] font-medium opacity-80 line-clamp-3 leading-relaxed">{alert.description}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </aside>

            {/* Secondary Panel: Persistent Filters */}
            <motion.aside
                animate={{ width: isFiltersCollapsed ? 0 : 256, opacity: isFiltersCollapsed ? 0 : 1 }}
                className="border-r border-border bg-card/5 backdrop-blur-sm flex flex-col shrink-0 overflow-y-auto no-scrollbar relative"
            >
                <div className="p-6 space-y-8 min-w-[256px]">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80 flex items-center gap-2">
                            <Filter className="w-3 h-3" /> Filtros Maestros
                        </h3>
                        <button onClick={() => setIsFiltersCollapsed(true)} className="p-1 hover:bg-muted rounded-md text-muted-foreground"><ChevronRight className="w-3.5 h-3.5" /></button>
                    </div>

                    {/* Jurisdiction Filter */}
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-primary/60 mb-4 flex items-center gap-2">
                            <Globe className="w-3 h-3" /> Jurisdicción
                        </h3>
                        <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto no-scrollbar pr-2">
                            {(availableJurisdictions.length > 0 ? availableJurisdictions : ['Andalucía', 'España', 'Europa']).map(place => (
                                <button
                                    key={place}
                                    onClick={() => toggleFilter(selectedJurisdictions, setSelectedJurisdictions, place)}
                                    className={`w-full text-left px-4 py-3 text-xs font-bold rounded-xl border transition-all ${selectedJurisdictions.includes(place)
                                        ? 'bg-primary/10 border-primary/30 text-primary shadow-sm'
                                        : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted/50 hover:border-border/50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="tracking-tight">{place}</span>
                                        {selectedJurisdictions.includes(place) && <CheckCircle className="w-3.5 h-3.5" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Theme Filter */}
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-primary/60 mb-4 flex items-center gap-2">
                            <Bookmark className="w-3 h-3" /> Temática
                        </h3>
                        <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto no-scrollbar pr-2">
                            {(availableThemes.length > 0 ? availableThemes : ['Urbanismo', 'Arquitectura', 'Vivienda', 'Patrimonio', 'Medio Ambiente']).map(theme => (
                                <button
                                    key={theme}
                                    onClick={() => toggleFilter(selectedThemes, setSelectedThemes, theme)}
                                    className={`w-full text-left px-4 py-3 text-xs font-bold rounded-xl border transition-all ${selectedThemes.includes(theme)
                                        ? 'bg-primary/10 border-primary/30 text-primary shadow-sm'
                                        : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted/50 hover:border-border/50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="tracking-tight">{theme}</span>
                                        {selectedThemes.includes(theme) && <CheckCircle className="w-3.5 h-3.5" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Compliance/Vinculación Filter */}
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80 mb-4 flex items-center gap-2">
                            <Scale className="w-3 h-3" /> Vinculación Jurídica
                        </h3>
                        <div className="flex flex-col gap-2">
                            {[
                                { id: 'OBLIGATORY', label: 'Obligatorio', icon: AlertTriangle, color: 'text-red-500' },
                                { id: 'RECOMMENDATION', label: 'Recomendado', icon: Info, color: 'text-amber-500' },
                                { id: 'REFERENCE', label: 'Referencia', icon: BookOpen, color: 'text-blue-500' }
                            ].map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => toggleFilter(selectedCompliances, setSelectedCompliances, type.id)}
                                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all ${selectedCompliances.includes(type.id)
                                        ? 'bg-primary/5 border-primary/40 shadow-lg ring-1 ring-primary/10'
                                        : 'bg-muted/30 border-transparent hover:border-border/50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <type.icon className={`w-4 h-4 ${type.color}`} />
                                        <span className={`text-xs font-bold tracking-tight ${selectedCompliances.includes(type.id) ? 'text-primary' : 'text-foreground'}`}>{type.label}</span>
                                    </div>
                                    {selectedCompliances.includes(type.id) ? (
                                        <CheckCircle className="w-3.5 h-3.5 text-primary" />
                                    ) : (
                                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Reset All Filters Button */}
                {(selectedJurisdictions.length > 0 || selectedThemes.length > 0 || selectedCompliances.length > 0) && (
                    <button
                        onClick={() => {
                            setSelectedJurisdictions([]);
                            setSelectedThemes([]);
                            setSelectedCompliances([]);
                        }}
                        className="mx-6 mb-8 py-3 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-primary/10"
                    >
                        Limpiar Selección
                    </button>
                )}
            </motion.aside>

            {/* Handle for filters expansion */}
            {isFiltersCollapsed && (
                <button
                    onClick={() => setIsFiltersCollapsed(false)}
                    className="absolute left-[288px] top-1/2 -translate-y-1/2 w-4 h-24 bg-primary/10 hover:bg-primary/20 border-y border-r border-primary/20 rounded-r-lg z-50 flex items-center justify-center transition-all group"
                >
                    <ChevronRight className="w-3 h-3 text-primary group-hover:scale-125 transition-transform" />
                </button>
            )}

            {/* Main Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-slate-50/10 dark:bg-transparent relative">
                {/* Header: Focused Search Area */}
                <header className="h-20 px-12 border-b border-border/40 bg-card/60 backdrop-blur-xl flex items-center justify-between sticky top-0 z-40 shrink-0 gap-8">
                    {/* Library Mode Tabs - Integrated into header for space efficiency */}
                    <div className="flex items-center gap-0.5 bg-muted/40 p-1 rounded-xl border border-border/40 shrink-0">
                        <button
                            onClick={() => setLibMode('regulatory')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${libMode === 'regulatory'
                                ? 'bg-background shadow-sm text-primary border border-border/40'
                                : 'text-muted-foreground hover:bg-muted/50'
                                }`}
                        >
                            <ShieldCheck className="w-3.5 h-3.5" /> Normativa
                        </button>
                        <button
                            onClick={() => setLibMode('reference')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${libMode === 'reference'
                                ? 'bg-background shadow-sm text-primary border border-border/40'
                                : 'text-muted-foreground hover:bg-muted/50'
                                }`}
                        >
                            <Library className="w-3.5 h-3.5" /> Referencia
                        </button>
                    </div>

                    <div className="relative flex-1 group max-w-2xl">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar en el Repositorio..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-muted/20 border border-transparent focus:bg-card focus:border-border/60 rounded-xl pl-12 pr-6 py-2.5 text-xs outline-none transition-all placeholder:text-muted-foreground/40 font-bold tracking-tight"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex bg-muted/40 p-1 rounded-lg border border-border/40">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:bg-card/50'}`}
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setViewMode('graph')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'graph' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:bg-card/50'}`}
                            >
                                <MapIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <button
                            onClick={() => setIsRegisterOpen(true)}
                            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 group shrink-0"
                        >
                            <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" /> Registrar Documento
                        </button>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden relative flex flex-col pt-8 px-12 pb-0">
                    <AnimatePresence mode="wait">
                        {viewMode === 'grid' ? (
                            <motion.div
                                key="grid"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="h-full overflow-y-auto no-scrollbar"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-20">
                                    {loading ? (
                                        Array(10).fill(0).map((_, i) => (
                                            <div key={i} className="h-[280px] bg-card/10 rounded-3xl border border-border/10 animate-pulse" />
                                        ))
                                    ) : (
                                        filteredResources.map((res, idx) => (
                                            <RegulatoryCard
                                                key={res.id}
                                                resource={res}
                                                idx={idx}
                                                onRead={handleRead}
                                                onAction={handleAction}
                                            />
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
                                className="h-full w-full"
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

            <EditResourceModal
                isOpen={isEditOpen}
                onClose={() => {
                    setIsEditOpen(false);
                    setEditingResource(null);
                }}
                onSuccess={loadData}
                resource={editingResource}
            />
        </div>
    );
}
