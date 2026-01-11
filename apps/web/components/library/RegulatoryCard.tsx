import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText, BookOpen, Database, Zap, Globe,
    Link as LinkIcon, FileVideo, Presentation,
    MoreVertical, ChevronRight, AlertTriangle,
    Scale, Info, CheckCircle, Trash2, Archive, ExternalLink
} from 'lucide-react';

export interface RegulatoryResource {
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
    created_at: string;
}

interface RegulatoryCardProps {
    resource: RegulatoryResource;
    onRead?: (res: RegulatoryResource) => void;
    onAction?: (action: 'delete' | 'archive' | 'external', res: RegulatoryResource) => void;
    idx?: number;
}

export default function RegulatoryCard({ resource, onRead, onAction, idx = 0 }: RegulatoryCardProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const isObsolete = resource.status === 'OBSOLETE' || resource.status === 'VETOED';

    const getComplianceStyles = (type: string) => {
        switch (type) {
            case 'OBLIGATORY': return 'text-black bg-red-400 border-red-500/30 font-black shadow-sm';
            case 'RECOMMENDATION': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
            default: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
        }
    };

    const getResourceIcon = (kind: string) => {
        switch (kind?.toLowerCase()) {
            case 'pdf': return <FileText className="w-3.5 h-3.5" />;
            case 'docx': case 'doc': return <BookOpen className="w-3.5 h-3.5" />;
            case 'spreadsheet': case 'xlsx': case 'xls': case 'csv': return <Database className="w-3.5 h-3.5" />;
            case 'json': case 'xml': case 'html': return <Zap className="w-3.5 h-3.5" />;
            case 'google_doc': return <Globe className="w-3.5 h-3.5 text-blue-400" />;
            case 'markdown': return <FileText className="w-3.5 h-3.5 text-emerald-400" />;
            case 'powerpoint': return <Presentation className="w-3.5 h-3.5 text-orange-400" />;
            default: return <LinkIcon className="w-3.5 h-3.5" />;
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMenuOpen]);

    const handleExternalClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onAction?.('external', resource);
    };

    const handleMenuAction = (action: 'delete' | 'archive' | 'external', e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMenuOpen(false);
        onAction?.(action, resource);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            onClick={() => onRead?.(resource)}
            className={`group relative bg-card/40 backdrop-blur-md border rounded-3xl p-6 transition-all hover:shadow-2xl hover:shadow-primary/5 flex flex-col h-[280px] overflow-hidden cursor-pointer ${isObsolete
                ? 'opacity-60 grayscale border-dashed border-border/40'
                : 'border-border/60 hover:border-primary/40'
                }`}
        >
            {/* Status Indicator Mesh Shadow */}
            {!isObsolete && (
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
            )}

            {/* Veto/Obsolete Badge */}
            {isObsolete && (
                <div className={`absolute top-4 right-4 z-10 p-1.5 rounded-full shadow-lg ${resource.status === 'VETOED' ? 'bg-red-500' : 'bg-amber-500'
                    }`}>
                    <AlertTriangle className="w-3 h-3 text-white" />
                </div>
            )}

            {/* Header: Compliance & Actions */}
            <div className="flex justify-between items-start mb-4 relative z-20">
                <div className={`px-2.5 py-1 rounded-lg text-[8px] font-black tracking-widest uppercase border ${getComplianceStyles(resource.meta?.compliance_type || 'REFERENCE')}`}>
                    {resource.meta?.compliance_type === 'OBLIGATORY' ? 'Norma Obligatoria' :
                        resource.meta?.compliance_type === 'RECOMMENDATION' ? 'Recomendación' : 'Referencia Técnica'}
                </div>

                <div className="relative" ref={menuRef}>
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                        className="p-1.5 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all rounded-full hover:bg-muted/50"
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>

                    <AnimatePresence>
                        {isMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="absolute right-0 mt-2 w-48 bg-card border border-border shadow-2xl rounded-xl p-1.5 z-50 backdrop-blur-xl"
                            >
                                <button
                                    onClick={(e) => handleMenuAction('external', e)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                                >
                                    <ExternalLink className="w-3.5 h-3.5 text-blue-400" /> Ver Fuente Original
                                </button>
                                <button
                                    onClick={(e) => handleMenuAction('archive', e)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                                >
                                    <Archive className="w-3.5 h-3.5 text-amber-500" /> Archivar Recurso
                                </button>
                                <div className="my-1 border-t border-border/50" />
                                <button
                                    onClick={(e) => handleMenuAction('delete', e)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Eliminar del Repositorio
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Meta Row */}
                <div className="flex items-center gap-2 mb-3 text-[9px] font-bold text-primary/80 uppercase tracking-wider">
                    <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                        {getResourceIcon(resource.kind || 'pdf')}
                    </div>
                    <span className="px-1.5 py-0.5 bg-muted/50 rounded border border-border/50 text-muted-foreground">{resource.meta?.range}</span>
                    <span className="opacity-30">•</span>
                    <span className="text-muted-foreground truncate max-w-[80px]">{resource.theme || 'Universal'}</span>
                </div>

                {/* Title */}
                <h3 className="text-base font-heavy leading-[1.3] group-hover:text-primary transition-colors line-clamp-2 mb-2 tracking-tight">
                    {resource.title}
                </h3>

                {/* Summary */}
                <p className="text-[11px] text-muted-foreground/70 line-clamp-3 leading-relaxed font-medium">
                    {resource.meta?.summary || 'Documento normativo indexado en el repositorio maestro de DOCNEX AI para gestión de planeamiento.'}
                </p>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                <div className="flex items-center gap-2">
                    <Globe className="w-3 h-3 text-primary/40" />
                    <span className="max-w-[100px] truncate">{resource.meta?.jurisdiction || 'General'}</span>
                </div>
                <div
                    onClick={handleExternalClick}
                    className="flex items-center gap-1.5 text-primary group-hover:gap-2.5 transition-all cursor-pointer hover:underline"
                >
                    Explorar Fuente <ExternalLink className="w-2.5 h-2.5" />
                </div>
            </div>

            {/* Animated Underline */}
            <div className="absolute bottom-0 left-0 h-1 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left w-full" />
        </motion.div>
    );
}
