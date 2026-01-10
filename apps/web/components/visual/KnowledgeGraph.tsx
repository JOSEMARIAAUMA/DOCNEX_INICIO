'use client';

import dynamic from 'next/dynamic';
import { useCallback, useRef, useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { GraphData, GraphNode, GraphLink } from '@/lib/visual/graph-adapter';
import { Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';

// Dynamically import ForceGraph2D with no SSR
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full text-xs text-muted-foreground animate-pulse">Cargando Grafo...</div>
});

interface KnowledgeGraphProps {
    data: GraphData;
    width?: number;
    height?: number;
    onNodeClick?: (node: GraphNode) => void;
    isFullscreen?: boolean;
    onToggleFullscreen?: () => void;
}

export default function KnowledgeGraph({
    data,
    width = 300,
    height = 300,
    onNodeClick,
    isFullscreen,
    onToggleFullscreen
}: KnowledgeGraphProps) {
    const { theme } = useTheme();
    const fgRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ w: width, h: height });

    // Handle resize observer for responsive container if no fixed width provided or in fullscreen
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width: boxWidth, height: boxHeight } = entry.contentRect;
                setDimensions({ w: boxWidth, h: boxHeight });
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // Zoom to fit when data changes
    useEffect(() => {
        if (fgRef.current && data.nodes.length > 0) {
            // Include delay to allow layout to stabilize
            setTimeout(() => {
                fgRef.current.zoomToFit(400, 20);
            }, 500);
        }
    }, [data]);

    const handleZoomIn = () => {
        if (fgRef.current) {
            fgRef.current.zoom(fgRef.current.zoom() * 1.2, 400);
        }
    };

    const handleZoomOut = () => {
        if (fgRef.current) {
            fgRef.current.zoom(fgRef.current.zoom() / 1.2, 400);
        }
    };

    const isDark = theme === 'dark';
    const bgColor = isDark ? '#09090b' : '#ffffff'; // Match zinc-950 or white
    const txtColor = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)';

    return (
        <div ref={containerRef} className="relative w-full h-full overflow-hidden rounded-lg bg-card border border-border group">
            <ForceGraph2D
                ref={fgRef}
                width={dimensions.w}
                height={dimensions.h}
                graphData={data}
                backgroundColor={bgColor}
                nodeLabel="label"
                nodeRelSize={6}
                linkWidth={link => (link as GraphLink).width || 1}
                linkDirectionalParticles={link => (link as GraphLink).type === 'manual' ? 2 : 0}
                linkDirectionalParticleSpeed={0.005}
                linkLineDash={link => (link as GraphLink).dashed ? [2, 2] : null}
                onNodeClick={(node) => onNodeClick && onNodeClick(node as GraphNode)}

                // Custom Node Paint
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                    const label = node.label;
                    const fontSize = 12 / globalScale;
                    const r = node.val || 5;

                    // Draw Node Circle
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
                    ctx.fillStyle = node.color || (isDark ? '#e4e4e7' : '#27272a');
                    ctx.fill();

                    // Draw Label
                    if (globalScale > 1.5 || node.type === 'current') {
                        ctx.font = `${fontSize}px Sans-Serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = txtColor;
                        ctx.fillText(label, node.x, node.y + r + fontSize);
                    }

                    // Highlight ring for current
                    if (node.type === 'current') {
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, r + 2, 0, 2 * Math.PI, false);
                        ctx.strokeStyle = node.color;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }}
            />

            {/* Controls Overlay */}
            <div className="absolute bottom-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onToggleFullscreen && (
                    <button
                        onClick={onToggleFullscreen}
                        className="p-1.5 bg-background/80 backdrop-blur border border-border rounded-md shadow flex items-center justify-center hover:bg-muted"
                        title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                    >
                        {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                    </button>
                )}
                <button
                    onClick={handleZoomIn}
                    className="p-1.5 bg-background/80 backdrop-blur border border-border rounded-md shadow flex items-center justify-center hover:bg-muted"
                >
                    <ZoomIn className="w-3 h-3" />
                </button>
                <button
                    onClick={handleZoomOut}
                    className="p-1.5 bg-background/80 backdrop-blur border border-border rounded-md shadow flex items-center justify-center hover:bg-muted"
                >
                    <ZoomOut className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}
