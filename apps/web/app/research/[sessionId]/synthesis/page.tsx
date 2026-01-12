'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { DocumentBlock } from '@docnex/shared';
import BlockMergeTool from '@/components/synthesis/BlockMergeTool';
import BlockList from '@/components/blocks/BlockList';
import SimpleEditor from '@/components/editor/SimpleEditor'; // Assuming this exists based on common structure
import { ArrowLeft, BookOpen, ChevronsRight, FileText } from 'lucide-react';
import Link from 'next/link';

// Mock Data
const MOCK_BLOCKS: DocumentBlock[] = [
    {
        id: '1',
        title: 'Introducción a la IA',
        content: 'La inteligencia artificial ha revolucionado...',
        parent_block_id: null,
        document_id: 'doc1',
        order_index: 0,
        block_type: 'section',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_edited_at: new Date().toISOString(),
        is_deleted: false
    },
    {
        id: '2',
        title: 'Historia',
        content: 'Desde los años 50, se ha investigado...',
        parent_block_id: '1',
        document_id: 'doc1',
        order_index: 0,
        block_type: 'section',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_edited_at: new Date().toISOString(),
        is_deleted: false
    },
    {
        id: '3',
        title: 'Impacto Social',
        content: 'El impacto en el empleo es un tema debatido...',
        parent_block_id: null,
        document_id: 'doc1',
        order_index: 1,
        block_type: 'section',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_edited_at: new Date().toISOString(),
        is_deleted: false
    },
    {
        id: '4',
        title: 'Regulaciones',
        content: 'La ley de IA de la UE establece...',
        parent_block_id: '3',
        document_id: 'doc1',
        order_index: 0,
        block_type: 'section',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_edited_at: new Date().toISOString(),
        is_deleted: false
    },
    {
        id: '5',
        title: 'Conclusiones',
        content: 'Es necesario un balance entre innovación y seguridad.',
        parent_block_id: null,
        document_id: 'doc1',
        order_index: 2,
        block_type: 'section',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_edited_at: new Date().toISOString(),
        is_deleted: false
    }
];

export default function SynthesisPage() {
    const params = useParams();
    const sessionId = params?.sessionId as string;

    const [blocks, setBlocks] = useState<DocumentBlock[]>(MOCK_BLOCKS);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [targetContent, setTargetContent] = useState<string>('# Documento Consolidado\n\nEste es el borrador inicial...');
    const [mergeQueue, setMergeQueue] = useState<DocumentBlock[]>([]);

    const handleBlockAction = (blockId: string | string[], action: string) => {
        if (action === 'add-to-queue') {
            const ids = Array.isArray(blockId) ? blockId : [blockId];
            const newBlocks = blocks.filter(b => ids.includes(b.id) && !mergeQueue.find(q => q.id === b.id));
            setMergeQueue([...mergeQueue, ...newBlocks]);
            console.log("Added to queue:", ids);
        }
        if (action === 'bulk-merge') {
            const ids = Array.isArray(blockId) ? blockId : [blockId];
            const newBlocks = blocks.filter(b => ids.includes(b.id));
            setMergeQueue(newBlocks);
        }
    };

    const handleMergeComplete = () => {
        // Logic to update target document or refresh blocks
        setTargetContent(prev => prev + '\n\n[Bloque fusionado insertado aquí]');
        setMergeQueue([]);
    };

    return (
        <div className="h-screen flex flex-col bg-background overflow-hidden font-sans">
            {/* Header */}
            <header className="h-14 border-b border-border bg-card flex items-center px-4 justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <Link href={`/research/${sessionId}`} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                    </Link>
                    <div className="flex flex-col">
                        <h1 className="text-sm font-semibold flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-primary" />
                            Síntesis de Investigación
                        </h1>
                        <span className="text-xs text-muted-foreground">Sesión: {sessionId}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md shadow-sm hover:opacity-90">
                        Guardar Progreso
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Source Documents */}
                <div className="w-80 border-r border-border bg-muted/10 flex flex-col">
                    <div className="p-3 border-b border-border font-medium text-xs text-muted-foreground uppercase flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Fuentes Disponibles
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <BlockList
                            blocks={blocks}
                            selectedBlockId={selectedBlockId}
                            onSelectBlock={setSelectedBlockId}
                            onReorder={() => { }} // Read-only for now
                            onAddBlock={() => { }} // Read-only
                            onBlockAction={handleBlockAction}
                        />
                    </div>
                </div>

                {/* Center: Merge Tool */}
                <div className="flex-1 p-4 bg-muted/5 flex flex-col min-w-[500px]">
                    <BlockMergeTool
                        sessionId={sessionId}
                        availableBlocks={blocks}  // In real app, might pass only queued or relevant blocks
                        targetDocumentId="target-doc-id"
                        onMergeComplete={handleMergeComplete}
                        initialSelectedIds={mergeQueue.map(b => b.id)}
                    />
                </div>

                {/* Right: Target Preview */}
                <div className="w-[450px] border-l border-border bg-card flex flex-col shadow-xl z-10">
                    <div className="p-3 border-b border-border font-medium text-xs text-muted-foreground uppercase flex items-center gap-2 bg-muted/30">
                        <FileText className="w-4 h-4" />
                        Documento Objetivo
                    </div>
                    <div className="flex-1 overflow-hidden relative">
                        <SimpleEditor
                            content={targetContent}
                            onChange={setTargetContent}
                        />
                        {/* Visual connection indicator */}
                        <div className="absolute top-1/2 -left-3 transform -translate-y-1/2 p-1 bg-primary text-primary-foreground rounded-full shadow-lg z-20">
                            <ChevronsRight className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
