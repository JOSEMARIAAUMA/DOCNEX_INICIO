'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { listBlocksForViewer } from '@/lib/api';
import { LayerControlPanel } from './LayerControlPanel';
import { ViewerBlock } from './ViewerBlock';
import { DocumentNavigator } from './DocumentNavigator';
import { ChevronLeft, Loader2, FileText, Eye, Layers } from 'lucide-react';
import Link from 'next/link';

interface DocumentFullViewerProps {
    document: any;
}

export function DocumentFullViewer({ document: docRecord }: DocumentFullViewerProps) {
    const [blocks, setBlocks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Layer States - Init with Defaults to prevent Hydration Mismatch
    // We initialize to 'true' (or desired default) and update from localStorage ONLY on client
    const [showMapping, setShowMapping] = useState(true);
    const [showNotes, setShowNotes] = useState(true);
    const [showTags, setShowTags] = useState(false);
    const [showSubBlocks, setShowSubBlocks] = useState(true);
    const [showSupport, setShowSupport] = useState(true);
    const [showVersions, setShowVersions] = useState(false);

    // Load preferences on mount (Client Only)
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const load = (key: string, setter: (val: boolean) => void) => {
            const saved = localStorage.getItem(key);
            if (saved !== null) setter(JSON.parse(saved));
        };

        load('viewer_show_mapping', setShowMapping);
        load('viewer_show_notes', setShowNotes);
        load('viewer_show_tags', setShowTags);
        load('viewer_show_subblocks', setShowSubBlocks);
        load('viewer_show_support', setShowSupport);
        load('viewer_show_versions', setShowVersions);
    }, []);

    // Navigator State
    const [activeBlockId, setActiveBlockId] = useState<string | undefined>(undefined);

    const handleBlockClick = (blockId: string) => {
        const safeId = String(blockId);
        // Correctly using global document now (renamed prop avoids shadowing)
        const element = document.getElementById(`block-${safeId}`);

        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveBlockId(safeId);
        } else {
            console.warn(`Navigator: Element block-${safeId} not found in DOM`);
        }
    };

    // Save states to localStorage
    useEffect(() => { localStorage.setItem('viewer_show_mapping', JSON.stringify(showMapping)); }, [showMapping]);
    useEffect(() => { localStorage.setItem('viewer_show_notes', JSON.stringify(showNotes)); }, [showNotes]);
    useEffect(() => { localStorage.setItem('viewer_show_tags', JSON.stringify(showTags)); }, [showTags]);
    useEffect(() => { localStorage.setItem('viewer_show_subblocks', JSON.stringify(showSubBlocks)); }, [showSubBlocks]);
    useEffect(() => { localStorage.setItem('viewer_show_support', JSON.stringify(showSupport)); }, [showSupport]);
    useEffect(() => { localStorage.setItem('viewer_show_versions', JSON.stringify(showVersions)); }, [showVersions]);

    useEffect(() => {
        loadBlocks();
    }, [docRecord.id]);

    const loadBlocks = async () => {
        setIsLoading(true);
        try {
            const data = await listBlocksForViewer(docRecord.id);
            setBlocks(data);
        } catch (error) {
            console.error('Error fetching enriched blocks:', error);
        }
        setIsLoading(false);
    };

    // Scroll Tracking & Spy
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const [scrollMetrics, setScrollMetrics] = useState({ scrollTop: 0, scrollHeight: 0, clientHeight: 0 });

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
            setScrollMetrics({ scrollTop, scrollHeight, clientHeight });

            // Scroll Spy: Determine active block based on scroll position
            // We consider the "active" block to be the one occupying the top third of the screen
            const spyLine = scrollTop + (clientHeight * 0.3);

            let newActiveId = activeBlockId;

            for (const block of blocks) {
                const el = document.getElementById(`block-${block.id}`);
                if (el) {
                    const { offsetTop, offsetHeight } = el;
                    // Block starts before the line and ends after it
                    if (offsetTop <= spyLine && (offsetTop + offsetHeight) > spyLine) {
                        newActiveId = String(block.id);
                        break;
                    }
                }
            }

            if (newActiveId && newActiveId !== activeBlockId) {
                setActiveBlockId(String(newActiveId));
            }
        }
    };

    const handleNavigatorScroll = (percentage: number) => {
        if (scrollContainerRef.current) {
            const { scrollHeight, clientHeight } = scrollContainerRef.current;
            const maxScroll = scrollHeight - clientHeight;
            scrollContainerRef.current.scrollTop = maxScroll * percentage;
        }
    };

    // Update metrics when blocks change or resize
    useEffect(() => {
        handleScroll();
        window.addEventListener('resize', handleScroll);
        return () => window.removeEventListener('resize', handleScroll);
    }, [blocks, isLoading]);

    return (
        <div className="flex h-screen overflow-hidden bg-muted/30">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
                {/* Header */}
                <header className="h-14 border-b border-border bg-card flex items-center px-6 justify-between shrink-0 z-20 shadow-sm">
                    <div className="flex items-center gap-4">
                        <Link href={`/documents/${docRecord.id}`} className="flex items-center gap-2 group text-muted-foreground hover:text-primary transition-all">
                            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-xs font-bold uppercase tracking-wider">Editor</span>
                        </Link>
                        <div className="h-4 w-[1px] bg-border mx-2" />
                        <div className="flex flex-col">
                            <h1 className="font-bold text-sm text-foreground leading-tight tracking-tight">
                                {docRecord.title}
                            </h1>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <Eye className="w-3 h-3 text-primary" />
                                <span className="text-[10px] text-primary/80 uppercase font-extrabold tracking-widest">Vista Integral de Lectura</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1 bg-background border border-border rounded-full shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">{blocks.length} Bloques de Datos</span>
                        </div>
                    </div>
                </header>

                {/* Content Area with Navigator */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Navigator Panel */}
                    <DocumentNavigator
                        blocks={blocks}
                        activeBlockId={activeBlockId}
                        onBlockClick={handleBlockClick}
                        showMapping={showMapping}
                        showNotes={showNotes}
                        showTags={showTags}
                        showSubBlocks={showSubBlocks}
                        showSupport={showSupport}
                        showVersions={showVersions}
                        scrollMetrics={scrollMetrics}
                        onNavigatorScroll={handleNavigatorScroll}
                    />

                    {/* Scrollable Document Content */}
                    <div
                        ref={scrollContainerRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 scrollbar-thin scrollbar-thumb-primary/10"
                    >
                        <div className="max-w-4xl mx-auto min-h-full bg-card shadow-xl border border-border/40 rounded-3xl p-8 md:p-16 lg:p-20 relative transition-all duration-700 animate-in fade-in slide-in-from-bottom-4">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-96 gap-4">
                                    <Loader2 className="w-10 h-10 text-primary animate-spin opacity-50" />
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Compaginando documento...</p>
                                </div>
                            ) : blocks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-96 gap-4 text-center">
                                    <FileText className="w-16 h-16 text-muted-foreground/20" />
                                    <p className="text-sm font-medium text-muted-foreground">Documento sin bloques de contenido.</p>
                                    <Link href={`/documents/${docRecord.id}`} className="text-xs font-bold text-primary hover:underline">Ir al editor para añadir contenido</Link>
                                </div>
                            ) : (
                                <div className="space-y-4 font-serif">
                                    {blocks.map((block, index) => (
                                        <ViewerBlock
                                            key={block.id}
                                            block={block}
                                            index={index}
                                            showMapping={showMapping}
                                            showNotes={showNotes}
                                            showTags={showTags}
                                            showSubBlocks={showSubBlocks}
                                            showSupport={showSupport}
                                            showVersions={showVersions}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Final Signature / End of Document */}
                            {!isLoading && blocks.length > 0 && (
                                <div className="mt-20 pt-8 border-t border-border/20 flex flex-col items-center gap-4 opacity-30 select-none">
                                    <Layers className="w-6 h-6 text-muted-foreground" />
                                    <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Fin del Documento Integral</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Layer Control Panel (Floating) */}
                <LayerControlPanel
                    showMapping={showMapping} setShowMapping={setShowMapping}
                    showNotes={showNotes} setShowNotes={setShowNotes}
                    showTags={showTags} setShowTags={setShowTags}
                    showSubBlocks={showSubBlocks} setShowSubBlocks={setShowSubBlocks}
                    showSupport={showSupport} setShowSupport={setShowSupport}
                    showVersions={showVersions} setShowVersions={setShowVersions}
                />
            </div>
        </div>
    );
}
