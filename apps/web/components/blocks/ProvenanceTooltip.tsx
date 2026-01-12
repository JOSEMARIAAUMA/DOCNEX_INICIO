'use client';

import React, { useState, useEffect } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { FileText, Calendar, Cpu, Sparkles, ExternalLink, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBlockProvenance } from '@/actions/synthesis';
import { BlockProvenance } from '@/lib/ai/synthesis-schemas';

// ==================== TYPES ====================

interface ProvenanceWithDetails extends BlockProvenance {
    source_document?: { id: string; title: string };
    source_block?: { id: string; title: string };
}

interface ProvenanceTooltipProps {
    blockId: string;
    children: React.ReactNode;
    onNavigateToSource?: (docId: string, blockId: string) => void;
    sessionName?: string;
}

// ==================== CONTRIBUTION BAR ====================

function ContributionBar({ percentage, color }: { percentage: number; color: string }) {
    return (
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                    width: `${percentage}%`,
                    backgroundColor: color
                }}
            />
        </div>
    );
}

// ==================== PROVENANCE SOURCE ITEM ====================

interface SourceItemProps {
    source: ProvenanceWithDetails;
    index: number;
    onNavigate?: () => void;
}

function SourceItem({ source, index, onNavigate }: SourceItemProps) {
    const colors = [
        '#3b82f6', // blue
        '#22c55e', // green
        '#f97316', // orange
        '#a855f7', // purple
        '#ec4899', // pink
    ];

    const color = colors[index % colors.length];
    const docTitle = source.source_document?.title || 'Documento Desconocido';
    const blockTitle = source.source_block?.title || `Bloque ${source.source_block_id?.slice(-6) || 'N/A'}`;

    return (
        <div
            className={cn(
                "group flex flex-col gap-1 p-2 rounded-lg transition-colors",
                onNavigate && "cursor-pointer hover:bg-accent"
            )}
            onClick={onNavigate}
        >
            <div className="flex items-start gap-2">
                <div className="mt-1">
                    {index === 0 ? (
                        <div className="text-muted-foreground">├─</div>
                    ) : (
                        <div className="text-muted-foreground">
                            {index === 0 ? '├─' : '└─'}
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <FileText
                            className="w-3.5 h-3.5 shrink-0"
                            style={{ color }}
                        />
                        <span className="text-xs font-medium truncate text-foreground">
                            {docTitle}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            ({blockTitle})
                        </span>
                    </div>

                    <div className="mt-1">
                        <ContributionBar
                            percentage={source.contribution_percentage}
                            color={color}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span
                        className="text-xs font-bold"
                        style={{ color }}
                    >
                        {source.contribution_percentage}%
                    </span>
                    {onNavigate && (
                        <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                </div>
            </div>
        </div>
    );
}

// ==================== MAIN COMPONENT ====================

export function ProvenanceTooltip({
    blockId,
    children,
    onNavigateToSource,
    sessionName,
}: ProvenanceTooltipProps) {
    const [provenance, setProvenance] = useState<ProvenanceWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    // Fetch provenance data on hover
    const handleOpenChange = async (open: boolean) => {
        setIsOpen(open);

        if (open && !hasLoaded) {
            setIsLoading(true);
            try {
                const result = await getBlockProvenance(blockId);
                if (result.success && result.provenance) {
                    setProvenance(result.provenance as ProvenanceWithDetails[]);
                }
            } catch (error) {
                console.error('[ProvenanceTooltip] Error fetching provenance:', error);
            } finally {
                setIsLoading(false);
                setHasLoaded(true);
            }
        }
    };

    // Format date nicely
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('es-ES', {
            dateStyle: 'short',
            timeStyle: 'short',
        });
    };

    // Determine operation type label
    const getOperationType = () => {
        if (provenance.length === 0) return 'Original';
        const types = provenance.map(p => p.contribution_type);
        if (types.includes('merged')) return 'AI Merge';
        if (types.includes('synthesized')) return 'AI Síntesis';
        return 'Compilación';
    };

    // No provenance means it's an original block
    if (!blockId) {
        return <>{children}</>;
    }

    return (
        <Tooltip.Provider delayDuration={300}>
            <Tooltip.Root open={isOpen} onOpenChange={handleOpenChange}>
                <Tooltip.Trigger asChild>
                    {children}
                </Tooltip.Trigger>

                <Tooltip.Portal>
                    <Tooltip.Content
                        className={cn(
                            "z-50 w-80 p-0 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden",
                            "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
                            "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
                        )}
                        sideOffset={8}
                        side="top"
                    >
                        {/* Header */}
                        <div className="px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-b border-border">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-primary" />
                                <span className="text-sm font-semibold text-foreground">
                                    Procedencia del Bloque
                                </span>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-6">
                                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : provenance.length === 0 ? (
                                <div className="text-center py-4">
                                    <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">
                                        Bloque original sin fuentes adicionales
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Sources Header */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <FileText className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Fuentes:
                                        </span>
                                    </div>

                                    {/* Sources List */}
                                    <div className="space-y-1 mb-4 pl-2 border-l-2 border-muted">
                                        {provenance.map((source, index) => (
                                            <SourceItem
                                                key={source.id}
                                                source={source}
                                                index={index}
                                                onNavigate={
                                                    onNavigateToSource && source.source_document
                                                        ? () => onNavigateToSource(
                                                            source.source_document!.id,
                                                            source.source_block_id || ''
                                                        )
                                                        : undefined
                                                }
                                            />
                                        ))}
                                    </div>

                                    {/* Metadata */}
                                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="text-xs text-muted-foreground">
                                                {provenance[0]?.created_at
                                                    ? formatDate(provenance[0].created_at)
                                                    : 'Fecha desconocida'
                                                }
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="text-xs text-muted-foreground">
                                                {getOperationType()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Session Name */}
                                    {sessionName && (
                                        <div className="mt-3 pt-3 border-t border-border">
                                            <div className="flex items-center gap-2">
                                                <ChevronRight className="w-3.5 h-3.5 text-primary" />
                                                <span className="text-xs text-muted-foreground">
                                                    Sesión:
                                                </span>
                                                <span className="text-xs font-medium text-primary truncate">
                                                    "{sessionName}"
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <Tooltip.Arrow className="fill-popover" />
                    </Tooltip.Content>
                </Tooltip.Portal>
            </Tooltip.Root>
        </Tooltip.Provider>
    );
}

export default ProvenanceTooltip;
