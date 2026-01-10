'use client';

import React, { useState, useEffect } from 'react';
import { aiAgent } from '@/lib/ai/agent';
import { supabase } from '@/lib/supabase/client';
import { importItems } from '@/actions/documents';
import { ImportItem, SplitStrategy } from '@/lib/ai/types';
import { analyzeText, StyleAnalysis } from '@/lib/ai/style-analyzer';
import { StyleMapper } from './style-mapper';
import { StyleMapping, transformContent } from '@/lib/ai/style-transformer';
import * as mammoth from 'mammoth';
import { LucideFileText, LucideUpload, LucideLoader2, LucideMousePointer2, LucideLayout, LucideCode, LucideSparkles, LucideLayers, LucideList, LucideRows3, ArrowDownToLine as LucideArrowDownToLine, MessageSquare as LucideMessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Hook for debouncing values
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

// Configure PDF.js worker dynamically to avoid SSR issues
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

type WizardStep = 'input' | 'configure' | 'styles' | 'preview';

export function AIImportWizard({ documentId, projectId, onClose, onSuccess }: AIImportWizardProps) {
    const [step, setStep] = useState<WizardStep>('input');
    const [text, setText] = useState('');
    const [strategy, setStrategy] = useState<SplitStrategy>('header');
    const [headerLevel, setHeaderLevel] = useState(2);
    const [analysis, setAnalysis] = useState<StyleAnalysis | null>(null);
    const [items, setItems] = useState<ImportItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [preserveStyles, setPreserveStyles] = useState(false);
    const [styleMappings, setStyleMappings] = useState<StyleMapping[]>([]);

    // Advanced options
    const [isGeneratingPatterns, setIsGeneratingPatterns] = useState(false);
    const [isProcessingFile, setIsProcessingFile] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [selection, setSelection] = useState({ start: 0, end: 0 });
    const [viewMode, setViewMode] = useState<'raw' | 'preview'>('preview');
    const [configTab, setConfigTab] = useState<'blocks' | 'subblocks'>('blocks');

    // Block configuration state
    const [blockStrategy, setBlockStrategy] = useState<SplitStrategy>('header');
    const [blockCustomPattern, setBlockCustomPattern] = useState('^#\\s+.+');
    const [blockHeaderLevel, setBlockHeaderLevel] = useState(1);
    const [blockSplittingExamples, setBlockSplittingExamples] = useState('');

    // Sub-block configuration state
    const [subStrategy, setSubStrategy] = useState<SplitStrategy>('manual');
    const [subCustomPattern, setSubCustomPattern] = useState('');
    const [subHeaderLevel, setSubHeaderLevel] = useState(2);
    const [subSplittingExamples, setSubSplittingExamples] = useState('');

    const [isHierarchical, setIsHierarchical] = useState(false);
    const [selectedBlockIndex, setSelectedBlockIndex] = useState(0);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set());
    const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge');
    const [hasExistingBlocks, setHasExistingBlocks] = useState(false);
    const [defaultTarget, setDefaultTarget] = useState<'active_version' | 'version' | 'linked_ref' | 'unlinked_ref' | 'note'>('active_version');

    // AI Chat State
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatThinking, setIsChatThinking] = useState(false);

    // Debounce text for heavy analysis
    const debouncedText = useDebounce(text, 500); // 500ms delay

    // Analyze text when it changes (debounced)
    useEffect(() => {
        if (debouncedText.trim()) {
            // Processing is now lighter due to sampling in analyzeText
            const result = analyzeText(debouncedText);
            setAnalysis(result);
            // Only auto-select if we haven't manually set one and it's a fresh analysis
            if (result.headerLevels.length > 0 && blockStrategy === 'header') {
                setBlockHeaderLevel(result.headerLevels[0]);
            }
        } else {
            setAnalysis(null);
        }
    }, [debouncedText, blockStrategy]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) await processFile(file);
    };

    const processFile = async (file: File) => {
        setIsProcessingFile(true);
        try {
            const extension = file.name.split('.').pop()?.toLowerCase();
            let extractedText = '';

            if (extension === 'txt') {
                extractedText = await file.text();
            } else if (extension === 'docx') {
                const arrayBuffer = await file.arrayBuffer();
                // Configure mammoth to ignore images completely to avoid base64 soup
                const options = {
                    ignoreImage: true,
                    // MAP NATIVE WORD STYLES TO MARKDOWN HEADERS
                    styleMap: [
                        "p[style-name='Título 1'] => h1:fresh",
                        "p[style-name='Título 2'] => h2:fresh",
                        "p[style-name='Título 3'] => h3:fresh",
                        "p[style-name='Título 4'] => h4:fresh",
                        "p[style-name='Título 5'] => h5:fresh",
                        "p[style-name='Título 6'] => h6:fresh",
                        "p[style-name='Heading 1'] => h1:fresh",
                        "p[style-name='Heading 2'] => h2:fresh",
                        "p[style-name='Heading 3'] => h3:fresh",
                        "p[style-name='Heading 4'] => h4:fresh",
                        "p[style-name='Heading 5'] => h5:fresh",
                        "p[style-name='Heading 6'] => h6:fresh",
                        "p[style-name='Encabezado 1'] => h1:fresh",
                        "p[style-name='Encabezado 2'] => h2:fresh",
                        "p[style-name='Subtitle'] => h2:fresh",
                        "p[style-name='Subtítulo'] => h2:fresh",
                        "p[style-name='Quote'] => blockquote:fresh",
                        "p[style-name='Cita'] => blockquote:fresh"
                    ],
                    transformDocument: (element: any) => {
                        if (element.type === "image") {
                            return [];
                        }
                        return element;
                    }
                };

                // Use convertToHtml to preserve formatting (Bold, Italic, Tables) for high visual quality.
                // The Editor (Tiptap) handles HTML perfectly.
                const result = await mammoth.convertToHtml({ arrayBuffer }, options);

                // Basic HTML cleanup
                extractedText = result.value
                    // CRITICAL: Remove all img tags to prevent base64 "gibberish"
                    .replace(/<img[^>]*>/gi, '')
                    // Remove any remaining data:image patterns just in case
                    .replace(/src="data:image\/[^"]*"/gi, '')
                    // Remove empty paragraphs
                    .replace(/<p>\s*<\/p>/g, '')
                    // Remove excessive newlines if plain text mode interferes, but HTML handles it via tags
                    .trim();

                // Add a marker to indicate this is HTML content so key extractors know?
                // Or just rely on tag detection.
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
            } else {
                alert('Formato de archivo no soportado. Usa .docx, .pdf o .txt');
                return;
            }

            if (extractedText) {
                // Final cleanup of excessive newlines regardless of source
                extractedText = extractedText.replace(/\n{3,}/g, '\n\n').trim();
                setText(extractedText);
            }
        } catch (error) {
            console.error('Error processing file:', error);
            alert('Error al procesar el archivo');
        } finally {
            setIsProcessingFile(false);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const html = e.clipboardData.getData('text/html');
        if (html) {
            // Basic conversion from HTML (Word/Web) to Markdown
            let converted = html;
            // Clean up Word junk
            converted = converted.replace(/<(style|script|meta|link)[^>]*>[\s\S]*?<\/\1>/gi, '');
            // Headers
            converted = converted.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n');
            converted = converted.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n');
            converted = converted.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n');
            converted = converted.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n');
            converted = converted.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n');
            converted = converted.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n');
            // Bold & Italic
            converted = converted.replace(/<(b|strong)[^>]*>(.*?)<\/\1>/gi, '**$2**');
            converted = converted.replace(/<(i|em)[^>]*>(.*?)<\/\1>/gi, '*$2*');
            // Paragraphs and breaks
            converted = converted.replace(/<(p|div)[^>]*>/gi, '\n');
            converted = converted.replace(/<\/(p|div)>|<br[^>]*>/gi, '\n');
            // Strip remaining tags
            converted = converted.replace(/<[^>]*>/g, '');
            // Unescape HTML entities
            const txt = document.createElement('textarea');
            txt.innerHTML = converted;
            converted = txt.value;

            // If we actually found markdown-like structure, use it. Otherwise fall back to plain text
            if (converted.includes('#') || converted.includes('**') || converted.includes('*')) {
                e.preventDefault();
                setText(converted.trim());
                return;
            }
        }
    };


    const generatePreview = async () => {
        setIsLoading(true);
        try {
            let result = await aiAgent.processText(text, blockStrategy, {
                headerLevel: blockHeaderLevel,
                customPattern: blockCustomPattern,
                isHierarchical: false,
                indexText: blockStrategy === 'index' ? blockSplittingExamples : undefined
            });

            // Step 2: Split each block into sub-blocks if hierarchy is enabled
            if (isHierarchical) {
                result = await Promise.all(result.map(async (block) => {
                    const children = await aiAgent.processText(block.content, subStrategy, {
                        headerLevel: subHeaderLevel,
                        customPattern: subCustomPattern,
                        isHierarchical: false, // Recursive call for sub-blocks
                        // CRITICAL: Pass the subSplittingExamples as indexText if subStrategy is 'index'
                        indexText: subStrategy === 'index' ? subSplittingExamples : undefined
                    });

                    // If sub-splitting happened, the first sub-block might contain the parent header if not handled correctly
                    // But AIAgent.processText usually returns blocks. We'll nest them.
                    return {
                        ...block,
                        children: children.length > 1 ? children : undefined
                    };
                }));
            }

            // Apply style transformations recursively
            const applyTransformations = (itemsList: ImportItem[]): ImportItem[] => {
                return itemsList.map(item => ({
                    ...item,
                    content: transformContent(item.content, styleMappings, preserveStyles),
                    title: transformContent(item.title, styleMappings, preserveStyles),
                    children: item.children ? applyTransformations(item.children) : undefined
                }));
            };

            if (!preserveStyles && styleMappings.length > 0) {
                result = applyTransformations(result);
            }

            setItems(result);
            setStep('preview');
        } catch (e) {
            console.error(e);
            alert('Error analyzing text');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSplitBySelection = async () => {
        const selText = viewMode === 'raw'
            ? text.substring(selection.start, selection.end).trim()
            : (blockSplittingExamples || subSplittingExamples);

        if (!selText) {
            alert('Por favor, selecciona primero un fragmento de texto.');
            return;
        }

        setIsGeneratingPatterns(true);
        const patterns = await aiAgent.generatePatternsFromExamples(selText);

        if (configTab === 'blocks' || step === 'input') {
            setBlockSplittingExamples(selText);
            setBlockStrategy('custom');
            setBlockCustomPattern(patterns.parentPattern);
            if (step === 'input') setStep('configure');
        } else {
            setSubSplittingExamples(selText);
            setSubStrategy('custom');
            setSubCustomPattern(patterns.parentPattern);
        }

        setIsGeneratingPatterns(false);
    };

    const handleTextareaSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
        const target = e.target as HTMLTextAreaElement;
        setSelection({ start: target.selectionStart, end: target.selectionEnd });
    };

    const handlePreviewSelect = () => {
        const sel = window.getSelection();
        const selectedText = sel?.toString().trim();
        if (selectedText) {
            if (configTab === 'blocks' || step === 'input') {
                setBlockSplittingExamples(selectedText);
            } else {
                setSubSplittingExamples(selectedText);
            }
        }
    };

    const humanizePattern = (pattern: string, currentStrategy: string, currentLevel: number) => {
        if (!pattern) return 'Ninguno';
        if (currentStrategy === 'header') return `Títulos de nivel ${currentLevel} (#)`;
        if (pattern.startsWith('^#')) {
            const hashes = pattern.match(/#+/)?.[0].length || 1;
            return `Encabezados de nivel ${hashes} (#)`;
        }
        if (pattern.includes('\\d+\\.')) return 'Numeración secuencial (1., 2.)';
        if (pattern.includes('[A-Z]')) return 'Títulos en MAYÚSCULAS';
        if (currentStrategy === 'semantic') return 'Inteligencia Artificial (Temas)';
        if (pattern === 'SMART_NUMBERING') return 'Secuencia Inteligente (1, 2, 3...)';
        return pattern;
    };

    const getMatchesForText = (sourceText: string, pattern: string) => {
        if (!sourceText || !pattern) return [];
        try {
            const regex = new RegExp(pattern, 'gm');
            const matches = sourceText.match(regex);
            return matches?.map(m => m.trim()) || [];
        } catch (e) {
            return [];
        }
    };

    const canProceed = () => {
        if (step === 'input') return text.trim().length > 0;
        if (step === 'configure') {
            if (configTab === 'blocks') {
                if (blockStrategy === 'header' && analysis) {
                    return analysis.headerLevels.includes(blockHeaderLevel);
                }
                if (blockStrategy === 'custom') {
                    return blockCustomPattern.trim().length > 0;
                }
                return true;
            } else {
                if (subStrategy === 'header' && analysis) {
                    return analysis.headerLevels.includes(subHeaderLevel);
                }
                if (subStrategy === 'custom') {
                    return subCustomPattern.trim().length > 0;
                }
                return true;
            }
        }
        return true;
    };


    const handleChatSubmit = async (msg: string, context: 'blocks' | 'subblocks' = 'blocks') => {
        if (!msg.trim()) return;

        // If it's subblocks, we don't have a full chat UI state yet, just one-off interactions
        // But for consistency let's use the agent.
        if (context === 'subblocks') {
            const result = await aiAgent.chat(msg, {
                strategy: subStrategy,
                currentPattern: subStrategy === 'index' ? subSplittingExamples : subCustomPattern,
                textPreview: text.slice(0, 1000), // Smaller preview for sub-blocks context roughly
                isSubBlock: true
            });

            if (result.action) {
                if (result.action.type === 'set_pattern') {
                    setSubStrategy('custom');
                    setSubCustomPattern(result.action.value);
                    alert(result.reply); // Simple feedback for now as we don't have a chat history for sub-blocks
                } else if (result.action.type === 'set_index') {
                    setSubStrategy('index');
                    setSubSplittingExamples(result.action.value);
                    alert(result.reply);
                }
            } else {
                alert(result.reply);
            }
            return;
        }

        // Logic for blocks (main chat) is currently inline in JSX, 
        // eventually we should move it here but for now I'm only fixing the missing function ref
        // and supporting subblocks.
    };

    const handleNext = async () => {
        if (step === 'input') {
            setStep('configure');
        } else if (step === 'configure') {
            // Check if we have styles to map
            if (analysis && analysis.textStyles.length > 0 && blockStrategy !== 'semantic') {
                setStep('styles');
            } else {
                // Skip styles step if no styles or using semantic
                await generatePreview();
            }
        } else if (step === 'styles') {
            await generatePreview();
            // Check for existing blocks when entering preview
            const { count, error } = await supabase
                .from('document_blocks')
                .select('*', { count: 'exact', head: true })
                .eq('document_id', documentId);

            if (!error && count && count > 0) {
                setHasExistingBlocks(true);
            } else {
                setHasExistingBlocks(false);
            }
        }
    };


    const handleImport = async () => {
        setIsLoading(true);
        try {
            const res = await importItems(projectId, documentId, items, importMode);
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

    const updateItemRecursive = (itemsList: ImportItem[], id: string, updates: Partial<ImportItem>): void => {
        const found = itemsList.find(i => i.id === id);
        if (found) {
            Object.assign(found, updates);
            setItems([...items]);
            return;
        }
        for (const item of itemsList) {
            if (item.children) updateItemRecursive(item.children, id, updates);
        }
    };

    const toggleExpand = (id: string) => {
        const next = new Set(expandedItemIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedItemIds(next);
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedItemIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedItemIds(next);
    };

    const expandAll = () => {
        const ids = new Set<string>();
        const collect = (list: ImportItem[]) => {
            list.forEach(i => {
                if (i.children?.length) {
                    ids.add(i.id);
                    collect(i.children);
                }
            });
        };
        collect(items);
        setExpandedItemIds(ids);
    };

    const collapseAll = () => setExpandedItemIds(new Set());

    const deleteSelected = () => {
        const filterRecursive = (list: ImportItem[]): ImportItem[] => {
            return list
                .filter(i => !selectedItemIds.has(i.id))
                .map(i => ({
                    ...i,
                    children: i.children ? filterRecursive(i.children) : undefined
                }));
        };
        setItems(filterRecursive(items));
        setSelectedItemIds(new Set());
    };

    const mergeSelected = () => {
        if (selectedItemIds.size < 2) return;

        let mergedContent = '';
        let firstItem: ImportItem | null = null;

        const findAndCollect = (list: ImportItem[]) => {
            list.forEach(i => {
                if (selectedItemIds.has(i.id)) {
                    if (!firstItem) firstItem = i;
                    mergedContent += (mergedContent ? '\n\n' : '') + i.content;
                }
                if (i.children) findAndCollect(i.children);
            });
        };

        findAndCollect(items);

        if (firstItem) {
            const updateRecursive = (list: ImportItem[]): ImportItem[] => {
                const newList = list.filter(i => !selectedItemIds.has(i.id) || i.id === (firstItem as ImportItem).id);
                return newList.map(i => {
                    if (i.id === (firstItem as ImportItem).id) {
                        return { ...i, content: mergedContent };
                    }
                    return {
                        ...i,
                        children: i.children ? updateRecursive(i.children) : undefined
                    };
                });
            };
            setItems(updateRecursive(items));
        }
        setSelectedItemIds(new Set());
    };

    const getAllItemsCount = (list: ImportItem[]): number => {
        let count = 0;
        list.forEach(i => {
            count++;
            if (i.children) count += getAllItemsCount(i.children);
        });
        return count;
    };

    const renderPreviewItems = (itemsList: ImportItem[], depth = 0) => {
        return itemsList.map((item) => {
            const isSelected = selectedItemIds.has(item.id);
            const isExpanded = expandedItemIds.has(item.id);
            const hasChildren = item.children && item.children.length > 0;

            return (
                <React.Fragment key={item.id}>
                    <div className={`p-4 rounded-lg border transition-all ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border bg-card'} group ${depth > 0 ? 'ml-6 border-l-4 border-l-primary/30' : ''}`}>
                        <div className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(item.id)}
                                className="mt-1 w-4 h-4 accent-primary cursor-pointer"
                            />
                            {hasChildren && (
                                <button
                                    onClick={() => toggleExpand(item.id)}
                                    className="mt-1 p-0.5 hover:bg-muted rounded transition-colors"
                                >
                                    <LucideList className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                </button>
                            )}
                            <div className="flex-1 space-y-2">
                                <input
                                    value={item.title}
                                    onChange={(e) => updateItemRecursive(items, item.id, { title: e.target.value })}
                                    className="w-full bg-transparent font-medium text-foreground focus:outline-none focus:underline"
                                />
                                <div className="prose prose-sm max-w-none text-muted-foreground line-clamp-2">
                                    <div dangerouslySetInnerHTML={{ __html: item.content }} />
                                </div>
                            </div>
                            <select
                                value={item.target}
                                onChange={(e) => updateItemRecursive(items, item.id, { target: e.target.value as any })}
                                className="text-xs h-8 px-2 rounded border border-border bg-background text-foreground"
                            >
                                <option value="active_version">Documento Activo</option>
                                <option value="version">Nueva Versión</option>
                                <option value="linked_ref">Ref. Vinculada</option>
                                <option value="unlinked_ref">Ref. Externa</option>
                                <option value="note">Nota</option>
                            </select>
                        </div>
                    </div>
                    {hasChildren && isExpanded && renderPreviewItems(item.children || [], depth + 1)}
                </React.Fragment>
            );
        });
    };


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-[1100px] h-[780px] bg-card rounded-xl shadow-2xl overflow-hidden flex flex-col border border-border relative">

                {/* Header */}
                <div className="h-14 border-b border-border flex items-center px-6 justify-between bg-muted/50">
                    <div className="flex items-center gap-3">
                        <span className="text-primary text-xl">✨</span>
                        <div>
                            <h2 className="font-semibold text-foreground">AI Import Assistant</h2>
                            <p className="text-xs text-muted-foreground">
                                {step === 'input' && 'Paso 1: Pegar contenido'}
                                {step === 'configure' && 'Paso 2: Configurar división'}
                                {step === 'styles' && 'Paso 3: Mapear estilos'}
                                {step === 'preview' && 'Paso 4: Vista previa'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                        ✕
                    </button>
                </div>

                {/* Progress Indicator */}
                <div className="h-1 bg-muted">
                    <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{
                            width: step === 'input' ? '25%' :
                                step === 'configure' ? '50%' :
                                    step === 'styles' ? '75%' : '100%'
                        }}
                    />
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 flex flex-col p-6 overflow-hidden">
                    {step === 'input' && (
                        <div className="space-y-6 h-full flex flex-col">
                            <div className="flex-1 space-y-4 flex flex-col min-h-0">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                        <LucideLayout className="w-4 h-4 text-primary" />
                                        Sube un archivo o pega tu contenido
                                    </label>
                                    <div className="flex items-center gap-3">
                                        {/* Global Target Selector */}
                                        <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-lg border border-border">
                                            <span className="text-[10px] font-bold uppercase text-muted-foreground">Destino:</span>
                                            <select
                                                className="bg-transparent text-xs font-medium text-foreground outline-none cursor-pointer"
                                                value={defaultTarget}
                                                onChange={(e) => setDefaultTarget(e.target.value as any)}
                                            >
                                                <option value="active_version" className="text-black dark:text-white bg-white dark:bg-zinc-800">Documento Activo</option>
                                                <option value="version" className="text-black dark:text-white bg-white dark:bg-zinc-800">Nueva Versión</option>
                                                <option value="note" className="text-black dark:text-white bg-white dark:bg-zinc-800">Notas</option>
                                                <option value="linked_ref" className="text-black dark:text-white bg-white dark:bg-zinc-800">Referencias</option>
                                            </select>
                                        </div>

                                        <div className="flex bg-muted rounded-lg p-1">
                                            <button
                                                onClick={() => setViewMode('raw')}
                                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'raw' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <LucideCode className="w-3 h-3" />
                                                    Markdown Raw
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => setViewMode('preview')}
                                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'preview' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <LucideFileText className="w-3 h-3" />
                                                    Vista Previa
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-5 gap-6 flex-1 min-h-0">
                                    {/* Text Area / Preview */}
                                    <div className="col-span-3 flex flex-col min-h-0">
                                        {viewMode === 'raw' ? (
                                            <div className="flex-1 flex flex-col relative">
                                                <textarea
                                                    className="w-full flex-1 p-4 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-none resize-none font-mono text-sm leading-relaxed"
                                                    placeholder="Pega texto aquí o usa la zona de la derecha para subir un documento (.docx, .pdf, .txt)..."
                                                    value={text}
                                                    spellCheck={false} // Disable spellcheck for performance
                                                    onPaste={handlePaste}
                                                    onSelect={handleTextareaSelect}
                                                    onChange={(e) => setText(e.target.value)}
                                                />
                                                {selection.end > selection.start && (
                                                    <div className="absolute top-4 right-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                                        <button
                                                            onClick={handleSplitBySelection}
                                                            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-bold shadow-lg hover:scale-105 transition-transform"
                                                        >
                                                            <LucideMousePointer2 className="w-3 h-3" />
                                                            Dividir por Selección
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex flex-col relative group min-h-0">
                                                <div
                                                    className="flex-1 p-6 rounded-xl border border-border bg-background overflow-auto prose prose-sm max-w-none scrollbar-thin scrollbar-thumb-primary/20 break-words whitespace-pre-wrap"
                                                    onMouseUp={handlePreviewSelect}
                                                >
                                                    {text.trim().startsWith('<') ? (
                                                        <div dangerouslySetInnerHTML={{ __html: text }} />
                                                    ) : (
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                            {text.length > 50000 ? text.slice(0, 50000) + '\n\n*(Vista previa truncada por rendimiento...)*' : (text || '*El documento está vacío*')}
                                                        </ReactMarkdown>
                                                    )}
                                                </div>
                                                {(viewMode === 'preview' && (blockSplittingExamples || subSplittingExamples)) && (
                                                    <div className="absolute top-4 right-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                                        <button
                                                            onClick={handleSplitBySelection}
                                                            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-bold shadow-lg hover:scale-105 transition-transform"
                                                        >
                                                            <LucideMousePointer2 className="w-3 h-3" />
                                                            Dividir por Selección
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Upload Zone & Analysis */}
                                    <div className="col-span-2 flex flex-col gap-4 min-h-0">
                                        <div
                                            onDragOver={(e) => {
                                                if (text) return; // Prevent drag if loaded
                                                e.preventDefault();
                                                setIsDragging(true);
                                            }}
                                            onDragLeave={() => setIsDragging(false)}
                                            onDrop={async (e) => {
                                                if (text) return; // Prevent drop if loaded
                                                e.preventDefault();
                                                setIsDragging(false);
                                                const file = e.dataTransfer.files?.[0];
                                                if (file) await processFile(file);
                                            }}
                                            className={`h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-4 text-center transition-all ${text
                                                ? 'border-border/50 bg-muted/10 opacity-50 grayscale pointer-events-none' // Disabled state
                                                : isDragging
                                                    ? 'border-primary bg-primary/10 scale-[0.98]'
                                                    : 'border-border hover:border-primary/50 bg-muted/30 hover:bg-muted/50'
                                                }`}
                                        >
                                            {isProcessingFile ? (
                                                <div className="space-y-2">
                                                    <LucideLoader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                                                    <p className="text-xs font-medium text-foreground">Procesando archivo...</p>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-3 w-full px-4">
                                                    <div className="text-center">
                                                        <p className="text-xs font-bold text-foreground">
                                                            {text ? 'Archivo cargado' : 'Pincha o arrastra un archivo'}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground mt-0.5">DOCX, PDF, TXT</p>
                                                    </div>

                                                    {!text && (
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                                <LucideArrowDownToLine className="w-4 h-4 text-primary" />
                                                            </div>
                                                            <input
                                                                type="file"
                                                                accept=".docx,.pdf,.txt"
                                                                onChange={handleFileChange}
                                                                className="hidden"
                                                                id="file-upload"
                                                            />
                                                            <label
                                                                htmlFor="file-upload"
                                                                className="px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg cursor-pointer hover:shadow-lg transition-all"
                                                            >
                                                                Seleccionar Archivo
                                                            </label>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {analysis && analysis.hasContent && (
                                            <div className="flex-1 bg-card rounded-2xl border border-border overflow-hidden flex flex-col shadow-sm">
                                                <div className="pl-4 pr-3 py-3 bg-primary/5 border-b border-border flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-primary">
                                                        <LucideFileText className="w-4 h-4" />
                                                        <span className="text-xs font-bold tracking-wider uppercase">Análisis del Documento</span>
                                                    </div>
                                                    <div className="px-2 py-0.5 rounded-full bg-primary/10 text-[10px] font-bold text-primary">IA ACTIVA</div>
                                                </div>
                                                <div className="p-5 flex-1 flex flex-col gap-5 overflow-hidden">
                                                    <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-5">
                                                        <div>
                                                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2 tracking-widest">Estructura Detectada</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {analysis.headerLevels.length > 0 ? (
                                                                    analysis.headerLevels.map(level => (
                                                                        <span key={level} className="px-2.5 py-1 rounded bg-background border border-border text-xs font-mono">
                                                                            H{level}: <span className="text-primary font-bold">{analysis.estimatedBlocks[level] || 0}</span>
                                                                        </span>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground italic">No detectada</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2 tracking-widest">Tipos de Contenido</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {analysis.textStyles.length > 0 ? (
                                                                    analysis.textStyles.map(style => (
                                                                        <span key={style.type} className="px-2.5 py-1 rounded bg-muted text-xs flex items-center gap-1.5">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-primary opacity-60" />
                                                                            {style.label}
                                                                        </span>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground italic">Texto plano</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 shrink-0">
                                                        <p className="text-[10px] font-bold text-primary/70 uppercase mb-2">Recomendación de División</p>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <span className="text-[10px] text-muted-foreground block mb-1 uppercase tracking-wide">Bloques</span>
                                                                <p className="text-sm font-bold text-foreground">
                                                                    {analysis.headerLevels.length > 0
                                                                        ? (analysis.headerLevels[0] === 1 ? 'Capítulos (H1)' : `Secciones (H${analysis.headerLevels[0]})`)
                                                                        : 'Manual / Patrones'
                                                                    }
                                                                </p>
                                                            </div>
                                                            <div className="border-l border-primary/10 pl-4">
                                                                <span className="text-[10px] text-muted-foreground block mb-1 uppercase tracking-wide">Sub-bloques</span>
                                                                <p className="text-sm font-bold text-foreground">
                                                                    {analysis.headerLevels.length > 1
                                                                        ? `Secciones (H${analysis.headerLevels[1]})`
                                                                        : 'Personalizado'
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-5 gap-3">
                                <button
                                    onClick={() => setBlockStrategy('header')}
                                    disabled={!analysis || analysis.headerLevels.length === 0}
                                    className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center text-center transition-all ${blockStrategy === 'header'
                                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                                        : 'border-border hover:border-primary/50'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    <div className="font-bold text-sm text-foreground mb-0.5">Por Encabezado</div>
                                    <div className="text-xs text-muted-foreground">Basado en títulos #</div>
                                </button>
                                <button
                                    onClick={() => setBlockStrategy('semantic')}
                                    className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center text-center transition-all ${blockStrategy === 'semantic'
                                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                                        : 'border-border hover:border-primary/50'
                                        }`}
                                >
                                    <div className="text-primary font-bold text-sm flex items-center gap-1.5 mb-0.5">
                                        Por Tema (IA)
                                    </div>
                                    <div className="text-xs text-muted-foreground">Detección temática</div>
                                </button>
                                <button
                                    onClick={() => setBlockStrategy('custom')}
                                    className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center text-center transition-all ${blockStrategy === 'custom'
                                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                                        : 'border-border hover:border-primary/50'
                                        }`}
                                >
                                    <div className="font-bold text-sm text-foreground mb-0.5">Instrucciones</div>
                                    <div className="text-xs text-muted-foreground">Criterios manuales</div>
                                </button>
                                <button
                                    onClick={() => handleSplitBySelection()}
                                    className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center text-center transition-all ${blockStrategy === 'selection'
                                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                                        : 'border-border hover:border-primary/50'
                                        }`}
                                >
                                    <div className="font-bold text-sm text-foreground mb-0.5 flex items-center gap-1.5">
                                        <LucideMousePointer2 className="w-3.5 h-3.5" />
                                        Por Selección
                                    </div>
                                    <div className="text-xs text-muted-foreground">Usa el texto marcado</div>
                                </button>
                                <button
                                    onClick={() => setBlockStrategy('single')}
                                    className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center text-center transition-all ${blockStrategy === 'single'
                                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                                        : 'border-border hover:border-primary/50'
                                        }`}
                                >
                                    <div className="font-bold text-sm text-foreground mb-0.5">Un Solo Bloque</div>
                                    <div className="text-xs text-muted-foreground">Sin dividir</div>
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'configure' && analysis && (
                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            {/* Unified Configuration Header */}
                            <div className="flex items-center justify-between mb-6 border-b border-border pb-2 bg-muted/20 px-4 pt-4 rounded-t-xl">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setConfigTab('blocks')}
                                        className={`pb-2 text-sm font-bold transition-all border-b-2 px-2 ${configTab === 'blocks' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                                    >
                                        1. Configurar Bloques
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!isHierarchical) setIsHierarchical(true);
                                            setConfigTab('subblocks');
                                        }}
                                        className={`pb-2 text-sm font-bold transition-all border-b-2 px-2 flex items-center gap-2 ${configTab === 'subblocks' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                                    >
                                        2. Configurar Sub-bloques
                                        {!isHierarchical && <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted-foreground/20 text-muted-foreground">Opcional</span>}
                                    </button>
                                </div>

                                <div className="flex items-center gap-3 pr-2">
                                    <label className="text-xs font-medium text-foreground flex items-center gap-2 cursor-pointer bg-card px-3 py-1.5 rounded-lg border border-border hover:border-primary/50 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={isHierarchical}
                                            onChange={(e) => {
                                                setIsHierarchical(e.target.checked);
                                                if (e.target.checked) setConfigTab('subblocks');
                                                else setConfigTab('blocks');
                                            }}
                                            className="w-4 h-4 accent-primary rounded cursor-pointer"
                                        />
                                        <span className="flex items-center gap-1.5">
                                            <LucideSparkles className={`w-3.5 h-3.5 ${isHierarchical ? 'text-primary' : 'text-muted-foreground'}`} />
                                            Activar Sub-bloques
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex-1 grid grid-cols-5 gap-6 min-h-0 overflow-hidden px-1">
                                {/* Left Side: Configuration Options */}
                                <div className="col-span-3 space-y-6 overflow-auto pr-4 scrollbar-thin scrollbar-thumb-muted">
                                    {configTab === 'blocks' ? (
                                        <div className="space-y-6">
                                            <div className="space-y-4">
                                                <h4 className="text-sm font-bold uppercase text-muted-foreground">Estrategia de División de Bloques</h4>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button onClick={() => setBlockStrategy('header')} disabled={analysis.headerLevels.length === 0}
                                                        className={`p-4 rounded-xl border-2 text-left transition-all ${blockStrategy === 'header' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/20'} disabled:opacity-40 select-none`}>
                                                        <div className="font-bold text-sm">Por Encabezado</div>
                                                        <p className="text-xs text-muted-foreground mt-1">Usa los niveles # detectados en el Markdown.</p>
                                                    </button>
                                                    <button onClick={() => setBlockStrategy('custom')}
                                                        className={`p-4 rounded-xl border-2 text-left transition-all ${blockStrategy === 'custom' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/20'} select-none`}>
                                                        <div className="font-bold text-sm">Criterio Personalizado</div>
                                                        <p className="text-xs text-muted-foreground mt-1">Usa ejemplos o selecciones de texto.</p>
                                                    </button>
                                                    <button onClick={() => setBlockStrategy('index')}
                                                        className={`col-span-2 p-4 rounded-xl border-2 text-left transition-all ${blockStrategy === 'index' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/20'} select-none`}>
                                                        <div className="font-bold text-sm flex items-center gap-2">
                                                            <LucideList className="w-4 h-4 text-primary" />
                                                            Por Índice / Tabla de Contenidos
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-1">Pega el índice del documento y la IA lo dividirá siguiendo esa estructura.</p>
                                                    </button>
                                                </div>
                                            </div>

                                            {blockStrategy === 'header' && (
                                                <div className="grid grid-cols-3 gap-2">
                                                    {[1, 2, 3, 4, 5, 6].map(level => {
                                                        const isAvailable = analysis.headerLevels.includes(level);
                                                        const isSelected = blockHeaderLevel === level;
                                                        return (
                                                            <button
                                                                key={level}
                                                                onClick={() => setBlockHeaderLevel(level)}
                                                                disabled={!isAvailable}
                                                                className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${isSelected
                                                                    ? 'border-primary bg-primary/10 ring-2 ring-primary/20 shadow-sm z-10'
                                                                    : isAvailable
                                                                        ? 'border-border bg-card hover:border-primary/50 hover:bg-muted text-foreground'
                                                                        : 'border-border/50 bg-muted/20 opacity-40 grayscale cursor-not-allowed'
                                                                    }`}
                                                            >
                                                                <span className={`font-bold text-sm ${isSelected ? 'text-primary' : isAvailable ? 'text-foreground' : 'text-muted-foreground'}`}>H{level}</span>
                                                                <span className={`text-[10px] ${isSelected ? 'text-primary/80' : 'text-muted-foreground'}`}>
                                                                    {analysis.estimatedBlocks[level] || 0} bloques
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {(blockStrategy === 'custom' || blockStrategy === 'index') && (
                                                <div className="space-y-4 pt-4 border-t border-border animate-in fade-in slide-in-from-top-4">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-xs font-bold uppercase text-foreground">
                                                            {blockStrategy === 'index' ? 'Asistente de Índice IA' : 'Asistente de Patrones IA'}
                                                        </label>
                                                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">BETA</span>
                                                    </div>

                                                    {/* Chat Interface */}
                                                    <div className="bg-muted/30 rounded-xl border border-border overflow-hidden flex flex-col h-[340px]">
                                                        {/* Messages Area */}
                                                        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans">
                                                            {/* Initial System Message */}
                                                            <div className="flex gap-3">
                                                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                                                    <LucideSparkles className="w-3.5 h-3.5 text-primary" />
                                                                </div>
                                                                <div className="bg-card border border-border p-3 rounded-2xl rounded-tl-none text-xs leading-relaxed text-foreground shadow-sm">
                                                                    {blockStrategy === 'index'
                                                                        ? "Hola. Soy tu asistente de importación. Pega aquí el índice del documento o descríbeme cómo quieres dividirlo."
                                                                        : "Hola. Puedo ayudarte a crear reglas de división personalizadas. Dime qué buscas, por ejemplo: 'Divide cuando veas Título X'."}
                                                                </div>
                                                            </div>

                                                            {chatMessages.map((msg, i) => (
                                                                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                                                                        {msg.role === 'user' ? <LucideMessageSquare className="w-3.5 h-3.5" /> : <LucideSparkles className="w-3.5 h-3.5" />}
                                                                    </div>
                                                                    <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm max-w-[85%] ${msg.role === 'user'
                                                                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                                                                        : 'bg-card border border-border rounded-tl-none text-foreground'
                                                                        }`}>
                                                                        {msg.content}
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            {isChatThinking && (
                                                                <div className="flex gap-3">
                                                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                                                        <LucideLoader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                                                                    </div>
                                                                    <div className="bg-card border border-border p-3 rounded-2xl rounded-tl-none text-xs text-muted-foreground shadow-sm italic">
                                                                        Analizando...
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <div id="chat-end-anchor"></div>
                                                        </div>

                                                        {/* Input Area */}
                                                        <div className="p-3 bg-card border-t border-border">
                                                            <div className="relative flex items-end gap-2">
                                                                <textarea
                                                                    placeholder={blockStrategy === 'index' ? "Pega el índice o escribe una instrucción..." : "Describe el patrón de división..."}
                                                                    className="flex-1 min-h-[40px] max-h-[100px] p-3 pr-10 rounded-xl border border-border bg-muted/20 text-xs focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                                                                    value={chatInput}
                                                                    onChange={(e) => setChatInput(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                                            e.preventDefault();
                                                                            if (chatInput.trim() && !isChatThinking) {
                                                                                const msg = chatInput;
                                                                                setChatInput('');
                                                                                setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
                                                                                setIsChatThinking(true);
                                                                                // Call Agent
                                                                                aiAgent.chat(msg, {
                                                                                    strategy: blockStrategy,
                                                                                    currentPattern: blockStrategy === 'index' ? blockSplittingExamples : blockCustomPattern,
                                                                                    textPreview: text.slice(0, 5000)
                                                                                }).then(response => {
                                                                                    setIsChatThinking(false);
                                                                                    setChatMessages(prev => [...prev, { role: 'assistant', content: response.reply }]);
                                                                                    // Scroll to bottom
                                                                                    setTimeout(() => document.getElementById('chat-end-anchor')?.scrollIntoView({ behavior: 'smooth' }), 100);

                                                                                    if (response.action) {
                                                                                        if (response.action.type === 'set_pattern') setBlockCustomPattern(response.action.value);
                                                                                        if (response.action.type === 'set_index') setBlockSplittingExamples(response.action.value);
                                                                                    }
                                                                                });
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                                <button
                                                                    className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-sm mb-0.5 disabled:opacity-50"
                                                                    disabled={!chatInput.trim() || isChatThinking}
                                                                    onClick={() => {
                                                                        if (chatInput.trim() && !isChatThinking) {
                                                                            const msg = chatInput;
                                                                            setChatInput('');
                                                                            setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
                                                                            setIsChatThinking(true);
                                                                            aiAgent.chat(msg, {
                                                                                strategy: blockStrategy,
                                                                                currentPattern: blockStrategy === 'index' ? blockSplittingExamples : blockCustomPattern,
                                                                                textPreview: text.slice(0, 5000)
                                                                            }).then(response => {
                                                                                setIsChatThinking(false);
                                                                                setChatMessages(prev => [...prev, { role: 'assistant', content: response.reply }]);
                                                                                // Scroll to bottom
                                                                                setTimeout(() => document.getElementById('chat-end-anchor')?.scrollIntoView({ behavior: 'smooth' }), 100);

                                                                                if (response.action) {
                                                                                    if (response.action.type === 'set_pattern') setBlockCustomPattern(response.action.value);
                                                                                    if (response.action.type === 'set_index') setBlockSplittingExamples(response.action.value);
                                                                                }
                                                                            });
                                                                        }
                                                                    }}
                                                                >
                                                                    <LucideSparkles className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                            <p className="text-[10px] text-muted-foreground mt-2 px-1">
                                                                La IA analizará tu petición y configurará la regla de división automáticamente.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="space-y-4">
                                                <h4 className="text-sm font-bold uppercase text-muted-foreground">Estrategia para Sub-bloques</h4>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button onClick={() => setSubStrategy('header')} disabled={analysis.headerLevels.length === 0}
                                                        className={`p-4 rounded-xl border-2 text-left transition-all ${subStrategy === 'header' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/20'} disabled:opacity-40 select-none`}>
                                                        <div className="font-bold text-sm">Por Encabezado</div>
                                                        <p className="text-xs text-muted-foreground mt-1">Ideal si los sub-bloques son H2, H3...</p>
                                                    </button>
                                                    <button onClick={() => setSubStrategy('custom')}
                                                        className={`p-4 rounded-xl border-2 text-left transition-all ${subStrategy === 'custom' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/20'} select-none`}>
                                                        <div className="font-bold text-sm">Criterio Personalizado</div>
                                                        <p className="text-xs text-muted-foreground mt-1">Usa selecciones dentro del bloque.</p>
                                                    </button>
                                                    <button onClick={() => setSubStrategy('index')}
                                                        className={`col-span-2 p-4 rounded-xl border-2 text-left transition-all ${subStrategy === 'index' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/20'} select-none`}>
                                                        <div className="font-bold text-sm flex items-center gap-2">
                                                            <LucideList className="w-4 h-4 text-primary" />
                                                            Por Índice Secundario
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-1">Divide el contenido del bloque principal usando otro índice.</p>
                                                    </button>
                                                </div>
                                            </div>

                                            {subStrategy === 'header' && (
                                                <div className="grid grid-cols-3 gap-2">
                                                    {[1, 2, 3, 4, 5, 6].map(level => (
                                                        <button key={level} onClick={() => setSubHeaderLevel(level)} disabled={!analysis.headerLevels.includes(level)}
                                                            className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center ${subHeaderLevel === level ? 'border-primary bg-primary/10' : 'border-border opacity-50'} disabled:opacity-20`}>
                                                            <span className="font-bold">H{level}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {subStrategy === 'custom' && (
                                                <div className="space-y-3 p-4 bg-muted/20 rounded-xl border border-border">
                                                    <label className="text-xs font-bold uppercase text-muted-foreground">Criterio de división interno</label>
                                                    <input className="w-full p-2.5 bg-background border border-border rounded-lg text-sm"
                                                        value={subSplittingExamples}
                                                        onChange={async (e) => {
                                                            setSubSplittingExamples(e.target.value);
                                                            const p = await aiAgent.generatePatternsFromExamples(e.target.value);
                                                            setSubCustomPattern(p.parentPattern);
                                                        }}
                                                        placeholder="Ej: a), b) o ARTICULO" />
                                                    {subCustomPattern && (
                                                        <div className="p-3 bg-primary/5 rounded border border-primary/10">
                                                            <p className="text-[10px] font-bold text-primary/60 uppercase">Criterio Detectado</p>
                                                            <p className="text-xs font-medium">{humanizePattern(subCustomPattern, 'custom', subHeaderLevel)}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {subStrategy === 'index' && (
                                                <div className="space-y-3 p-4 bg-muted/20 rounded-xl border border-border animate-in fade-in slide-in-from-bottom-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                                            <span>Índice para Sub-bloques</span>
                                                        </label>
                                                        <button
                                                            onClick={async () => {
                                                                // Use the same detection but apply to Sub examples
                                                                const detected = await aiAgent.detectIndexFromText(text);
                                                                if (detected) {
                                                                    setSubSplittingExamples(detected);
                                                                } else {
                                                                    alert('No se detectó un índice obvio. Inténtalo manualmente.');
                                                                }
                                                            }}
                                                            className="text-[10px] bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1 rounded-full flex items-center gap-1.5 transition-colors font-semibold"
                                                        >
                                                            <LucideSparkles className="w-3 h-3" />
                                                            Auto-detectar desde texto
                                                        </button>
                                                    </div>
                                                    <textarea
                                                        className="w-full h-32 p-3 bg-background border border-border rounded-lg text-sm font-mono leading-relaxed resize-none focus:ring-2 focus:ring-primary/20 outline-none"
                                                        value={subSplittingExamples}
                                                        onChange={(e) => setSubSplittingExamples(e.target.value)}
                                                        placeholder={`1.1. Subsección A\n1.2. Subsección B...`}
                                                    />

                                                    {/* AI Assistant Chat Input for Sub-blocks */}
                                                    <div className="pt-2 border-t border-border mt-2">
                                                        <label className="text-[10px] font-bold uppercase text-primary mb-1.5 flex items-center gap-1">
                                                            <LucideSparkles className="w-3 h-3" />
                                                            Refinar Sub-bloques con IA
                                                        </label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                id="sub-chat-input"
                                                                className="flex-1 px-3 py-1.5 bg-background border border-border rounded-lg text-xs"
                                                                placeholder="Ej: Los sub-bloques son las letras a), b)..."
                                                                onKeyDown={async (e) => {
                                                                    if (e.key === 'Enter') {
                                                                        const val = (e.target as HTMLInputElement).value;
                                                                        if (!val) return;
                                                                        await handleChatSubmit(val, 'subblocks');
                                                                        (e.target as HTMLInputElement).value = '';
                                                                    }
                                                                }}
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    const input = document.getElementById('sub-chat-input') as HTMLInputElement;
                                                                    if (input?.value) {
                                                                        handleChatSubmit(input.value, 'subblocks');
                                                                        input.value = '';
                                                                    }
                                                                }}
                                                                className="px-3 py-1 bg-primary text-primary-foreground rounded-lg text-xs font-bold"
                                                            >
                                                                Enviar
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Matches Preview (common for both) */}
                                    <div className="mt-8 space-y-3 pb-8">
                                        {/* Added pb-8 to ensure scrollable content has padding at bottom */}
                                        <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                            <LucideList className="w-3 h-3" />
                                            Coincidencias Detectadas
                                        </h5>
                                        <div className="space-y-1.5 min-h-[100px] border-l-2 border-primary/20 pl-4">
                                            {getMatchesForText(text, configTab === 'blocks' ? (blockStrategy === 'header' ? `^#{${blockHeaderLevel}}\\s+.+` : blockCustomPattern) : (subStrategy === 'header' ? `^#{${subHeaderLevel}}\\s+.+` : subCustomPattern)).length > 0 ? (
                                                getMatchesForText(text, configTab === 'blocks' ? (blockStrategy === 'header' ? `^#{${blockHeaderLevel}}\\s+.+` : blockCustomPattern) : (subStrategy === 'header' ? `^#{${subHeaderLevel}}\\s+.+` : subCustomPattern)).map((m, i) => (
                                                    // REMOVED .slice(0, 2) here!
                                                    <div key={i} className="text-xs text-foreground py-1 border-b border-border/50 truncate last:border-0 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: m }} />
                                                ))
                                            ) : (
                                                <p className="text-xs text-muted-foreground italic">No se han detectado elementos con este criterio.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Content Index / Menu */}
                                <div className="col-span-2 flex flex-col min-h-0 bg-muted/20 rounded-2xl border border-border overflow-hidden">
                                    <div className="p-3 bg-muted border-b border-border flex items-center justify-between">
                                        <span className="text-xs font-bold text-foreground">ÍNDICE DE CONTENIDOS</span>
                                        <LucideRows3 className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1 bg-muted border-b border-border">
                                        <button onClick={expandAll} className="text-[9px] font-bold text-muted-foreground hover:text-primary">EXPANDIR</button>
                                        <button onClick={collapseAll} className="text-[9px] font-bold text-muted-foreground hover:text-primary">CONTRAER</button>
                                    </div>
                                    <div className="flex-1 overflow-auto p-4 space-y-2 font-sans">
                                        {/* Mock index generation based on current matches */}
                                        {getMatchesForText(text, blockStrategy === 'header' ? `^#{${blockHeaderLevel}}\\s+.+` : blockCustomPattern).map((m, i) => {
                                            const id = `index-${i}`;
                                            // Check if this block has sub-matches if we are in hierarchical mode
                                            const subMatches = isHierarchical ? getMatchesForText(text, subStrategy === 'header' ? `^#{${subHeaderLevel}}\\s+.+` : subCustomPattern) : [];
                                            // This is a bit simplified since we don't have the actual tree yet in Step 2
                                            // but we can at least show the toggle if hierarchical is on.
                                            const isExpanded = expandedItemIds.has(id);

                                            return (
                                                <div key={i} className="space-y-1">
                                                    <div className="flex items-center gap-1">
                                                        {isHierarchical && (
                                                            <button
                                                                onClick={() => toggleExpand(id)}
                                                                className="p-1 hover:bg-background rounded"
                                                            >
                                                                <LucideList className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => { setSelectedBlockIndex(i); setConfigTab('subblocks'); }}
                                                            className={`flex-1 text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${selectedBlockIndex === i && configTab === 'subblocks' ? 'bg-primary text-white shadow-md' : 'bg-background hover:bg-primary/10 text-foreground border border-border/50'}`}
                                                        >
                                                            <span dangerouslySetInnerHTML={{ __html: m }} />
                                                        </button>
                                                    </div>
                                                    {
                                                        isExpanded && isHierarchical && (
                                                            <div className="ml-6 pl-3 border-l-2 border-primary/30 space-y-1 py-1">
                                                                <p className="text-[10px] text-muted-foreground italic">Configurando sub-bloques...</p>
                                                            </div>
                                                        )
                                                    }
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="p-4 border-t border-border bg-muted/40 text-[10px] text-muted-foreground leading-relaxed">
                                        <LucideMousePointer2 className="w-3 h-3 inline mr-1" />
                                        Pincha en un bloque para configurar su subdivisión interna en la pestaña de sub-bloques.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'styles' && analysis && (
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="mb-4">
                                <h3 className="text-lg font-semibold text-foreground mb-2">Mapeo de Estilos</h3>
                                <p className="text-sm text-muted-foreground">
                                    Mapea los estilos de formato detectados. <span className="text-primary font-medium">Nota: Los encabezados (H1-H6) se procesan automáticamente como divisiones.</span>
                                </p>
                            </div>

                            <div className="flex-1 overflow-auto pr-2">
                                <StyleMapper
                                    detectedStyles={analysis.textStyles}
                                    onMappingsChange={setStyleMappings}
                                    preserveOriginal={preserveStyles}
                                    onPreserveChange={setPreserveStyles}
                                />
                            </div>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={items.length > 0 && selectedItemIds.size === getAllItemsCount(items)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    const allIds = new Set<string>();
                                                    const collectIds = (list: ImportItem[]) => list.forEach(i => { allIds.add(i.id); if (i.children) collectIds(i.children); });
                                                    collectIds(items);
                                                    setSelectedItemIds(allIds);
                                                } else {
                                                    setSelectedItemIds(new Set());
                                                }
                                            }}
                                            className="w-4 h-4 accent-primary cursor-pointer"
                                        />
                                        <h3 className="text-sm font-medium text-muted-foreground">
                                            Vista previa: {items.length} bloque{items.length !== 1 ? 's' : ''}
                                        </h3>
                                    </div>
                                    <div className="h-4 w-[1px] bg-border" />
                                    <div className="flex items-center gap-2">
                                        <button onClick={expandAll} className="px-2 py-1 text-[10px] bg-muted hover:bg-muted/80 rounded border border-border transition-colors">Expandir Todo</button>
                                        <button onClick={collapseAll} className="px-2 py-1 text-[10px] bg-muted hover:bg-muted/80 rounded border border-border transition-colors">Contraer Todo</button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {selectedItemIds.size > 0 && (
                                        <div className="flex items-center gap-2 mr-4 bg-primary/10 px-3 py-1 rounded-full border border-primary/20 animate-in fade-in slide-in-from-right-4">
                                            <span className="text-[10px] font-bold text-primary">{selectedItemIds.size} seleccionados</span>
                                            <button onClick={mergeSelected} className="px-2 py-0.5 text-[10px] bg-primary text-white rounded hover:opacity-90 transition-opacity">Fusionar</button>
                                            <button onClick={deleteSelected} className="px-2 py-0.5 text-[10px] bg-red-500 text-white rounded hover:opacity-90 transition-opacity">Eliminar</button>
                                            <button onClick={() => setSelectedItemIds(new Set())} className="text-[10px] text-muted-foreground hover:text-foreground mr-1">✕</button>
                                        </div>
                                    )}
                                    <button onClick={() => setStep('input')} className="text-xs text-primary hover:underline">
                                        ← Volver al inicio
                                    </button>
                                </div>
                            </div>

                            {/* Import Mode Selection (if existing content) */}
                            {hasExistingBlocks && (
                                <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/20 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                                            <LucideLayers className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-amber-900 dark:text-amber-200">El documento ya tiene contenido</p>
                                            <p className="text-[10px] text-amber-700 dark:text-amber-400">Selecciona cómo deseas proceder con la importación:</p>
                                        </div>
                                    </div>
                                    <div className="flex bg-white dark:bg-black/20 rounded-lg p-1 border border-amber-200/50">
                                        <button
                                            onClick={() => setImportMode('merge')}
                                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${importMode === 'merge' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-700 hover:bg-amber-50'}`}
                                        >
                                            Fusionar
                                        </button>
                                        <button
                                            onClick={() => setImportMode('replace')}
                                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${importMode === 'replace' ? 'bg-red-500 text-white shadow-sm' : 'text-amber-700 hover:bg-amber-50'}`}
                                        >
                                            Sustituir Todo
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 overflow-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-muted">
                                {renderPreviewItems(items)}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="h-16 border-t border-border flex items-center justify-between px-6 bg-muted/50">
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                if (confirm('¿Estás seguro de que deseas descartar esta importación? Se perderán todos los cambios.')) {
                                    setText('');
                                    setItems([]);
                                    setStep('input');
                                    // onClose(); // Keep modal open for new file
                                }
                            }}
                            className="px-4 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
                        >
                            Descartar
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>

                    <div className="flex gap-2">
                        {step !== 'input' && (
                            <button
                                onClick={() => {
                                    if (step === 'preview') setStep('styles');
                                    else if (step === 'styles') setStep('configure');
                                    else if (step === 'configure') setStep('input');
                                }}
                                className="px-4 py-2 rounded-lg text-sm border border-border hover:bg-muted transition-colors text-foreground"
                            >
                                ← Atrás
                            </button>
                        )}

                        {step === 'preview' ? (
                            <button
                                onClick={handleImport}
                                disabled={isLoading}
                                className="px-4 py-2 rounded-lg text-sm bg-primary hover:opacity-90 text-primary-foreground font-medium transition-all disabled:opacity-50"
                            >
                                {isLoading ? 'Importando...' : `Importar ${items.length} Bloque${items.length !== 1 ? 's' : ''}`}
                            </button>
                        ) : (
                            <button
                                onClick={handleNext}
                                disabled={!canProceed() || isLoading}
                                className="px-4 py-2 rounded-lg text-sm bg-primary hover:opacity-90 text-primary-foreground font-medium transition-all disabled:opacity-50"
                            >
                                {isLoading ? 'Analizando...' : 'Siguiente →'}
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div >
    );
}
