'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import SpriteText from 'three-spritetext';
import * as THREE from 'three';
import { DocumentBlock, Resource } from '@docnex/shared';

interface GraphNode {
    id: string;
    name: string;
    type: 'block' | 'resource';
    val: number;
    color: string;
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
    onNodeClick: (nodeId: string) => void;
    width?: number;
    height?: number;
}

export default function SemanticGraph({
    blocks,
    resources,
    semanticLinks,
    onNodeClick,
    width,
    height
}: SemanticGraphProps) {
    const graphRef = useRef<any>(null);

    const data = useMemo(() => {
        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];

        // Blocks: Warm ochre/primary palette
        blocks.forEach((block, idx) => {
            nodes.push({
                id: block.id,
                name: block.title || `Bloque ${idx + 1}`,
                type: 'block',
                val: 8,
                color: '#d4ae7b', // Ochre logic
                description: block.content ? block.content.substring(0, 100) + '...' : ''
            });
        });

        // Resources: Cool semantic blue
        resources.forEach(res => {
            nodes.push({
                id: res.id,
                name: res.title,
                type: 'resource',
                val: 5,
                color: '#60a5fa', // Blue
                description: 'Recurso Externo'
            });
        });

        // Semantic Links
        semanticLinks.forEach(link => {
            links.push({
                source: link.source_block_id,
                target: link.target_block_id,
                type: link.link_type,
                color: link.link_type?.toLowerCase().includes('critical') ? '#ef4444' : '#ffffff20'
            });
        });

        return { nodes, links };
    }, [blocks, resources, semanticLinks]);

    // Node rendering: Glowing spheres with clear text
    const nodeThreeObject = useCallback((node: any) => {
        const obj = new THREE.Group();

        // Sphere
        const geometry = new THREE.SphereGeometry(node.type === 'block' ? 4 : 3);
        const material = new THREE.MeshPhongMaterial({
            color: node.color,
            transparent: true,
            opacity: 0.8,
            emissive: node.color,
            emissiveIntensity: 0.5
        });
        const sphere = new THREE.Mesh(geometry, material);
        obj.add(sphere);

        // Label
        const sprite = new SpriteText(node.name);
        sprite.color = '#ffffff';
        sprite.textHeight = 4;
        sprite.fontWeight = '700';
        sprite.padding = 2;
        sprite.backgroundColor = 'rgba(0,0,0,0.5)';
        sprite.borderRadius = 2;
        (sprite as any).position.y = -8; // Position below sphere
        obj.add(sprite);

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
        <div className="w-full h-full bg-[#050505] rounded-3xl border border-white/5 overflow-hidden relative shadow-2xl">
            <div className="absolute top-6 left-8 z-20 pointer-events-none">
                <div className="flex flex-col gap-1">
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-1">Motor de Relaciones</h4>
                    <h2 className="text-xl font-bold text-white tracking-tighter">Grafo Cognitivo 3.0</h2>
                    <p className="text-[10px] text-white/40 font-medium max-w-[200px] leading-tight mt-1">
                        Interactúa con los nodos para navegar por la estructura lógica del documento.
                    </p>
                </div>
            </div>

            <div className="absolute bottom-6 left-8 z-20 pointer-events-none flex gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(212,174,123,0.8)]" />
                    <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">Bloque Lógico</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                    <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">Recurso Externo</span>
                </div>
            </div>

            <ForceGraph3D
                ref={graphRef}
                graphData={data}
                width={width}
                height={height}
                backgroundColor="#000000"
                nodeThreeObject={nodeThreeObject}
                nodeThreeObjectExtend={false}
                linkColor={link => (link as any).color || '#ffffff10'}
                linkWidth={1.5}
                linkDirectionalParticles={1}
                linkDirectionalParticleSpeed={0.005}
                linkDirectionalParticleWidth={2}
                linkDirectionalParticleColor={() => '#d4ae7b'}
                onNodeClick={handleNodeClick}
                enableNodeDrag={false}
                showNavInfo={false}
            />
        </div>
    );
}
