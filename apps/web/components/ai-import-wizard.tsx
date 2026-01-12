'use client';

import React, { useState } from 'react';
import { aiAgent } from '@/lib/ai/agent';
import { splitDocumentWithAI, chatWithAI, analyzeDocumentStructure } from '@/actions/ai';
import { importItems } from '@/actions/documents';
import { DeepAnalysisResult } from '@/lib/ai/schemas';
import { ImportItem } from '@/lib/ai/types';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import {
    LucideFileText, LucideUpload, LucideLoader2, LucideSparkles,
    LucideSend, LucideX, LucideCheck, LucideInfo, LucideLayers, LucideTag,
    LucideBriefcase, LucideHash, LucideClipboard, LucideUser, LucideAlertCircle, LucideGlobe,
    LucideFileCode, LucideDatabase, LucideTable
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Configure PDF.js worker
const getPdfjs = async () => {
    const pdfjs = await import('pdfjs-dist');
    const version = '5.4.530';
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
    }
    return pdfjs;
};

interface AIImportWizardProps {
    documentId: string;
    projectId: string;
    onClose: () => void;
    onSuccess: () => void;
}

import { useGlobalContext } from '@/hooks/useGlobalContext';

export function AIImportWizard({ documentId, projectId, onClose, onSuccess }: AIImportWizardProps) {
    const { context } = useGlobalContext();
    const [text, setText] = useState('');
    const [instructions, setInstructions] = useState('');
    const [items, setItems] = useState<ImportItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessingFile, setIsProcessingFile] = useState(false);

    // New step flow: 'upload' -> 'analysis' -> 'preview'
    const [step, setStep] = useState<'upload' | 'analysis' | 'preview'>('upload');

    // Analysis state
    const [analysis, setAnalysis] = useState<DeepAnalysisResult | null>(null);

    // Chat states
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatting, setIsChatting] = useState(false);

    // Metadata state
    const [metadata, setMetadata] = useState({
        projectId: projectId,
        version: '',
        isDraft: false,
        isPartDraft: false,
        isSource: false,
        isRegulation: false,
        isTemplate: false,
        isResearch: false,
        comments: '',
        client: '',
        isMandatory: false,
    });

    const [isDragging, setIsDragging] = useState(false);


    const processFile = async (file: File) => {
        setIsProcessingFile(true);
        try {
            const extension = file.name.split('.').pop()?.toLowerCase();
            let extractedText = '';

            if (['txt', 'md', 'json', 'xml', 'html', 'js', 'ts', 'py'].includes(extension || '')) {
                extractedText = await file.text();
            } else if (extension === 'docx') {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.convertToHtml(
                    { arrayBuffer },
                    {
                        styleMap: [
                            "p[style-name='Heading 1'] => h1:fresh",
                            "p[style-name='Heading 2'] => h2:fresh",
                            "p[style-name='Heading 3'] => h3:fresh",
                        ]
                    }
                );
                extractedText = result.value
                    .replace(/<img[^>]*>/gi, '')
                    .replace(/src="data:image\/[^"]*"/gi, '')
                    .replace(/<p>\s*<\/p>/g, '')
                    .trim();
            } else if (extension === 'pdf') {
                const arrayBuffer = await file.arrayBuffer();
                const pdfjs = await getPdfjs();
                const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = (textContent.items as any[]).map((item: any) => item.str).join(' ');
                    fullText += pageText + '\n\n';
                }
                extractedText = fullText;
            } else if (['xlsx', 'xls', 'csv'].includes(extension || '')) {
                const arrayBuffer = await file.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer);
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                extractedText = XLSX.utils.sheet_to_txt(worksheet);
            } else {
                alert('Intentando leer como texto...');
                extractedText = await file.text();
            }

            if (extractedText) {
                extractedText = extractedText.replace(/\n{3,}/g, '\n\n').trim();
                setText(extractedText);
            }
        } catch (error) {
            console.error('Error processing file:', error);
            alert('Error al procesar el archivo. Asegúrate de que sea un formato compatible.');
        } finally {
            setIsProcessingFile(false);
        }
    };

    // Trigger analysis when text is set
    React.useEffect(() => {
        if (text && step === 'upload') {
            performDeepAnalysis();
        }
    }, [text]);

    const performDeepAnalysis = async () => {
        setStep('analysis');
        setIsLoading(true);
        try {
            const res = await analyzeDocumentStructure(text, context);
            if (res.success && res.data) {
                setAnalysis(res.data);
                // Pre-fill instructions with the strategy recommendation
                setInstructions(res.data.recommendation.instructions);
                // Also add a welcome message to chat
                setChatMessages([{
                    role: 'assistant',
                    content: `He analizado tu documento "**${res.data.topic}**".\n\nDetecto una estructura basada en **${res.data.structure.hierarchy.join(' > ')}**.\n\nHe propuesto una estrategia de división. ¿Te parece bien o prefieres ajustarla?`
                }]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateBlocks = async () => {
        setIsLoading(true);
        try {
            const finalInstructions = instructions.trim() || analysis?.recommendation.instructions || 'Divide lógicamente';

            const result = await splitDocumentWithAI(text, finalInstructions, context);

            if (result.success && result.blocks) {
                const convertedItems: ImportItem[] = result.blocks.map(block => ({
                    id: crypto.randomUUID(),
                    title: block.title,
                    content: block.content,
                    target: block.target,
                    children: block.children?.map(child => ({
                        id: crypto.randomUUID(),
                        title: child.title,
                        content: child.content,
                        target: child.target
                    }))
                }));

                setItems(convertedItems);
                setStep('preview');
            }
        } catch (error) {
            console.error('Split error:', error);
            alert('Error al dividir el documento');
        } finally {
            setIsLoading(false);
        }
    };



    const handleChat = async () => {
        if (!chatInput.trim()) return;

        const userMessage = chatInput.trim();
        setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setChatInput('');
        setIsChatting(true);

        try {
            const result = await chatWithAI(userMessage, {
                documentPreview: text.slice(0, 20000),
                userInstructions: instructions
            }, context);

            if (result.success && result.reply) {
                setChatMessages(prev => [...prev, { role: 'assistant', content: result.reply || '' }]);
            } else {
                setChatMessages(prev => [...prev, {
                    role: 'assistant',
                    content: 'Lo siento, hubo un error. ¿Puedes reformular tu pregunta?'
                }]);
            }
        } catch (error) {
            console.error('Chat error:', error);
            setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Error de conexión. Inténtalo de nuevo.'
            }]);
        } finally {
            setIsChatting(false);
        }
    };

    const handleImport = async () => {
        setIsLoading(true);
        try {
            const res = await importItems(projectId, documentId, items, 'merge', metadata);
            if (res.success) {
                onSuccess();
                onClose();
            }
        } catch (e) {
            console.error(e);
            alert('Import failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-[1100px] h-[780px] bg-card rounded-xl shadow-2xl overflow-hidden flex flex-col border border-border">

                {/* Header */}
                <div className="h-14 border-b border-border flex items-center px-6 justify-between bg-gradient-to-r from-primary/10 to-transparent">
                    <div className="flex items-center gap-3">
                        <LucideSparkles className="w-6 h-6 text-primary animate-pulse" />
                        <div>
                            <h2 className="font-semibold text-foreground">Asistente IA de Importación</h2>
                            <p className="text-xs text-muted-foreground">
                                {step === 'upload' && 'Sube tu documento para comenzar'}
                                {step === 'analysis' && 'Revisión y Estrategia'}
                                {step === 'preview' && `${items.length} bloques listos para importar`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                        <LucideX className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 flex">
                    {/* Left: Document Input */}
                    <div className="flex-1 flex flex-col p-6 space-y-4 border-r border-border">
                        {step === 'upload' ? (
                            <div className="flex-1 flex flex-col min-h-0 space-y-6 overflow-y-auto pr-2">
                                <div className="grid grid-cols-2 gap-6">
                                    {/* File Input Column */}
                                    <div className="space-y-4">
                                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                            <LucideUpload className="w-4 h-4 text-primary" />
                                            Carga de Documento
                                        </label>
                                        <div
                                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                            onDragLeave={() => setIsDragging(false)}
                                            onDrop={async (e) => {
                                                e.preventDefault();
                                                setIsDragging(false);
                                                const file = e.dataTransfer.files?.[0];
                                                if (file) await processFile(file);
                                            }}
                                            className={`h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${isDragging ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border hover:border-primary/50'}`}
                                            onClick={() => document.getElementById('file-input')?.click()}
                                        >
                                            {isProcessingFile ? (
                                                <div className="text-center space-y-2">
                                                    <LucideLoader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                                                    <p className="text-sm text-muted-foreground">Procesando...</p>
                                                </div>
                                            ) : (
                                                <div className="text-center space-y-2 p-4">
                                                    <LucideUpload className={`w-10 h-10 mx-auto transition-colors ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                                                    <p className="text-sm font-medium">Arrastra o haz clic para subir</p>
                                                    <div className="flex flex-wrap justify-center gap-1 mt-2">
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded border border-border">PDF</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded border border-border">DOCX</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded border border-border">XLSX</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded border border-border">MD</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded border border-border">JSON</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded border border-border">...</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            id="file-input"
                                            type="file"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) processFile(file);
                                            }}
                                        />

                                        <div className="flex-1 flex flex-col min-h-[200px]">
                                            <label className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                                <LucideFileCode className="w-4 h-4 text-purple-400" />
                                                Texto Extraído / Manual
                                            </label>
                                            <textarea
                                                className="flex-1 p-4 rounded-xl border border-border bg-background text-foreground font-mono text-xs resize-none focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                placeholder="O pega tu texto aquí..."
                                                value={text}
                                                onChange={(e) => setText(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Metadata Column */}
                                    <div className="space-y-4 bg-muted/20 p-4 rounded-xl border border-border">
                                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                            <LucideInfo className="w-4 h-4 text-blue-400" />
                                            Datos del Documento (Opcional)
                                        </label>

                                        <div className="space-y-3">
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-[11px] font-medium text-muted-foreground ml-1 flex items-center gap-1">
                                                    <LucideBriefcase className="w-3 h-3" /> Proyecto
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background"
                                                    placeholder="ID del Proyecto..."
                                                    value={metadata.projectId}
                                                    onChange={(e) => setMetadata({ ...metadata, projectId: e.target.value })}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[11px] font-medium text-muted-foreground ml-1 flex items-center gap-1">
                                                        <LucideHash className="w-3 h-3" /> Versión
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background"
                                                        placeholder="v1.0..."
                                                        value={metadata.version}
                                                        onChange={(e) => setMetadata({ ...metadata, version: e.target.value })}
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[11px] font-medium text-muted-foreground ml-1 flex items-center gap-1">
                                                        <LucideUser className="w-3 h-3" /> Cliente
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-background"
                                                        placeholder="Nombre del cliente..."
                                                        value={metadata.client}
                                                        onChange={(e) => setMetadata({ ...metadata, client: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2 py-2">
                                                <button
                                                    onClick={() => setMetadata({ ...metadata, isDraft: !metadata.isDraft })}
                                                    className={`px-3 py-1 rounded-full text-[10px] font-medium border transition-colors ${metadata.isDraft ? 'bg-orange-500/20 border-orange-500/50 text-orange-600' : 'bg-background border-border text-muted-foreground'}`}
                                                >
                                                    Borrador
                                                </button>
                                                <button
                                                    onClick={() => setMetadata({ ...metadata, isPartDraft: !metadata.isPartDraft })}
                                                    className={`px-3 py-1 rounded-full text-[10px] font-medium border transition-colors ${metadata.isPartDraft ? 'bg-amber-500/20 border-amber-500/50 text-amber-600' : 'bg-background border-border text-muted-foreground'}`}
                                                >
                                                    Fracción
                                                </button>
                                                <button
                                                    onClick={() => setMetadata({ ...metadata, isSource: !metadata.isSource })}
                                                    className={`px-3 py-1 rounded-full text-[10px] font-medium border transition-colors ${metadata.isSource ? 'bg-blue-500/20 border-blue-500/50 text-blue-600' : 'bg-background border-border text-muted-foreground'}`}
                                                >
                                                    Fuente
                                                </button>
                                                <button
                                                    onClick={() => setMetadata({ ...metadata, isRegulation: !metadata.isRegulation })}
                                                    className={`px-3 py-1 rounded-full text-[10px] font-medium border transition-colors ${metadata.isRegulation ? 'bg-purple-500/20 border-purple-500/50 text-purple-600' : 'bg-background border-border text-muted-foreground'}`}
                                                >
                                                    Normativa
                                                </button>
                                                <button
                                                    onClick={() => setMetadata({ ...metadata, isTemplate: !metadata.isTemplate })}
                                                    className={`px-3 py-1 rounded-full text-[10px] font-medium border transition-colors ${metadata.isTemplate ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-600' : 'bg-background border-border text-muted-foreground'}`}
                                                >
                                                    Plantilla
                                                </button>
                                                <button
                                                    onClick={() => setMetadata({ ...metadata, isMandatory: !metadata.isMandatory })}
                                                    className={`px-3 py-1 rounded-full text-[10px] font-medium border transition-colors ${metadata.isMandatory ? 'bg-red-500/20 border-red-500/50 text-red-600' : 'bg-background border-border text-muted-foreground'}`}
                                                >
                                                    Obligatorio
                                                </button>
                                            </div>

                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-[11px] font-medium text-muted-foreground ml-1 flex items-center gap-1">
                                                    <LucideClipboard className="w-3 h-3" /> Notas / Comentarios
                                                </label>
                                                <textarea
                                                    className="w-full h-20 px-3 py-2 text-xs rounded-lg border border-border bg-background resize-none"
                                                    placeholder="Añade notas adicionales..."
                                                    value={metadata.comments}
                                                    onChange={(e) => setMetadata({ ...metadata, comments: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <label className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                        <LucideSparkles className="w-4 h-4 text-primary" />
                                        Instrucciones para la IA (Opcional)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            className="w-full pl-4 pr-12 py-3 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none shadow-inner"
                                            placeholder='Ej: "Divide por artículos y extrae solo las cláusulas de rescisión"'
                                            value={instructions}
                                            onChange={(e) => setInstructions(e.target.value)}
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary/10 rounded p-1">
                                            <LucideSparkles className="w-4 h-4 text-primary" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {/* Analysis View */}
                        {step === 'analysis' && analysis && (
                            <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
                                {/* Report Card */}
                                <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-xs font-medium border border-blue-500/20">
                                            {analysis.topic}
                                        </span>
                                        <span className="text-xs text-muted-foreground">{analysis.structure.pattern}</span>
                                    </div>

                                    <h3 className="font-semibold text-lg text-foreground">Resumen del Documento</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {analysis.summary}
                                    </p>

                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {analysis.tags.map(tag => (
                                            <span key={tag} className="px-2 py-1 rounded bg-secondary text-secondary-foreground text-xs flex items-center gap-1">
                                                <LucideTag className="w-3 h-3" /> {tag}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-border">
                                        <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 text-foreground">
                                            <LucideLayers className="w-4 h-4 text-purple-500" />
                                            Estructura Detectada
                                        </h4>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            {analysis.structure.hierarchy.map((level, i) => (
                                                <React.Fragment key={i}>
                                                    {i > 0 && <span>→</span>}
                                                    <span className="bg-background px-2 py-1 rounded border border-border">{level}</span>
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Strategy Control */}
                                <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-semibold text-primary flex items-center gap-2">
                                            <LucideSparkles className="w-4 h-4" />
                                            Estrategia de División Recomendada
                                        </h3>
                                    </div>
                                    <p className="text-sm text-foreground mb-3 font-medium">
                                        {analysis.recommendation.strategy}
                                    </p>
                                    <p className="text-xs text-muted-foreground mb-4">
                                        {analysis.recommendation.reasoning}
                                    </p>

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-foreground">Instrucciones para el Agente (Editables)</label>
                                        <textarea
                                            value={instructions}
                                            onChange={(e) => setInstructions(e.target.value)}
                                            className="w-full h-24 p-3 rounded-lg bg-background border border-border text-xs font-mono resize-none focus:ring-2 focus:ring-primary/20 outline-none"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleGenerateBlocks}
                                    disabled={isLoading}
                                    className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <LucideLoader2 className="w-5 h-5 animate-spin" />
                                            Generando Bloques...
                                        </>
                                    ) : (
                                        <>
                                            <LucideLayers className="w-5 h-5" />
                                            Aplicar Estrategia y Dividir
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {step === 'preview' && (
                            <>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold">Vista Previa de Bloques</h3>
                                    <button
                                        onClick={() => setStep('analysis')}
                                        className="text-sm text-primary hover:underline"
                                    >
                                        ← Volver
                                    </button>
                                </div>

                                <div className="flex-1 overflow-auto space-y-3">
                                    {items.map((item, idx) => (
                                        <div key={item.id} className="p-4 border border-border rounded-lg bg-background hover:border-primary/30 transition-colors">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-sm text-foreground mb-1">{item.title}</h4>
                                                    <div
                                                        className="text-xs text-muted-foreground line-clamp-2"
                                                        dangerouslySetInnerHTML={{ __html: item.content.slice(0, 200) + '...' }}
                                                    />
                                                </div>
                                                <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary font-medium">
                                                    {item.target === 'active_version' ? 'Doc' : 'Ref'}
                                                </span>
                                            </div>
                                            {item.children && (
                                                <div className="mt-2 ml-4 text-xs text-muted-foreground">
                                                    + {item.children.length} sub-bloques
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={handleImport}
                                    disabled={isLoading}
                                    className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <LucideLoader2 className="w-5 h-5 animate-spin" />
                                            Importando...
                                        </>
                                    ) : (
                                        <>
                                            <LucideCheck className="w-5 h-5" />
                                            Importar {items.length} Bloques
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </div>

                    {/* Right: AI Chat */}
                    <div className="w-96 flex flex-col p-6 bg-muted/30">
                        <h3 className="text-sm font-semibold text-foreground mb-4">Chat con la IA</h3>

                        <div className="flex-1 overflow-auto space-y-3 mb-4">
                            {chatMessages.length === 0 ? (
                                <div className="text-center text-sm text-muted-foreground p-4">
                                    <LucideSparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>Pregunta sobre tu documento</p>
                                    <p className="text-xs mt-2">Ej: "¿De qué trata?" o "Resume esto"</p>
                                </div>
                            ) : (
                                chatMessages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-3 rounded-lg text-sm ${msg.role === 'user'
                                            ? 'bg-primary text-primary-foreground ml-8'
                                            : 'bg-card border border-border mr-8'
                                            }`}
                                    >
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                ))
                            )}
                            {isChatting && (
                                <div className="p-3 rounded-lg bg-card border border-border mr-8 flex items-center gap-2">
                                    <LucideLoader2 className="w-4 h-4 animate-spin text-primary" />
                                    <span className="text-sm text-muted-foreground">Pensando...</span>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                placeholder="Escribe tu pregunta..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleChat()}
                                disabled={isChatting || !text.trim()}
                            />
                            <button
                                onClick={handleChat}
                                disabled={!chatInput.trim() || isChatting}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <LucideSend className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
