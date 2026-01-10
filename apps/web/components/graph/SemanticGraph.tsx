'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import SpriteText from 'three-spritetext';
import * as THREE from 'three';
import { DocumentBlock, Resource } from '@docnex/shared';
import { Wand2, X } from 'lucide-react';

// Safe Dynamic Import
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full text-[#d4ae7b] animate-pulse">Desplegando Motor Cognitivo...</div>
});

interface GraphNode {
    id: string;
    name: string;
    type: 'block' | 'resource' | 'sub-block' | 'user-note' | 'ai-note';
    val: number;
    color: string;
    parentId?: string | null;
    description?: string;
}

interface GraphLink {
    source: string;
    target: string;
    type?: string;
    color?: string;
}

interface SemanticGraphProps {
    blocks: DocumentBlock[];
    resources: Resource[];
    semanticLinks: any[];
    notes?: any[]; // For future user/ai notes
    onNodeClick: (nodeId: string) => void;
    width?: number;
    height?: number;
}

export default function SemanticGraph({
    blocks,
    resources,
    semanticLinks,
    notes = [],
    onNodeClick,
    width,
    height
}: SemanticGraphProps) {
    const graphRef = useRef<any>(null);
    const [fogNear, setFogNear] = useState(50);
    const [fogFar, setFogFar] = useState(2000);
    const [fogIntensity, setFogIntensity] = useState(0.4);
    const [showControls, setShowControls] = useState(false);

    // Persistence: Load settings
    useEffect(() => {
        const saved = localStorage.getItem('graph-atmosphere-v2');
        if (saved) {
            try {
                const { near, far, intensity } = JSON.parse(saved);
                setFogNear(near);
                setFogFar(far);
                setFogIntensity(intensity);
            } catch (e) {
                console.error('Failed to load graph settings', e);
            }
        }
    }, []);

    // Persistence: Save settings
    useEffect(() => {
        localStorage.setItem('graph-atmosphere-v2', JSON.stringify({
            near: fogNear,
            far: fogFar,
            intensity: fogIntensity
        }));
    }, [fogNear, fogFar, fogIntensity]);

    // Apply fog and lights to the scene
    useEffect(() => {
        if (graphRef.current) {
            const scene = graphRef.current.scene();
            if (scene) {
                // Fog Logic - Density remapping for better linear feel
                // intensity: 0 -> clear (far: 100000)
                // intensity: 1 -> dense (far: 100)
                const densityMultiplier = Math.pow(fogIntensity, 2); // Logarithmic-like feel
                const adjustedFar = fogIntensity === 0 ? 100000 : Math.max(100, fogFar * (1 - densityMultiplier));
                scene.fog = new THREE.Fog('#050505', fogNear, adjustedFar);

                // Add lights if they don't exist
                if (!scene.getObjectByName('main-light')) {
                    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // More ambient light
                    scene.add(ambientLight);

                    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
                    mainLight.name = 'main-light';
                    mainLight.position.set(300, 300, 300); // Further away for softer shadows
                    scene.add(mainLight);

                    const secondaryLight = new THREE.PointLight(0xd4ae7b, 1, 1000);
                    secondaryLight.position.set(-200, 100, -100);
                    scene.add(secondaryLight);
                }
            }
        }
    }, [fogNear, fogFar, fogIntensity]);

    const data = useMemo(() => {
        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];

        // Blocks & Sub-blocks
        blocks.forEach((block, idx) => {
            const isSubBlock = !!block.parent_block_id;
            nodes.push({
                id: block.id,
                name: block.title || `Bloque ${idx + 1}`,
                type: isSubBlock ? 'sub-block' : 'block',
                val: isSubBlock ? 4 : 8,
                color: isSubBlock ? '#7dd3fc' : '#d4ae7b', // Crystal Cyan for sub-blocks, Ochre for main
                parentId: block.parent_block_id,
                description: block.content ? block.content.substring(0, 100) + '...' : ''
            });

            // If it has a parent, create a structural hierarchy link
            if (isSubBlock) {
                links.push({
                    source: block.parent_block_id!,
                    target: block.id,
                    type: 'hierarchy',
                    color: 'rgba(212, 174, 123, 0.4)' // Stronger structural connection
                });
            }
        });

        // Resources
        resources.forEach(res => {
            nodes.push({
                id: res.id,
                name: res.title,
                type: 'resource',
                val: 5,
                color: '#60a5fa',
                description: 'Recurso Externo'
            });
        });

        // Notes (Satellites)
        notes.forEach(note => {
            const isAI = note.comment_type === 'ai_instruction';
            nodes.push({
                id: note.id,
                name: isAI ? 'IA Insight' : 'Nota',
                type: isAI ? 'ai-note' : 'user-note',
                val: 2,
                color: isAI ? '#d946ef' : '#fbbf24', // Magenta for AI, Amber for User
                parentId: note.block_id,
                description: note.content
            });

            if (note.block_id) {
                links.push({
                    source: note.block_id,
                    target: note.id,
                    type: 'comment',
                    color: isAI ? 'rgba(217, 70, 239, 0.3)' : 'rgba(251, 191, 36, 0.3)'
                });
            }
        });

        // Semantic Links
        semanticLinks.forEach(link => {
            const sourceNode = nodes.find(n => n.id === link.source_block_id);
            const targetNode = nodes.find(n => n.id === link.target_block_id);

            if (sourceNode && targetNode) {
                links.push({
                    source: link.source_block_id,
                    target: link.target_block_id,
                    type: link.link_type,
                    color: '#ffffff30'
                });
            }
        });

        return { nodes, links };
    }, [blocks, resources, semanticLinks, notes]);

    // Auto-fit effect
    useEffect(() => {
        if (graphRef.current && data.nodes.length > 0) {
            // Give physics a moment to stabilize then fit to view
            setTimeout(() => {
                graphRef.current.zoomToFit(1000, 100);
            }, 800);
        }
    }, [data.nodes.length]);

    // Node rendering: Solid glowing spheres for perfect 3D occlusion
    const nodeThreeObject = useCallback((node: any) => {
        const obj = new THREE.Group();

        // Sphere - Scale based on type and importance
        let radius = 2.0;
        switch (node.type) {
            case 'block': radius = 3.5; break;
            case 'sub-block': radius = 2.2; break;
            case 'resource': radius = 2.5; break;
            case 'user-note':
            case 'ai-note': radius = 0.8; break;
        }

        const geometry = new THREE.SphereGeometry(radius, 32, 32);
        const material = new THREE.MeshStandardMaterial({
            color: node.color,
            roughness: node.type.includes('note') ? 0.2 : 0.4,
            metalness: node.type.includes('note') ? 0.8 : 0.2,
            emissive: node.color,
            emissiveIntensity: node.type.includes('note') ? 0.5 : 0.1
        });
        const sphere = new THREE.Mesh(geometry, material);
        obj.add(sphere);

        // Label - Only for significant nodes
        if (node.type !== 'user-note' && node.type !== 'ai-note') {
            const sprite = new SpriteText(node.name);
            sprite.color = '#ffffff';
            sprite.textHeight = node.type === 'block' ? 1.8 : 1.4;
            sprite.fontWeight = '500';
            sprite.padding = 0;
            sprite.backgroundColor = 'rgba(0,0,0,0.6)';
            sprite.borderRadius = 0.2;
            (sprite as any).position.y = -(radius + 4);
            obj.add(sprite);
        }

        return obj;
    }, []);

    const handleNodeClick = useCallback((node: any) => {
        // Aim at node from outside
        const distance = 40;
        const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

        if (graphRef.current) {
            graphRef.current.cameraPosition(
                { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new pos
                node, // lookAt property
                3000  // transitions duration
            );
        }

        setTimeout(() => onNodeClick(node.id), 500);
    }, [onNodeClick]);

    return (
        <div className="w-full h-full rounded-3xl border border-white/5 overflow-hidden relative shadow-2xl" style={{
            background: 'radial-gradient(circle at 50% 50%, #151515 0%, #050505 100%)'
        }}>
            <div className="absolute top-6 left-8 z-20 pointer-events-none">
                <div className="flex flex-col gap-1">
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-1">Motor de Relaciones</h4>
                    <h2 className="text-xl font-bold text-white tracking-tighter">Grafo Cognitivo 3.0</h2>
                    <p className="text-[10px] text-white/40 font-medium max-w-[200px] leading-tight mt-1">
                        Interactúa con los nodos para navegar por la estructura lógica del documento.
                    </p>
                </div>
            </div>

            {/* Premium Atmosphere Control Bar - Unified Ochre UI */}
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-black/80 backdrop-blur-2xl border border-white/5 p-1 rounded-2xl flex items-center shadow-[0_40px_80px_rgba(0,0,0,0.9)]">
                <div className="flex items-center gap-10 pl-10 pr-6 py-5">
                    <div className="flex flex-col gap-2.5">
                        <div className="flex justify-between items-end min-w-[140px]">
                            <span className="text-[10px] font-black text-[#d4ae7b] uppercase tracking-[0.25em]">Densidad</span>
                            <span className="text-[11px] tabular-nums text-[#d4ae7b]/70 font-bold">{Math.round(fogIntensity * 100)}%</span>
                        </div>
                        <input
                            type="range" min="0" max="1" step="0.05"
                            value={fogIntensity}
                            onChange={(e) => setFogIntensity(parseFloat(e.target.value))}
                            className="w-40 h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-[#d4ae7b] hover:bg-white/10 transition-colors"
                        />
                    </div>

                    <div className="w-[1px] h-12 bg-white/5" />

                    <div className="flex flex-col gap-2.5">
                        <div className="flex justify-between items-end min-w-[280px]">
                            <span className="text-[10px] text-[#d4ae7b] uppercase font-black tracking-[0.25em]">Radio de Visión Lógica</span>
                            <span className="text-[11px] tabular-nums text-[#d4ae7b]/70 font-bold">{fogFar}m</span>
                        </div>
                        <input
                            type="range" min="100" max="5000" step="50"
                            value={fogFar}
                            onChange={(e) => setFogFar(parseInt(e.target.value))}
                            className="w-80 h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-[#d4ae7b] hover:bg-white/10 transition-colors"
                        />
                    </div>

                    <button
                        onClick={() => {
                            setFogNear(150);
                            setFogFar(2000);
                            setFogIntensity(0.4);
                        }}
                        className="ml-6 p-4 bg-[#d4ae7b]/5 hover:bg-[#d4ae7b]/20 rounded-2xl text-[#d4ae7b]/40 hover:text-[#d4ae7b] transition-all group border border-white/5"
                        title="Calibración Sistémica"
                    >
                        <Wand2 className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                    </button>
                </div>
            </div>

            <div className="absolute bottom-6 left-8 z-20 pointer-events-none flex flex-wrap gap-x-8 gap-y-2 max-w-[600px]">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#d4ae7b]" />
                    <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">Bloque Maestro</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#e5c08d]" />
                    <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">Sub-Bloque</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">Recurso</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]" />
                    <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">Nota Usuario</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#d946ef]" />
                    <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">Insight IA</span>
                </div>
            </div>

            <ForceGraph3D
                key={`graph-${data.nodes.length}`}
                ref={graphRef}
                graphData={data}
                width={width}
                height={height}
                backgroundColor="rgba(0,0,0,0)" // Transparent to show CSS gradient
                nodeThreeObject={nodeThreeObject}
                nodeThreeObjectExtend={false}
                linkColor={(link: any) => {
                    if (link.type === 'hierarchy') return 'rgba(212, 174, 123, 0.4)';
                    if (link.type === 'comment') return link.color;
                    return 'rgba(212, 174, 123, 0.15)';
                }}
                linkWidth={(link: any) => {
                    if (link.type === 'hierarchy') return 1.5;
                    if (link.type === 'comment') return 0.5;
                    return 0.8;
                }}
                linkDirectionalParticles={4}
                linkDirectionalParticleSpeed={0.005}
                linkDirectionalParticleWidth={0.5}
                linkDirectionalParticleResolution={12}
                linkDirectionalParticleColor={() => '#ffffff'}
                onNodeClick={handleNodeClick}
                enableNodeDrag={false}
                showNavInfo={false}
            />
        </div>
    );
}
