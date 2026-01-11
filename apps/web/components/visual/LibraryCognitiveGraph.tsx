'use client';

import dynamic from 'next/dynamic';
import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { Map } from 'lucide-react';
import SpriteText from 'three-spritetext';
import * as THREE from 'three';
import { decodeHtmlEntities } from '@/lib/text-utils';

const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full text-xs text-muted-foreground animate-pulse font-black uppercase tracking-widest">Iniciando Cartografía Cognitiva...</div>
});

interface LibraryCognitiveGraphProps {
    resources: any[];
    onResourceClick?: (resourceId: string) => void;
}

export default function LibraryCognitiveGraph({ resources, onResourceClick }: LibraryCognitiveGraphProps) {
    const fgRef = useRef<any>(null);
    const [dimensions, setDimensions] = useState({ w: 800, h: 600 });
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                setDimensions({ w: entry.contentRect.width, h: entry.contentRect.height });
            }
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    const graphData = useMemo(() => {
        const nodes = resources.map(res => ({
            id: res.id,
            label: decodeHtmlEntities(res.title),
            color: res.meta?.compliance_type === 'OBLIGATORY' ? '#ef4444' :
                res.meta?.compliance_type === 'RECOMMENDATION' ? '#f59e0b' : '#3b82f6',
            val: res.meta?.range === 'ESTATAL' ? 10 : res.meta?.range === 'REGIONAL' ? 8 : 6,
            res: res
        }));

        // Logic for semantic relationships in the library
        const links: any[] = [];
        if (nodes.length > 1) {
            // Find LISTA (Ley marco)
            const lista = nodes.find(n => n.label.toLowerCase().includes('lista'));
            if (lista) {
                // All other nodes that are not LISTA and are REGIONAL could point to LISTA
                nodes.forEach(node => {
                    if (node.id !== lista.id && node.res.meta?.range === 'REGIONAL') {
                        links.push({
                            source: node.id,
                            target: lista.id,
                            label: 'Derivada de',
                            color: 'rgba(255,255,255,0.1)'
                        });
                    }
                });
            }
        }

        return { nodes, links };
    }, [resources]);

    const nodeThreeObject = useCallback((node: any) => {
        const obj = new THREE.Group();

        // Use different geometries for different ranges
        let geometry;
        if (node.res.meta?.range === 'ESTATAL') {
            geometry = new THREE.OctahedronGeometry(node.val);
        } else if (node.res.meta?.range === 'REGIONAL') {
            geometry = new THREE.DodecahedronGeometry(node.val);
        } else {
            geometry = new THREE.IcosahedronGeometry(node.val);
        }

        const material = new THREE.MeshPhongMaterial({
            color: node.color,
            transparent: true,
            opacity: 0.7,
            emissive: node.color,
            emissiveIntensity: 0.4,
            shininess: 90
        });
        const mesh = new THREE.Mesh(geometry, material);
        obj.add(mesh);

        // Add a wireframe for a more "cognitive/tech" look
        const wireframeGeom = new THREE.EdgesGeometry(geometry);
        const wireframeMat = new THREE.LineBasicMaterial({ color: node.color, transparent: true, opacity: 0.3 });
        const wireframe = new THREE.LineSegments(wireframeGeom, wireframeMat);
        obj.add(wireframe);

        const sprite = new SpriteText(node.label);
        sprite.color = '#ffffff';
        sprite.textHeight = 1.8;
        sprite.fontWeight = 'bold';
        sprite.backgroundColor = 'rgba(0,0,0,0.4)';
        sprite.padding = 1;
        sprite.borderRadius = 0.5;
        (sprite as any).position.y = node.val + 8;
        obj.add(sprite);

        return obj;
    }, []);

    return (
        <div ref={containerRef} className="w-full h-full relative rounded-[3rem] overflow-hidden bg-slate-900/10 border border-white/5 group">
            {/* Visual background effect */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_70%)]" />

            <ForceGraph3D
                ref={fgRef}
                graphData={graphData}
                width={dimensions.w}
                height={dimensions.h}
                backgroundColor="rgba(0,0,0,0)"
                nodeThreeObject={nodeThreeObject}
                nodeThreeObjectExtend={false}
                linkColor={() => 'rgba(255,255,255,0.15)'}
                linkWidth={1.5}
                linkDirectionalParticles={1}
                linkDirectionalParticleSpeed={0.002}
                linkCurvature={0.2}
                onNodeClick={(node: any) => onResourceClick?.(node.id)}
                showNavInfo={false}
            />

            {/* Legend & UI */}
            <div className="absolute bottom-8 left-8 flex flex-col gap-4 pointer-events-none transition-transform duration-500 group-hover:translate-x-2">
                <div className="flex items-center gap-3 bg-card/60 backdrop-blur-xl px-5 py-2.5 rounded-2xl border border-white/10 shadow-2xl">
                    <Map className="w-4 h-4 text-primary animate-pulse" />
                    <div>
                        <span className="block text-[10px] font-black uppercase tracking-widest text-primary">Topología Maestría</span>
                        <span className="block text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">Grafo de Relaciones Normativas</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-2 bg-card/40 backdrop-blur-xl p-5 rounded-[2rem] border border-white/5 shadow-2xl">
                    {[
                        { color: 'bg-red-500', label: 'Obligatorio' },
                        { color: 'bg-amber-500', label: 'Recomendado' },
                        { color: 'bg-blue-500', label: 'Referencia' }
                    ].map(item => (
                        <div key={item.label} className="flex items-center gap-2.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${item.color} shadow-[0_0_8px_rgba(255,255,255,0.3)]`} />
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="absolute top-8 right-8 flex flex-col gap-2">
                <div className="bg-card/40 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/5">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{resources.length} NODOS ACTIVOS</span>
                </div>
            </div>
        </div>
    );
}
