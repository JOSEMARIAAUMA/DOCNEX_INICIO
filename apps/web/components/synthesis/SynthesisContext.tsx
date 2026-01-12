'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { BlockItem } from '@/lib/ai/schemas';

// --- Types based on the "Linked Stream" Concept ---

export type BlockStatus = 'research' | 'draft' | 'validated';
export type SectionId = string;

export interface SynthesisBlock extends BlockItem {
    id: string; // Ensure ID is present
    ui_status: BlockStatus;
    quality_score: number; // 0-5 stars
    container_id: SectionId | 'pool'; // 'pool' means it's in the bottom inventory
    source_type: 'legal' | 'technical' | 'financial' | 'general';
    tags: string[];
}

export interface SynthesisSection {
    id: SectionId;
    title: string;
    order: number;
    description?: string;
    progress: number; // 0-100%
}

interface SynthesisContextType {
    sections: SynthesisSection[];
    blocks: SynthesisBlock[];
    moveBlock: (blockId: string, targetContainerId: SectionId | 'pool', overId?: string) => void;
    updateBlockStatus: (blockId: string, status: BlockStatus) => void;
    reorderBlock: (blockId: string, newIndex: number) => void;
    getBlocksByContainer: (containerId: string) => SynthesisBlock[];
}

const SynthesisContext = createContext<SynthesisContextType | undefined>(undefined);

export function SynthesisProvider({ children }: { children: React.ReactNode }) {
    // MOCK DATA FOR PROTOTYPING - Based on User Screenshots
    const [sections, setSections] = useState<SynthesisSection[]>([
        { id: 'sec-1', title: '1. ANTECEDENTES', order: 1, progress: 100, description: 'Introducción y Objeto' },
        { id: 'sec-2', title: '2. INFO. TERRITORIAL', order: 2, progress: 40, description: 'Datos del Ámbito' },
        { id: 'sec-3', title: '3. ORDENACIÓN', order: 3, progress: 20, description: 'Propuesta Técnica' },
        { id: 'sec-4', title: '4. NORMATIVA', order: 4, progress: 80, description: 'Justificación Legal' },
        { id: 'sec-5', title: '5. ECONÓMICO', order: 5, progress: 0, description: 'Viabilidad' },
    ]);

    const [blocks, setBlocks] = useState<SynthesisBlock[]>([
        {
            id: 'b-1',
            title: 'Ficha_Catastral_982.pdf',
            content: 'Referencia catastral del ámbito...',
            ui_status: 'validated',
            container_id: 'sec-2',
            quality_score: 5,
            source_type: 'technical',
            target: 'active_version',
            tags: ['Catastro', 'PDF']
        },
        {
            id: 'b-2',
            title: 'Notas_Reunión_Cliente.txt',
            content: 'El cliente solicita mantener la edificabilidad...',
            ui_status: 'draft',
            container_id: 'sec-3',
            quality_score: 3,
            source_type: 'general',
            target: 'active_version',
            tags: ['Cliente', 'Reunión']
        },
        {
            id: 'b-3',
            title: 'Ley Suelo TRLOTUP 5/2014',
            content: 'Artículo 12. Condiciones de diseño...',
            ui_status: 'validated',
            container_id: 'sec-4',
            quality_score: 5,
            source_type: 'legal',
            target: 'active_version',
            tags: ['Ley', 'Autonómica']
        },
        {
            id: 'b-4',
            title: 'Accesibilidad DB-SUA',
            content: 'Cumplimiento de itinerarios accesibles...',
            ui_status: 'validated',
            container_id: 'sec-4',
            quality_score: 4,
            source_type: 'legal',
            target: 'active_version',
            tags: ['CTE', 'Nacional']
        },
        // Pool Items
        {
            id: 'p-1',
            title: 'Topo_Final_Georef.dwg',
            content: 'Levantamiento topográfico...',
            ui_status: 'research',
            container_id: 'pool',
            quality_score: 5,
            source_type: 'technical',
            target: 'active_version',
            tags: ['DWG', 'Topografía']
        },
        {
            id: 'p-2',
            title: 'Art. 12 Normas PGOU',
            content: 'Usos compatibles en zona residencial...',
            ui_status: 'research',
            container_id: 'pool',
            quality_score: 4,
            source_type: 'legal',
            target: 'active_version',
            tags: ['PGOU', 'Normativa']
        },
        {
            id: 'p-3',
            title: 'Memoria_Borrador_v1.docx',
            content: 'Primer borrador de la memoria descriptiva...',
            ui_status: 'draft',
            container_id: 'pool',
            quality_score: 2,
            source_type: 'general',
            target: 'active_version',
            tags: ['Borrador']
        },
        {
            id: 'p-4',
            title: 'Estudio Acústico Sector',
            content: 'Mapas de ruido...',
            ui_status: 'research',
            container_id: 'pool',
            quality_score: 5,
            source_type: 'technical',
            target: 'active_version',
            tags: ['Ambiental']
        },
        {
            id: 'p-5',
            title: 'Excel_Costes_Estimados',
            content: 'Valoración inicial...',
            ui_status: 'research',
            container_id: 'pool',
            quality_score: 3,
            source_type: 'financial',
            target: 'active_version',
            tags: ['Excel']
        }
    ]);

    const moveBlock = useCallback((blockId: string, targetContainerId: SectionId | 'pool', overId?: string) => {
        setBlocks(prev => {
            const activeIndex = prev.findIndex(b => b.id === blockId);
            if (activeIndex === -1) return prev;

            const updatedBlocks = [...prev];
            // Update container
            updatedBlocks[activeIndex] = { ...updatedBlocks[activeIndex], container_id: targetContainerId };

            if (overId && overId !== blockId) {
                const overIndex = prev.findIndex(b => b.id === overId);
                if (overIndex !== -1) {
                    return arrayMove(updatedBlocks, activeIndex, overIndex);
                }
            }

            return updatedBlocks;
        });
    }, []);

    const updateBlockStatus = useCallback((blockId: string, status: BlockStatus) => {
        setBlocks(prev => prev.map(b =>
            b.id === blockId ? { ...b, ui_status: status } : b
        ));
    }, []);

    const reorderBlock = useCallback((blockId: string, newIndex: number) => {
        // Basic reorder logic placeholder
        console.log('Reorder', blockId, newIndex);
    }, []);

    const getBlocksByContainer = useCallback((containerId: string) => {
        return blocks.filter(b => b.container_id === containerId);
    }, [blocks]);

    return (
        <SynthesisContext.Provider value={{
            sections,
            blocks,
            moveBlock,
            updateBlockStatus,
            reorderBlock,
            getBlocksByContainer
        }}>
            {children}
        </SynthesisContext.Provider>
    );
}

export function useSynthesis() {
    const context = useContext(SynthesisContext);
    if (context === undefined) {
        throw new Error('useSynthesis must be used within a SynthesisProvider');
    }
    return context;
}
