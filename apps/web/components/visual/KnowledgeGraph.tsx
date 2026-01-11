'use client';

import dynamic from 'next/dynamic';
import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { GraphData, GraphNode as AdapterNode, GraphLink as AdapterLink } from '@/lib/visual/graph-adapter';
import { Maximize2, Minimize2, ZoomIn, ZoomOut, X, Wand2 } from 'lucide-react';
import SpriteText from 'three-spritetext';
import * as THREE from 'three';

// Dynamically import ForceGraph3D with no SSR
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full text-xs text-muted-foreground animate-pulse">Iniciando Motor 3D...</div>
});

interface KnowledgeGraphProps {
    data: GraphData;
    width?: number;
    height?: number;
    onNodeClick?: (node: AdapterNode) => void;
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

    const isDark = true; // Forcing dark for the "Space" look consistent with 3.0
    const bgColor = '#050505';

    const [fogNear, setFogNear] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('graph-settings-v2');
                if (saved) return JSON.parse(saved).fogNear || 20;
            } catch (e) { }
        }
        return 20;
    });

    const [fogFar, setFogFar] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('graph-settings-v2');
                if (saved) return JSON.parse(saved).fogFar || 250;
            } catch (e) { }
        }
        return 250;
    });

    const [nodeScale, setNodeScale] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('graph-settings-v2');
                if (saved) return JSON.parse(saved).nodeScale || 1.0;
            } catch (e) { }
        }
        return 1.0;
    });

    const [nodeDistortion, setNodeDistortion] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('graph-settings-v2');
                if (saved) return JSON.parse(saved).nodeDistortion || 1.2;
            } catch (e) { }
        }
        return 1.2;
    });

    const [showControls, setShowControls] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('graph-settings-v2');
                if (saved) return JSON.parse(saved).showControls ?? false;
            } catch (e) { }
        }
        return false;
    });

    // Persistence: load effect for hydration sync
    useEffect(() => {
        try {
            const savedSettings = localStorage.getItem('graph-settings-v2');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                if (parsed.fogNear) setFogNear(parsed.fogNear);
                if (parsed.fogFar) setFogFar(parsed.fogFar);
                if (parsed.showControls !== undefined) setShowControls(parsed.showControls);
            }
        } catch (e) { }
    }, []);

    const saveSettings = (newNear: number, newFar: number, newShowControls: boolean, ns: number, nd: number) => {
        try {
            const settings = {
                fogNear: newNear,
                fogFar: newFar,
                showControls: newShowControls,
                nodeScale: ns,
                nodeDistortion: nd
            };
            localStorage.setItem('graph-settings-v2', JSON.stringify(settings));
        } catch (e) { }
    };

    // Persist settings wrappers
    const updateFogNear = (val: number) => {
        setFogNear(val);
        saveSettings(val, fogFar, showControls, nodeScale, nodeDistortion);
    };

    const updateFogFar = (val: number) => {
        setFogFar(val);
        saveSettings(fogNear, val, showControls, nodeScale, nodeDistortion);
    };

    const updateNodeScale = (val: number) => {
        setNodeScale(val);
        saveSettings(fogNear, fogFar, showControls, val, nodeDistortion);
    };

    const updateNodeDistortion = (val: number) => {
        setNodeDistortion(val);
        saveSettings(fogNear, fogFar, showControls, nodeScale, val);
    };

    const toggleControls = () => {
        const newVal = !showControls;
        setShowControls(newVal);
        saveSettings(fogNear, fogFar, newVal, nodeScale, nodeDistortion);
    };

    // Apply fog to the scene whenever state changes
    useEffect(() => {
        if (fgRef.current) {
            const scene = fgRef.current.scene();
            if (scene) {
                scene.fog = new THREE.Fog('#050505', fogNear, fogFar);
            }
        }
    }, [fogNear, fogFar]);

    // Custom node rendering for 3D with hierarchy awareness
    const nodeThreeObject = useCallback((node: any) => {
        const obj = new THREE.Group();

        // Sphere size based on hierarchy level with scale and distortion
        let radius: number;
        if (node.type === 'current') {
            radius = 6 * nodeScale;
        } else if (node.type === 'tag') {
            radius = 2.5 * nodeScale;
        } else if (node.hierarchyLevel !== undefined) {
            // Formula: base * scale * distortion^(2-level)
            radius = (1.5 * nodeScale) * Math.pow(nodeDistortion, (2 - node.hierarchyLevel));
        } else {
            radius = 3.5 * nodeScale;
        }

        const geometry = new THREE.SphereGeometry(radius);
        const material = new THREE.MeshPhongMaterial({
            color: node.color || '#f59e0b',
            transparent: true,
            opacity: 0.9,
            emissive: node.color || '#f59e0b',
            emissiveIntensity: 0.7
        });
        const sphere = new THREE.Mesh(geometry, material);
        obj.add(sphere);

        // Holographic Label Panel (Mini)
        const sprite = new SpriteText(node.label);
        sprite.color = '#ffffff';
        sprite.textHeight = node.hierarchyLevel === 0 ? 2 : node.hierarchyLevel === 1 ? 1.5 : 1.2;
        sprite.fontWeight = '600';
        sprite.padding = 2;
        sprite.backgroundColor = node.hierarchyLevel === 2 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(212, 174, 123, 0.1)';
        sprite.borderColor = node.hierarchyLevel === 2 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(212, 174, 123, 0.3)';
        sprite.borderWidth = 0.4;
        sprite.borderRadius = 0.4;
        (sprite as any).position.y = -(radius + 5);
        obj.add(sprite);

        return obj;
    }, [nodeScale, nodeDistortion]);

    const handleNodeClick = useCallback((node: any) => {
        if (onNodeClick) onNodeClick(node as AdapterNode);

        // Internal camera movement
        if (fgRef.current) {
            const distance = 100; // Increased distance for better framing
            const distRatio = 1 + distance / Math.hypot(node.x || 1, node.y || 1, node.z || 1);
            fgRef.current.cameraPosition(
                { x: (node.x || 0) * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio },
                node,
                1500
            );
        }
    }, [onNodeClick]);

    return (
        <div ref={containerRef} className="relative w-full h-full overflow-hidden group" style={{
            background: 'radial-gradient(circle at 50% 50%, #151515 0%, #050505 100%)'
        }}>
            <ForceGraph3D
                ref={fgRef}
                width={dimensions.w}
                height={dimensions.h}
                graphData={data}
                backgroundColor="rgba(0,0,0,0)"
                nodeThreeObject={nodeThreeObject}
                nodeThreeObjectExtend={false}
                linkColor={() => 'rgba(255,255,255,0.15)'}
                linkWidth={0.5}
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={0.005}
                onNodeClick={handleNodeClick}
                enableNodeDrag={false}
                showNavInfo={false}
                onEngineStop={() => {
                    if (fgRef.current) {
                        const scene = fgRef.current.scene();
                        scene.fog = new THREE.Fog('#050505', fogNear, fogFar);
                    }
                }}
            />

            {/* Atmosphere Controls for Sidebar */}
            <div className="absolute top-2 right-2 z-30 flex flex-col items-end gap-1">
                <button
                    onClick={() => setShowControls(!showControls)}
                    className="p-1 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-white/60 transition-all backdrop-blur-md"
                >
                    <Wand2 className="w-3 h-3" />
                </button>

                {showControls && (
                    <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-3 rounded-xl w-48 flex flex-col gap-2 shadow-2xl animate-in fade-in slide-in-from-right-2 duration-200">
                        <div className="flex items-center justify-between">
                            <h5 className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Atenuación</h5>
                            <button onClick={() => setShowControls(false)} className="text-white/20 hover:text-white">
                                <X className="w-2 h-2" />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <div className="space-y-0.5">
                                <div className="flex justify-between text-[7px] text-white/60">
                                    <span>Inicio</span>
                                    <span>{fogNear}m</span>
                                </div>
                                <input
                                    type="range" min="0" max="150" step="5"
                                    value={fogNear}
                                    onChange={(e) => updateFogNear(parseInt(e.target.value))}
                                    className="w-full h-0.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>

                            <div className="space-y-0.5">
                                <div className="flex justify-between text-[7px] text-white/60">
                                    <span>Fin</span>
                                    <span>{fogFar}m</span>
                                </div>
                                <input
                                    type="range" min="50" max="1000" step="20"
                                    value={fogFar}
                                    onChange={(e) => updateFogFar(parseInt(e.target.value))}
                                    className="w-full h-0.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>

                            <div className="space-y-0.5">
                                <div className="flex justify-between text-[7px] text-white/60">
                                    <span>Escala</span>
                                    <span>{Math.round(nodeScale * 100)}%</span>
                                </div>
                                <input
                                    type="range" min="0.2" max="3" step="0.1"
                                    value={nodeScale}
                                    onChange={(e) => updateNodeScale(parseFloat(e.target.value))}
                                    className="w-full h-0.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>

                            <div className="space-y-0.5">
                                <div className="flex justify-between text-[7px] text-white/60">
                                    <span>Jerarquía</span>
                                    <span>{nodeDistortion.toFixed(1)}x</span>
                                </div>
                                <input
                                    type="range" min="0.5" max="4" step="0.1"
                                    value={nodeDistortion}
                                    onChange={(e) => updateNodeDistortion(parseFloat(e.target.value))}
                                    className="w-full h-0.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Micro Overlay */}
            <div className="absolute top-3 left-3 pointer-events-none z-10 flex flex-col gap-0.5">
                <span className="text-[8px] font-black text-primary uppercase tracking-[0.3em]">Red Lógica</span>
                <span className="text-[10px] font-bold text-white/50">3D Viewport</span>
                {/* DEBUG OVERLAY */}
                <div className="bg-red-900/50 text-white p-1 text-[8px] mt-2 border border-red-500/50 rounded">
                    DEBUG: FogNear={fogNear}, LS={typeof window !== 'undefined' ? localStorage.getItem('graph-fog-near') : 'N/A'}<br />
                    Nodes={data.nodes.length}, Links={data.links.length}<br />
                    Level 3 Nodes: {data.nodes.filter(n => n.hierarchyLevel === 2).length}
                </div>
            </div>

            <div className="absolute bottom-2 right-2 flex flex-col gap-1 opacity-100 transition-opacity z-20">
                {onToggleFullscreen && (
                    <button
                        onClick={onToggleFullscreen}
                        className="p-1.5 bg-white/10 backdrop-blur border border-white/10 rounded-md text-white/60 hover:bg-white/20"
                    >
                        {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                    </button>
                )}
            </div>
        </div>
    );
}
