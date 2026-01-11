'use client';

import { useState } from 'react';
import { structureDocumentWithLibrarian, logAIFeedback, finalizeLibrarianLearning, batchImportBlocks } from '@/actions/ai';
import { useGlobalContext } from '@/hooks/useGlobalContext';
import { Upload, FileText, ChevronRight, CheckCircle, Smartphone, Edit3, Trash, Wand2, Split, RefreshCw } from 'lucide-react';
import mammoth from 'mammoth';

interface ImportBlock {
    id: string;
    title: string;
    content: string;
    type: string;
    children?: ImportBlock[];
}

interface AIImportWizardProps {
    documentId?: string; // If adding to existing
    projectId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export function AIImportWizard({ documentId, projectId, onClose, onSuccess }: AIImportWizardProps) {
    const { context } = useGlobalContext();
    const [step, setStep] = useState<'upload' | 'analysis' | 'review'>('upload');
    const [rawText, setRawText] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [blocks, setBlocks] = useState<ImportBlock[]>([]);
    const [originalBlocks, setOriginalBlocks] = useState<ImportBlock[]>([]);
    const [aiLinks, setAiLinks] = useState<any[]>([]);

    // File Processing
    const processFile = async (file: File) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'txt') {
            const text = await file.text();
            setRawText(text);
        } else if (ext === 'docx') {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            setRawText(result.value);
        } else {
            alert('Formato no soportado en esta versión (solo .txt y .docx)');
        }
    };

    const handleAnalyze = async () => {
        if (!rawText) return;
        setIsAnalyzing(true);
        const startTime = Date.now();
        try {
            const result = await structureDocumentWithLibrarian(rawText, projectId, context);
            if (result.success && result.blocks) {
                const mappedBlocks = result.blocks.map((b: any) => ({
                    id: crypto.randomUUID(),
                    title: b.title,
                    content: b.content,
                    type: b.target || 'standard',
                    children: b.children
                }));
                setBlocks(mappedBlocks);
                setOriginalBlocks(mappedBlocks);
                setAiLinks(result.links || []);
                setStep('review');

                // Track performance
                logAIFeedback({
                    agentId: 'librarian',
                    eventType: 'division_proposal',
                    projectId,
                    userFeedback: { initial_status: 'review_pending' },
                    metrics: { latency_ms: Date.now() - startTime, blocks_detected: result.blocks.length }
                });
            } else {
                alert('Error: ' + result.error);
            }
        } catch (e) {
            console.error(e);
            alert('Error analizando documento');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Recursive function to update block title at any depth
    const updateBlockTitle = (blockId: string, newTitle: string, items: ImportBlock[]): ImportBlock[] => {
        return items.map(block => {
            if (block.id === blockId) {
                return { ...block, title: newTitle };
            }
            if (block.children && block.children.length > 0) {
                return { ...block, children: updateBlockTitle(blockId, newTitle, block.children) };
            }
            return block;
        });
    };

    // Level colors and labels for hierarchy visualization
    const LEVEL_COLORS = ['bg-amber-500/10 border-amber-500/30', 'bg-cyan-500/10 border-cyan-500/30', 'bg-purple-500/10 border-purple-500/30'];
    const LEVEL_LABELS = ['TÍTULO', 'CAPÍTULO', 'ARTÍCULO'];

    const renderBlockTree = (items: ImportBlock[], level = 0): React.ReactNode => {
        return (
            <div className="space-y-2">
                {items.map(block => (
                    <div
                        key={block.id}
                        className={`border rounded-lg p-3 ${LEVEL_COLORS[level] || 'bg-card border-border'} hover:border-primary/50 transition-colors`}
                        style={{ marginLeft: `${level * 16}px` }}
                    >
                        <div className="flex items-center gap-2">
                            <div className={`p-1 rounded ${level === 0 ? 'bg-amber-500/20 text-amber-500' : level === 1 ? 'bg-cyan-500/20 text-cyan-500' : 'bg-purple-500/20 text-purple-500'}`}>
                                <FileText className="w-4 h-4" />
                            </div>
                            <input
                                value={block.title}
                                onChange={(e) => {
                                    const newBlocks = updateBlockTitle(block.id, e.target.value, blocks);
                                    setBlocks(newBlocks);
                                }}
                                className="bg-transparent font-bold text-sm focus:outline-none flex-1"
                            />
                            <div className={`text-[10px] uppercase px-2 py-0.5 rounded font-medium ${level === 0 ? 'bg-amber-500/20 text-amber-600' : level === 1 ? 'bg-cyan-500/20 text-cyan-600' : 'bg-purple-500/20 text-purple-600'}`}>
                                {LEVEL_LABELS[level] || block.type}
                            </div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground line-clamp-2 pl-7 border-l-2 border-border ml-2">
                            <div dangerouslySetInnerHTML={{ __html: block.content.slice(0, 200) + (block.content.length > 200 ? '...' : '') }} />
                        </div>

                        {/* Render children recursively (up to 3 levels) */}
                        {block.children && block.children.length > 0 && level < 2 && (
                            <div className="mt-3">
                                {renderBlockTree(block.children, level + 1)}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    const handleImport = async () => {
        if (!projectId) return;
        setIsAnalyzing(true);
        try {
            // 1. Learning Loop
            await finalizeLibrarianLearning(
                originalBlocks.map(b => ({ title: b.title, content: b.content, target: b.type as any })),
                blocks.map(b => ({ title: b.title, content: b.content, target: b.type as any }))
            );

            // 2. Atomic Batch Import (Blocks + Semantic Links)
            const result = await batchImportBlocks(
                projectId,
                documentId || '',
                blocks.map(b => ({ title: b.title, content: b.content, target: b.type as any })),
                aiLinks
            );

            if (result.success) {
                onSuccess();
            } else {
                alert("Error en la importación: " + result.error);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-background w-full max-w-6xl h-[80vh] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="h-16 border-b border-border flex items-center justify-between px-6 shrink-0 bg-muted/20">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Wand2 className="w-5 h-5 text-purple-500" />
                        AI Cognitive Import v4.0 (GraphRAG Ready)
                    </h2>
                    <button onClick={onClose} className="hover:bg-muted p-2 rounded-full"><Trash className="w-5 h-5" /></button>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Source */}
                    <div className="flex-1 border-r border-border p-6 flex flex-col gap-4 bg-muted/5">
                        <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-widest">Documento Fuente</h3>
                        {step === 'upload' ? (
                            <div className="flex-1 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-4 text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                                onDragOver={e => e.preventDefault()}
                                onDrop={async e => {
                                    e.preventDefault();
                                    const file = e.dataTransfer.files[0];
                                    if (file) await processFile(file);
                                }}
                            >
                                <Upload className="w-12 h-12 opacity-50" />
                                <div className="text-center">
                                    <p className="font-bold">Arrastra un archivo aquí</p>
                                    <p className="text-sm">Soporte nativo para .docx y .txt</p>
                                </div>
                                <input type="file" onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) processFile(file);
                                }} className="hidden" id="file-upload" />
                                <label htmlFor="file-upload" className="bg-primary text-primary-foreground px-6 py-2 rounded-xl cursor-pointer shadow-lg hover:scale-105 transition-transform">Seleccionar Archivo</label>
                            </div>
                        ) : (
                            <div className="flex-1 bg-card rounded-2xl border border-border p-6 overflow-y-auto shadow-inner">
                                <div className="prose prose-sm max-w-none dark:prose-invert">
                                    {rawText.startsWith('<') ? <div dangerouslySetInnerHTML={{ __html: rawText }} /> : <pre className="whitespace-pre-wrap font-sans text-sm">{rawText}</pre>}
                                </div>
                            </div>
                        )}

                        {step === 'upload' && rawText && (
                            <button
                                onClick={handleAnalyze}
                                disabled={isAnalyzing}
                                className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-all"
                            >
                                {isAnalyzing ? <Wand2 className="w-5 h-5 animate-spin" /> : <Split className="w-5 h-5" />}
                                {isAnalyzing ? 'Orquestando Agentes...' : 'Analizar Estructura Cognitiva'}
                            </button>
                        )}
                    </div>

                    {/* Right: Structure */}
                    <div className="flex-1 p-6 flex flex-col gap-4 bg-background">
                        <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-widest">Arquitectura Propuesta</h3>
                        {step === 'review' ? (
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                                {renderBlockTree(blocks)}
                                {aiLinks.length > 0 && (
                                    <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                                        <h4 className="text-xs font-bold text-primary uppercase mb-2">Relaciones Semánticas Detectadas ({aiLinks.length})</h4>
                                        <div className="space-y-1">
                                            {aiLinks.slice(0, 3).map((link, i) => (
                                                <div key={i} className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                    <ChevronRight className="w-3 h-3" />
                                                    {blocks[link.source_index]?.title} {'->'} {blocks[link.target_index]?.title}
                                                </div>
                                            ))}
                                            {aiLinks.length > 3 && <div className="text-[10px] italic">+ {aiLinks.length - 3} relaciones más</div>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/30 italic gap-4">
                                <div className="w-20 h-20 rounded-full border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
                                    <Smartphone className="w-8 h-8 opacity-20" />
                                </div>
                                <p className="text-sm">El mapa cognitivo aparecerá tras el análisis</p>
                            </div>
                        )}

                        <button
                            onClick={handleImport}
                            disabled={isAnalyzing || step !== 'review'}
                            className="w-full py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50 transition-all"
                        >
                            {isAnalyzing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                            {isAnalyzing ? 'Sincronizando Aprendizaje...' : `Confirmar y Construir Grafo (${blocks.length} Nodos)`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
