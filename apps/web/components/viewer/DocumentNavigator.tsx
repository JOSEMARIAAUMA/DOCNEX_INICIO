'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Layers } from 'lucide-react';

interface DocumentNavigatorProps {
    blocks: any[];
    activeBlockId?: string;
    onBlockClick: (blockId: string) => void;
    showMapping: boolean;
    showNotes: boolean;
    showTags: boolean;
    showSubBlocks: boolean;
    showSupport: boolean;
    showVersions: boolean;
    scrollMetrics?: { scrollTop: number; scrollHeight: number; clientHeight: number };
    onNavigatorScroll?: (percentage: number) => void;
}

export function DocumentNavigator({
    blocks,
    activeBlockId,
    onBlockClick,
    showMapping,
    showNotes,
    showTags,
    showSubBlocks,
    showSupport,
    showVersions,
    scrollMetrics,
    onNavigatorScroll
}: DocumentNavigatorProps) {
    const [width, setWidth] = useState(240);
    const [isResizing, setIsResizing] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const lensRef = useRef<HTMLDivElement>(null);

    // Drag State
    const [isDraggingLens, setIsDraggingLens] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [localDragTop, setLocalDragTop] = useState<number | null>(null);

    // Keep metrics fresh for event handlers
    const scrollMetricsRef = useRef(scrollMetrics);
    useEffect(() => { scrollMetricsRef.current = scrollMetrics; }, [scrollMetrics]);

    // Filter blocks
    const visibleBlocks = showSubBlocks ? blocks : blocks.filter(b => !b.parent_block_id);

    // Persistence
    useEffect(() => {
        const savedWidth = localStorage.getItem('navigator_width');
        if (savedWidth) setWidth(Number(savedWidth));
    }, []);

    useEffect(() => {
        localStorage.setItem('navigator_width', width.toString());
    }, [width]);

    // --- Lens Calculation ---
    const getLensMetrics = () => {
        if (!scrollMetrics || !listRef.current) return { top: 0, height: 0, display: 'none' };

        const { scrollTop, scrollHeight, clientHeight } = scrollMetrics;
        const navHeight = listRef.current.scrollHeight;

        // Calculate Proportions
        // Use a small buffer to avoid division by zero
        const scrollableDistance = Math.max(1, scrollHeight - clientHeight);
        const percentage = scrollTop / scrollableDistance;

        // visibleRatio is how much of the content is visible in the viewport
        const visibleRatio = clientHeight / scrollHeight;

        // Lens Physical Dimensions
        // Use a minimum height to ensure it's always grabable
        // We also want to cap it to the navigator height
        const lensHeight = Math.max(30, Math.min(navHeight, navHeight * visibleRatio));

        // The track logic: The lens travels from Top=0 to Top=(NavHeight - LensHeight)
        const maxLensTop = Math.max(0, navHeight - lensHeight);
        const lensTop = percentage * maxLensTop;

        return { top: lensTop, height: lensHeight, display: 'block' };
    };

    const lensMetrics = getLensMetrics();

    // Auto-scroll navigator to keep lens in view
    useEffect(() => {
        if (listRef.current && !isDraggingLens) {
            const { top, height } = lensMetrics;
            const container = listRef.current;
            const scrollPos = container.scrollTop;
            const containerHeight = container.clientHeight;

            // If lens is above or below visible area, scroll to it
            if (top < scrollPos) {
                container.scrollTo({ top: top - 20, behavior: 'smooth' });
            } else if (top + height > scrollPos + containerHeight) {
                container.scrollTo({ top: top + height - containerHeight + 20, behavior: 'smooth' });
            }
        }
    }, [lensMetrics.top, lensMetrics.height, isDraggingLens]);

    // Use Local State for "Instant" feedback during drag, otherwise use computed prop-based position
    const displayTop = isDraggingLens && localDragTop !== null ? localDragTop : lensMetrics.top;


    // --- Interaction Handlers ---

    // 1. Click on Track (Jump)
    const handleTrackClick = (e: React.MouseEvent) => {
        // Ignore clicks on the lens itself (it handles its own drag)
        if (e.target === lensRef.current || lensRef.current?.contains(e.target as Node)) {
            return;
        }

        if (!listRef.current || !onNavigatorScroll) return;

        const rect = listRef.current.getBoundingClientRect();
        // Mouse Y relative to the SCROLLED CONTENT
        const clickY = e.clientY - rect.top + listRef.current.scrollTop;
        const navHeight = listRef.current.scrollHeight;

        // Calculate where the center of the lens should be
        const lensHeight = lensMetrics.height;
        let targetTop = clickY - (lensHeight / 2);

        // Clamp
        const maxTop = navHeight - lensHeight;
        targetTop = Math.max(0, Math.min(maxTop, targetTop));

        // Convert to percentage
        const percentage = targetTop / maxTop;
        onNavigatorScroll(percentage);
    };

    // 2. Drag Logic (Instant)
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDraggingLens || !listRef.current || !onNavigatorScroll || !scrollMetricsRef.current) return;
            e.preventDefault();

            const navRect = listRef.current.getBoundingClientRect();
            const navScrollTop = listRef.current.scrollTop;
            const navHeight = listRef.current.scrollHeight;

            const { clientHeight, scrollHeight } = scrollMetricsRef.current;
            const visibleRatio = Math.min(1, clientHeight / scrollHeight);
            const lensHeight = Math.max(40, navHeight * visibleRatio);
            const trackHeight = navHeight - lensHeight; // Max travel distance

            if (trackHeight <= 0) return;

            // Mouse Y relative to scrollable area
            const mouseRelativeY = e.clientY - navRect.top + navScrollTop;

            // New Top = Mouse - Offset
            let newTop = mouseRelativeY - dragOffset;

            // Clamp
            newTop = Math.max(0, Math.min(trackHeight, newTop));

            // INSTANTLY Update Visuals (Local State)
            setLocalDragTop(newTop);

            // Update Document (Percentage)
            const percentage = newTop / trackHeight;
            onNavigatorScroll(percentage);
        };

        const handleMouseUp = () => {
            // Reset drag state
            setIsDraggingLens(false);
            setLocalDragTop(null); // Return to prop-driven source of truth
            document.body.style.cursor = 'default';
        };

        if (isDraggingLens) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none'; // CRITICAL: Stop text selection
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        };
    }, [isDraggingLens, onNavigatorScroll, dragOffset]);


    // Resizing Sidebar Logic
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = e.clientX;
            if (newWidth > 100 && newWidth < 600) setWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.cursor = 'default';
        };

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
        };
    }, [isResizing]);

    return (
        <div
            ref={sidebarRef}
            className="border-r border-border bg-card/50 backdrop-blur-sm flex flex-col shrink-0 h-full relative group/sidebar select-none"
            style={{ width: `${width}px`, transition: isResizing ? 'none' : 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
            {/* Header */}
            <div className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0 bg-muted/20">
                <div className="flex items-center gap-2 overflow-hidden">
                    <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
                    {width > 120 && <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">Navegador</span>}
                </div>
            </div>

            {/* Minimap List Container with Track Click */}
            <div
                ref={listRef}
                onClick={handleTrackClick} // Global Click Handler for Jump
                className="flex-1 overflow-y-auto overflow-x-hidden px-3 space-y-3 scrollbar-none relative"
                style={{ scrollBehavior: 'smooth' }}
            >
                {/* Proportional Header Spacer to match Document Padding */}
                <div className="h-16 w-full italic text-[10px] text-muted-foreground/30 flex items-center justify-center border-b border-border/5 mb-4">
                    Comienzo del Documento
                </div>

                {/* Lens Overlay */}
                {scrollMetrics && scrollMetrics.scrollHeight > scrollMetrics.clientHeight && (
                    <div
                        ref={lensRef}
                        className="absolute left-0 right-0 z-30 bg-primary/[0.03] border-y-2 border-primary/40 backdrop-blur-[1px] cursor-grab active:cursor-grabbing rounded-lg shadow-[0_0_30px_rgba(var(--primary),0.05)] transition-all duration-200 hover:bg-primary/[0.08] group/lens"
                        style={{
                            top: displayTop,
                            height: lensMetrics.height,
                            display: lensMetrics.display
                        }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            setDragOffset(e.clientY - rect.top);
                            setIsDraggingLens(true);
                        }}
                    >
                        {/* Lens Corner Accents */}
                        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary/60 rounded-tl-sm" />
                        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary/60 rounded-tr-sm" />
                        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-primary/60 rounded-bl-sm" />
                        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary/60 rounded-br-sm" />

                        {/* Center Handle */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-1 opacity-20 group-hover/lens:opacity-50 transition-opacity">
                            <div className="w-1 h-1 rounded-full bg-primary" />
                            <div className="w-1 h-1 rounded-full bg-primary" />
                            <div className="w-1 h-1 rounded-full bg-primary" />
                        </div>
                    </div>
                )}

                {visibleBlocks.map((block, index) => {
                    const isSubBlock = !!block.parent_block_id;
                    const isActive = activeBlockId === block.id;

                    // Theme Colors
                    const textColor = isSubBlock ? 'text-fuchsia-600 dark:text-fuchsia-400' : 'text-sky-600 dark:text-sky-400';
                    const bgColor = isSubBlock ? 'bg-fuchsia-500/5' : 'bg-sky-500/5';
                    const borderColor = isSubBlock ? 'border-fuchsia-500' : 'border-sky-500';
                    const hoverColor = isSubBlock ? 'hover:bg-fuchsia-500/10' : 'hover:bg-sky-500/10';

                    const activeClasses = isActive
                        ? `${bgColor} ${borderColor}/50 shadow-md`
                        : `${bgColor} border-transparent ${hoverColor}`;

                    return (
                        <div
                            key={block.id}
                            // We allow click bubbling to handleTrackClick for navigation
                            // But we ALSO want to set the active block if desired? 
                            // Actually user says "Click on browser changes view". 
                            // If I click a block, I probably want to jump THERE. 
                            // handleTrackClick does exactly that based on Y position.
                            // So we don't need a specific handler here unless we want to "Snap".
                            // Let's rely on handleTrackClick for the smooth "Map" feel.
                            className={`
                                group w-full relative cursor-pointer transition-all duration-300 rounded-xl border-2
                                ${isSubBlock ? 'ml-4 w-[calc(100%-16px)]' : ''}
                                ${activeClasses}
                                p-0 overflow-hidden
                            `}
                        >
                            <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 pointer-events-none">
                                <div className={`w-1.5 h-1.5 rounded-full ${isSubBlock ? 'bg-fuchsia-500' : 'bg-sky-500'} opacity-70`} />
                                <span className={`text-[9px] font-black uppercase tracking-wider opacity-60 ${textColor}`}>
                                    {isSubBlock ? 'SUB' : 'BLOCK'} {index + 1}
                                </span>
                            </div>

                            {block.title && block.title !== 'Untitled' && (
                                <div className="absolute top-2 right-2 z-10 max-w-[60%] pointer-events-none">
                                    <span className={`text-[8px] font-bold truncate block bg-background/90 backdrop-blur-md px-2 py-0.5 rounded-full border border-border/20 shadow-sm ${textColor}`}>
                                        {block.title}
                                    </span>
                                </div>
                            )}

                            <div className="relative w-full overflow-hidden select-none bg-background/30 rounded-md border border-border/5 group-hover:border-primary/20 transition-colors">
                                <div
                                    className="origin-top-left w-[1000px] prose dark:prose-invert prose-sm/relaxed p-8"
                                    style={{
                                        zoom: Math.max(0.1, (width - 24) / 1000),
                                        pointerEvents: 'none'
                                    }}
                                >
                                    <div dangerouslySetInnerHTML={{ __html: block.content }} />
                                </div>
                            </div>

                            {isActive && (
                                <div className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full ${isSubBlock ? 'bg-fuchsia-500' : 'bg-sky-500'}`} />
                            )}

                            <div className="flex items-center gap-1 mt-1 justify-end opacity-80">
                                {showNotes && (block.notes_count > 0 || (block.comments && block.comments.length > 0)) && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm" title="Notas" />}
                                {showTags && block.tags && block.tags.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm" title="Etiquetas" />}
                                {showSupport && block.block_resource_links && block.block_resource_links.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-sm" title="Recursos" />}
                                {showVersions && block.block_versions && block.block_versions.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-sm" title="Versiones" />}
                            </div>
                        </div>
                    );
                })}

                {/* Proportional Footer Spacer */}
                <div className="h-32 w-full italic text-[10px] text-muted-foreground/30 flex items-center justify-center border-t border-border/5 mt-8">
                    Fin del Documento
                </div>
            </div>

            {/* Drag Handle */}
            <div
                className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-50"
                onMouseDown={() => setIsResizing(true)}
            />
        </div>
    );
}
