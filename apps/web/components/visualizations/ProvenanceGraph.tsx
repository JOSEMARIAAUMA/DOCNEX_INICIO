'use client';

import React, { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { ArrowRight, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';

// Dynamic import for no SSR
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full text-xs text-muted-foreground animate-pulse">Cargando Grafo...</div>
});

interface GraphNode {
    id: string;
    name: string;
    type: 'document' | 'block' | 'synthesis' | 'merge';
    group: 'document' | 'block';
    docTitle?: string;
    x?: number;
    y?: number;
}

interface GraphLink {
    source: string | GraphNode;
    target: string | GraphNode;
    type?: string;
    value?: number;
}

interface ProvenanceGraphProps {
    data: {
        nodes: GraphNode[];
        links: GraphLink[];
    };
    width?: number;
    height?: number;
    onNodeClick?: (node: GraphNode) => void;
}

export default function ProvenanceGraph({
    data,
    width = 300,
    height = 300,
    onNodeClick
}: ProvenanceGraphProps) {
    const fgRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { theme } = useTheme();
    const [dimensions, setDimensions] = useState({ w: width, h: height });

    useEffect(() => {
        if (containerRef.current) {
            const resizeObserver = new ResizeObserver((entries) => {
                for (let entry of entries) {
                    setDimensions({ w: entry.contentRect.width, h: entry.contentRect.height });
                }
            });
            resizeObserver.observe(containerRef.current);
            return () => resizeObserver.disconnect();
        }
    }, []);

    const getNodeColor = (node: GraphNode) => {
        switch (node.group) {
            case 'document': return '#3b82f6'; // Blue
            case 'block':
                if (node.type === 'synthesis') return '#a855f7'; // Purple
                if (node.type === 'merge') return '#22c55e'; // Green
                return '#f59e0b'; // Amber
            default: return '#9ca3af';
        }
    };

    const getNodeSize = (node: GraphNode) => {
        return node.group === 'document' ? 8 : 5;
    };

    return (
        <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-muted/10 rounded-lg flex items-center justify-center">
            {data.nodes.length === 0 ? (
                <div className="text-center text-muted-foreground text-xs p-4">
                    Sin datos de procedencia disponibles para visualizar.
                </div>
            ) : (
                <ForceGraph2D
                    ref={fgRef}
                    width={dimensions.w}
                    height={dimensions.h}
                    graphData={data}
                    nodeLabel="name"
                    nodeColor={getNodeColor as any}
                    nodeRelSize={1}
                    nodeVal={getNodeSize as any}
                    linkColor={() => theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
                    linkDirectionalArrowLength={3.5}
                    linkDirectionalArrowRelPos={1}
                    linkCurvature={0.25}
                    onNodeClick={(node) => onNodeClick?.(node as GraphNode)}
                    backgroundColor={theme === 'dark' ? '#09090b' : '#ffffff'}
                    d3VelocityDecay={0.3}
                    cooldownTicks={100}
                />
            )}

            <div className="absolute bottom-2 left-2 flex flex-col gap-1 pointer-events-none">
                <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur border border-border px-2 py-1 rounded text-[10px]">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span className="text-muted-foreground">Documento</span>
                </div>
                <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur border border-border px-2 py-1 rounded text-[10px]">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span className="text-muted-foreground">Bloque</span>
                </div>
                <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur border border-border px-2 py-1 rounded text-[10px]">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    <span className="text-muted-foreground">Síntesis AI</span>
                </div>
            </div>

            <div className="absolute top-2 right-2 flex gap-1">
                <button
                    onClick={() => fgRef.current?.zoomToFit(400)}
                    className="p-1.5 bg-background/80 backdrop-blur border border-border rounded hover:bg-accent transition-colors text-muted-foreground"
                    title="Ajustar vista"
                >
                    <Maximize2 className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}
