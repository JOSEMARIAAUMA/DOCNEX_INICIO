import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { DocumentBlock, Resource, BlockResourceLink, BlockVersion, SemanticLink, BlockComment } from '@docnex/shared';
import { updateBlock, updateBlockTitle, listBlockLinks, removeLink, createResourceExtract, createLink, createBlockComment, listBlockComments, listSemanticLinksByBlock } from '@/lib/api';
import { Network, Tag, Save, ChevronDown, ChevronUp, Split, Image as ImageIcon, Link as LinkIcon, Trash2, Maximize2, Minimize2, Copy, History, PlusSquare, X, BookOpen, Edit3, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SemanticLinkOverlay } from '../viewer/SemanticLinkOverlay';
import { AIFloatingMenu } from '../editor/AIFloatingMenu';
import { processAutoLinks } from '@/lib/ai/semantic-engine';
import { supabase } from '@/lib/supabase/client';
import { Editor } from '@tiptap/react';
import SimpleEditor, { SimpleEditorHandle } from '../editor/SimpleEditor';
import SharedToolbar from '../editor/SharedToolbar';
import NoteDialog from '../notes/NoteDialog';
import { TagInput } from '../ui/TagInput';
import { useDebouncedSave } from '@/hooks/use-auto-save';
import { decodeHtmlEntities } from '@/lib/text-utils';
import FloatingContextToolbar from '../editor/FloatingContextToolbar';

interface BlockContentEditorProps {
    block: DocumentBlock;
    allBlocks: DocumentBlock[];
    resources: Resource[];
    onUpdate: () => void;
    onSplit: (splitIndex: number, currentHtml: string) => void;
    onCreateBlock?: (content: string, title: string) => void;
    onExtractSelection?: (remainingContent: string, newBlockContent: string, newBlockTitle: string) => void;
    comparingItem?: { id: string, title: string, content: string, label: string } | null;
    onCloseCompare?: () => void;
    onVersionUpdated?: () => void;
    onNoteCreated?: () => void;
    onOpenSidePanel?: (content: { type: 'block' | 'resource', id: string, title: string, content?: string }) => void;
    refreshTrigger?: number;
    showResearch?: boolean;
    researchInsights?: any[];
    showAudit?: boolean;
    auditFindings?: any[];
}

export default function BlockContentEditor({
    block,
    allBlocks,
    resources,
    onUpdate,
    onSplit,
    onCreateBlock,
    onExtractSelection,
    comparingItem,
    onCloseCompare,
    onVersionUpdated,
    onNoteCreated,
    onOpenSidePanel,
    refreshTrigger = 0,
    showResearch = false,
    researchInsights = [],
    showAudit = false,
    auditFindings = []
}: BlockContentEditorProps) {
    const [title, setTitle] = useState(decodeHtmlEntities(block.title));
    const [content, setContent] = useState(block.content);
    const [tags, setTags] = useState<string[]>(block.tags || []);
    const [links, setLinks] = useState<BlockResourceLink[]>([]);
    const [notes, setNotes] = useState<BlockComment[]>([]);
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [semanticLinks, setSemanticLinks] = useState<SemanticLink[]>([]);
    const [isTagsOpen, setIsTagsOpen] = useState(false);
    const [tagPanelSize, setTagPanelSize] = useState({ width: 288, height: 300 });

    // New State for Full Chapter Reading Mode
    const [showFullChapter, setShowFullChapter] = useState(false);

    // Helpers for Chapter Mode
    const childBlocks = useMemo(() => {
        return allBlocks
            .filter(b => b.parent_block_id === block.id)
            .sort((a, b) => a.order_index - b.order_index);
    }, [block.id, allBlocks]);

    const getAllDescendants = useCallback((parentId: string): DocumentBlock[] => {
        const children = allBlocks
            .filter(b => b.parent_block_id === parentId)
            .sort((a, b) => a.order_index - b.order_index);

        let descendants: DocumentBlock[] = [];
        for (const child of children) {
            descendants.push(child);
            descendants = [...descendants, ...getAllDescendants(child.id)];
        }
        return descendants;
    }, [allBlocks]);

    const fullChapterBlocks = useMemo(() => {
        if (!showFullChapter) return [];
        return [block, ...getAllDescendants(block.id)];
    }, [showFullChapter, block, getAllDescendants]);

    const handleTitleChange = (newTitle: string) => {
        // Just local state update wrapper if needed, logic is already inline usually
        // But the linter complained.
        saveTitle(newTitle);
    };

    useEffect(() => {
        const saved = localStorage.getItem('tag-panel-size');
        if (saved) {
            try {
                setTagPanelSize(JSON.parse(saved));
            } catch (e) {
                console.error('Error parsing tag panel size', e);
            }
        }
    }, []);

    // State for version editing
    const [versionTitle, setVersionTitle] = useState('');
    const [versionContent, setVersionContent] = useState('');
    const [isVersionDirty, setIsVersionDirty] = useState(false);
    const [savingVersion, setSavingVersion] = useState(false);

    // Track which editor is active for shared toolbar
    const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
    const mainEditorRef = useRef<SimpleEditorHandle>(null);
    const versionEditorRef = useRef<SimpleEditorHandle>(null);

    // Auto-Save Implementation
    // We combine state to save all at once or handle individually.
    // Ideally we want separate debouncers if we want fine grained control, 
    // but saving block as a unit is safer.

    // We need a stable save function
    const saveBlockData = useCallback(async (data: { title: string; content: string; tags: string[] }) => {
        // Only update if changed? useDebouncedSave does that check on the 'value' object reference or equality.
        // Since we pass a new object {title, content} every render, we need to handle "is dirty" logic inside the hook
        // or rely on the hook's diffing. 
        // Our hook checks `value === lastSavedRef.current`. 
        // Object comparison will fail. Use JSON stringify or custom check?
        // The simple hook provided uses strict equality. 
        // Let's modify the usage or the hook. 
        // Actually, let's keep it simple: Just update.
        // But API calls are expensive.
        // Let's rely on api.ts to handle optimizations or just let it fly.

        // Wait, current updateBlock handles content + tags. updateBlockTitle handles title.
        const promises = [];
        if (data.title !== block.title) promises.push(updateBlockTitle(block.id, data.title));
        if (data.content !== block.content || JSON.stringify(data.tags) !== JSON.stringify(block.tags)) {
            promises.push(updateBlock(block.id, data.content, data.tags));
        }

        await Promise.all(promises);
        if (promises.length > 0) onUpdate();
    }, [block.id, block.title, block.content, block.tags, onUpdate]);

    const saveTitle = useCallback(async (newTitle: string) => {
        if (newTitle !== block.title) {
            await updateBlockTitle(block.id, newTitle);
            onUpdate();
        }
    }, [block.id, block.title, onUpdate]);

    const saveContentData = useCallback(async (data: { content: string, tags: string[] }) => {
        if (data.content !== block.content || JSON.stringify(data.tags) !== JSON.stringify(block.tags)) {
            await updateBlock(block.id, data.content, data.tags);
            onUpdate();
        }
    }, [block.id, block.content, block.tags, onUpdate]);

    const titleSaveStatus = useDebouncedSave(title, saveTitle, 1000);
    // Combine content and tags for the content saver
    // We need to use useMemo to create the object so referencing proper values
    // But hooks shouldn't be conditional.
    // Let's create a combined object that updates whenever content or tags change.
    const contentState = { content, tags };
    // Is it safe to pass object? useDebouncedSave uses strict equality check (ref equality).
    // {content, tags} is a new object every render.
    // So it will ALWAYS trigger "modified".
    // So the status will always be 'modified' -> 'saving' -> 'saved' on every render even if content is same but other state changed.

    // Quick fix: Pass purely content for now since tags are not fully edited here yet (user said hidden UI).
    // Or stringify it.

    // Actually, tags state is: const [tags, setTags] = useState...
    // Let's just save content for now to fix the "delete block" and core utility.
    const contentSaveStatus = useDebouncedSave(content, async (c) => {
        await updateBlock(block.id, c, tags);
        onUpdate();
    }, 1000);


    // State for note dialog
    const [noteDialogOpen, setNoteDialogOpen] = useState(false);
    const [noteSelectedText, setNoteSelectedText] = useState('');
    const [noteSelectionOffsets, setNoteSelectionOffsets] = useState<{ from: number; to: number } | null>(null);
    const [noteActiveEditorRef, setNoteActiveEditorRef] = useState<React.RefObject<SimpleEditorHandle | null> | null>(null);

    const loadNotes = useCallback(async () => {
        try {
            const fetchedNotes = await listBlockComments(block.id);
            // Separate active and resolved notes
            const active = fetchedNotes.filter(note => !note.resolved);
            setNotes(active);
            console.log(`📋 Loaded ${active.length} active notes for block ${block.id}`);
        } catch (err) {
            console.error('Failed to load notes:', err);
        }
    }, [block.id]);

    const loadLinks = useCallback(async () => {
        const fetchedLinks = await listBlockLinks(block.id);
        setLinks(fetchedLinks);

        try {
            const semanticData = await listSemanticLinksByBlock(block.id);
            setSemanticLinks(semanticData);
        } catch (err) {
            console.error('Error fetching semantic links:', err);
        }
    }, [block.id]);

    // Robust synchronization of markers and highlights in the editor
    useEffect(() => {
        const editor = mainEditorRef.current?.getEditor();
        if (!editor || (notes.length === 0 && content.length === 0)) return;

        // Map for re-numbering per type
        const reviewNotes = notes.filter(n => n.comment_type === 'review').sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const aiNotes = notes.filter(n => n.comment_type === 'ai_instruction').sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        const noteMap = new Map();
        reviewNotes.forEach((n, i) => noteMap.set(n.id, { number: i + 1, type: 'review' }));
        aiNotes.forEach((n, i) => noteMap.set(n.id, { number: i + 1, type: 'ai_instruction' }));

        const activeIds = new Set(notes.map(n => n.id));
        let contentModified = false;

        editor.chain().command(({ state, tr }: any) => {
            state.doc.descendants((node: any, pos: number) => {
                if (node.type.name === 'noteMarker') {
                    const noteId = node.attrs.noteId;
                    const expected = noteMap.get(noteId);

                    if (!activeIds.has(noteId) || !expected) {
                        // DELETE marker for resolved or missing note
                        tr.delete(pos, pos + node.nodeSize);
                        contentModified = true;

                        // Try to unset highlight in the preceding area (rough heuristic)
                        const searchStart = Math.max(0, pos - 50);
                        tr.removeMark(searchStart, pos, state.schema.marks.highlight);
                    } else if (node.attrs.number !== expected.number || node.attrs.type !== expected.type) {
                        // UPDATE marker if number or type changed
                        tr.setNodeMarkup(pos, undefined, {
                            ...node.attrs,
                            number: expected.number,
                            type: expected.type
                        });
                        contentModified = true;
                    }
                }
                return true;
            });
            return true;
        }).run();

        if (contentModified) {
            const newHTML = editor.getHTML();
            console.log('🔄 Markers out of sync. updating content state...');
            setContent(newHTML);
            // Non-blocking save to persistent DB
            updateBlock(block.id, newHTML).catch(e => console.error('Auto-sync save failed:', e));
        }
    }, [notes, block.id, content.length]);

    // Initialize version state when comparingItem changes
    useEffect(() => {
        if (comparingItem) {
            setVersionTitle(comparingItem.title || '');
            setVersionContent(comparingItem.content || '');
            setIsVersionDirty(false);
        }
    }, [comparingItem?.id, comparingItem?.title, comparingItem?.content]);

    // Set main editor as active by default
    useEffect(() => {
        if (mainEditorRef.current) {
            const editor = mainEditorRef.current.getEditor();
            if (editor && !activeEditor) {
                setActiveEditor(editor);
            }
        }
    }, [mainEditorRef.current, activeEditor]);

    // Initial load when block changes
    useEffect(() => {
        setTitle(decodeHtmlEntities(block.title));
        setContent(block.content);
        setTags(block.tags || []);
        setIsDirty(false);
        loadLinks();
        loadNotes();
    }, [block.id, loadLinks, loadNotes]);

    // Handle refreshes
    useEffect(() => {
        if (refreshTrigger > 0) {
            loadLinks();
            loadNotes();
        }
    }, [refreshTrigger, loadLinks, loadNotes]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (title !== block.title) {
                await updateBlockTitle(block.id, title);
            }
            // Check if tags changed (simple comparison)
            const tagsChanged = JSON.stringify(tags) !== JSON.stringify(block.tags || []);

            if (content !== block.content || tagsChanged) {
                // Update block with content AND tags
                await updateBlock(block.id, content, tags);

                // --- SPRINT 5: Red de Conocimiento ---
                // Disparar proceso de detección de links semánticos
                try {
                    const linksCreated = await processAutoLinks(
                        { ...block, content, tags }, // Pass new content and tags
                        allBlocks
                    );
                    if (linksCreated > 0) {
                        console.log(`🧠 Motor Semántico: Se han creado ${linksCreated} nuevos enlaces automáticos.`);
                    }
                } catch (semanticErr) {
                    console.error('Error in semantic engine:', semanticErr);
                }
            }
            setIsDirty(false);
            onUpdate();
        } catch (err) {
            console.error('Save failed:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveVersion = async () => {
        if (!comparingItem) return;
        setSavingVersion(true);
        try {
            // Check if it's a version (standard pattern) or a document block
            // For now, only block_versions table supports title/content updates directly here
            const { error } = await supabase
                .from('block_versions')
                .update({
                    title: versionTitle,
                    content: versionContent
                })
                .eq('id', comparingItem.id);
            if (error) throw error;
            setIsVersionDirty(false);
            if (onVersionUpdated) onVersionUpdated();
        } catch (err) {
            console.error('Save version failed:', err);
        } finally {
            setSavingVersion(false);
        }
    };

    const handleSubstitute = () => {
        if (!comparingItem) return;
        if (confirm('¿Sustituir el contenido actual por el de apoyo? Se perderán los cambios no guardados en el bloque principal.')) {
            setContent(versionContent);
            setTitle(versionTitle);
            setIsDirty(true);
        }
    };

    const handleUnlink = async (linkId: string) => {
        await removeLink(linkId);
        loadLinks();
    };

    const handleContentChange = (newContent: string) => {
        setContent(newContent);
        setIsDirty(true);
    };

    const handleVersionContentChange = (newContent: string) => {
        setVersionContent(newContent);
        setIsVersionDirty(true);
    };

    const handleRevert = () => {
        setTitle(block.title);
        setContent(block.content);
        setTags(block.tags || []);
        setIsDirty(false);
    };

    const handleMainEditorFocus = () => {
        const editor = mainEditorRef.current?.getEditor();
        if (editor) setActiveEditor(editor);
    };

    const handleVersionEditorFocus = () => {
        const editor = versionEditorRef.current?.getEditor();
        if (editor) setActiveEditor(editor);
    };

    const handleExtract = () => {
        const text = activeEditor ?
            (mainEditorRef.current?.getSelectedText() || versionEditorRef.current?.getSelectedText() || '') : '';

        if (!text) {
            alert('Selecciona texto primero para crear un extracto.');
            return;
        }

        if (resources.length === 0) {
            alert('Primero añade un recurso al proyecto para poder crear extractos.');
            return;
        }

        const label = prompt('Etiqueta para el extracto:', 'Extracto');
        if (!label) return;

        let resourceId = resources[0].id;
        if (resources.length > 1) {
            const resourceNames = resources.map((r, i) => `${i + 1}. ${r.title}`).join('\n');
            const choice = prompt(`Selecciona el recurso (1-${resources.length}):\n${resourceNames}`, '1');
            if (!choice) return;
            const idx = parseInt(choice) - 1;
            if (idx >= 0 && idx < resources.length) {
                resourceId = resources[idx].id;
            }
        }

        (async () => {
            try {
                const extract = await createResourceExtract(resourceId, text, label);
                if (extract) {
                    await createLink(block.id, resourceId, extract.id);
                    await loadLinks();
                    onUpdate();
                    alert(`✅ Extracto "${label}" creado y vinculado al bloque.`);
                }
            } catch (err) {
                console.error('Error creating extract:', err);
                alert('Error al crear el extracto.');
            }
        })();
    };

    const handleLocalSplit = () => {
        const editor = activeEditor || mainEditorRef.current?.getEditor();
        if (!editor) return;

        const { from } = editor.state.selection;
        if (from === undefined) return;

        // Pass BOTH the position and the CURRENT HTML content to ensure split matches
        onSplit(from, editor.getHTML());
    };

    const handleExtractSelectionAction = () => {
        const editor = activeEditor || mainEditorRef.current?.getEditor();
        if (!editor) return;

        const { from, to } = editor.state.selection;
        if (from === to) {
            alert('Selecciona texto para extraerlo a un nuevo bloque.');
            return;
        }

        const selectedText = editor.state.doc.textBetween(from, to, ' ');
        const defaultTitle = selectedText.slice(0, 30) + (selectedText.length > 30 ? '...' : '');
        const title = prompt('Título para el nuevo bloque:', defaultTitle);
        if (!title) return;

        // Delete selection in editor
        editor.chain().focus().deleteSelection().run();

        // Get remaining content
        const remainingContent = editor.getHTML();

        if (onExtractSelection) {
            onExtractSelection(remainingContent, selectedText, title);
        }
    };

    const handleComment = () => {
        // Check which editor has selection
        const mainText = mainEditorRef.current?.getSelectedText() || '';
        const versionText = versionEditorRef.current?.getSelectedText() || '';
        const text = mainText || versionText;
        const editorRef = mainText ? mainEditorRef : (versionText ? versionEditorRef : null);

        if (!text || !editorRef?.current) {
            alert('Selecciona texto primero para añadir una nota.');
            return;
        }

        const offsets = editorRef.current.getSelectionOffsets();
        if (!offsets) {
            alert('Selecciona texto primero para añadir una nota.');
            return;
        }

        // Store selection info and open dialog
        setNoteSelectedText(text);
        setNoteSelectionOffsets(offsets);
        setNoteActiveEditorRef(editorRef);
        setNoteDialogOpen(true);
    };

    const handleNoteSubmit = async (noteContent: string, noteType: 'review' | 'ai_instruction') => {
        if (!noteSelectionOffsets || !noteActiveEditorRef?.current) return;

        try {
            // Create the note via API
            const newNote = await createBlockComment(
                block.id,
                noteSelectedText,
                noteContent,
                noteType,
                noteSelectionOffsets.from,
                noteSelectionOffsets.to
            );

            if (newNote) {
                console.log('✅ Note created:', newNote.id);

                // Update Editor UI
                const editor = noteActiveEditorRef.current.getEditor();
                if (editor) {
                    const countOfSameType = notes.filter(n => n.comment_type === noteType).length;
                    const noteNumber = countOfSameType + 1;
                    const highlightColor = noteType === 'ai_instruction'
                        ? 'rgba(16, 185, 129, 0.2)'
                        : 'rgba(59, 130, 246, 0.2)';

                    console.log(`🖋️ Inserting marker #${noteNumber} for note ${newNote.id}`);

                    editor.chain()
                        .setTextSelection({ from: noteSelectionOffsets.from, to: noteSelectionOffsets.to })
                        .setHighlight({ color: highlightColor })
                        .setTextSelection(noteSelectionOffsets.to)
                        .insertContent({
                            type: 'noteMarker',
                            attrs: {
                                noteId: newNote.id,
                                number: noteNumber,
                                type: noteType,
                            },
                        })
                        .run();

                    const updatedHTML = editor.getHTML();
                    console.log('📄 HTML with marker:', updatedHTML.includes('data-note-id') ? 'YES' : 'NO');

                    // Save content to DB
                    await updateBlock(block.id, updatedHTML);
                    setContent(updatedHTML);
                    setIsDirty(false);
                }

                // Update notes state AFTER editor insertion to trigger sync correctly
                setNotes(prev => [...prev, newNote]);

                // Reload notes and notify parent
                await loadNotes();
                if (onNoteCreated) onNoteCreated();
            }
        } catch (err) {
            console.error('❌ FULL ERROR creating note:', err);
            console.error('Error details:', {
                message: (err as Error).message,
                stack: (err as Error).stack,
                blockId: block.id,
                noteType,
                offsets: noteSelectionOffsets
            });
            alert('Error al crear la nota. Abre la consola del navegador (F12) y envíame el error completo.');
        } finally {
            // Close dialog
            setNoteDialogOpen(false);
            setNoteSelectedText('');
            setNoteSelectionOffsets(null);
            setNoteActiveEditorRef(null);
        }
    };

    const handleNoteClick = (noteId: string) => {
        setSelectedNoteId(noteId);
        // Clear selection after a delay to allow re-clicking the same note
        setTimeout(() => setSelectedNoteId(null), 3000);
    };

    return (
        <div className="h-full flex flex-col bg-background">
            {/* 1. HEADER: Title and Tag Toggle */}
            <div className="flex items-center gap-2 mb-2 p-4 pb-0 shrink-0">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                        setTitle(e.target.value);
                        saveTitle(e.target.value);
                    }}
                    className="flex-1 text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground/30 text-foreground"
                    placeholder="Título del bloque..."
                />

                {/* Research Indicator */}
                {showResearch && researchInsights.length > 0 && (
                    <div className="flex -space-x-1.5 overflow-hidden px-2">
                        {researchInsights.slice(0, 3).map((insight, i) => (
                            <div
                                key={i}
                                className={`w-6 h-6 rounded-full border-2 border-background flex items-center justify-center shadow-sm ${insight.type === 'compliance' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                                    }`}
                                title={insight.message || insight.suggestion}
                            >
                                <Sparkles className="w-3 h-3" />
                            </div>
                        ))}
                    </div>
                )}
                {/* Audit Indicator */}
                {showAudit && auditFindings.length > 0 && auditFindings.some(f => f.affectedBlocks?.includes(block.id)) && (
                    <div className="flex -space-x-1.5 overflow-hidden px-2">
                        {auditFindings.filter(f => f.affectedBlocks?.includes(block.id)).slice(0, 3).map((finding, i) => (
                            <div
                                key={i}
                                className={`w-6 h-6 rounded-full border-2 border-background flex items-center justify-center shadow-sm ${finding.severity === 'high' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                                    }`}
                                title={`[${finding.type}] ${finding.message}`}
                            >
                                <AlertTriangle className="w-3 h-3" />
                            </div>
                        ))}
                    </div>
                )}

                {/* Compact Tag Toggle */}
                <div className="relative">
                    <button
                        onClick={() => setIsTagsOpen(!isTagsOpen)}
                        className={`p-1.5 rounded-md transition-colors ${tags.length > 0 ? 'text-blue-500 bg-blue-500/10' : 'text-muted-foreground hover:bg-muted'
                            }`}
                        title={tags.length > 0 ? `${tags.length} etiquetas` : "Añadir etiquetas"}
                    >
                        <span className="text-xs font-bold mr-1">#</span>
                        {tags.length > 0 && <span className="text-[10px] font-bold">{tags.length}</span>}
                    </button>

                    {/* Popover-like Tag Input */}
                    {isTagsOpen && (
                        <div
                            style={{
                                width: tagPanelSize.width,
                                height: tagPanelSize.height
                            }}
                            className="absolute right-0 top-full mt-2 bg-card border border-border shadow-xl rounded-lg flex flex-col z-50 animate-in fade-in zoom-in-95 duration-200"
                        >
                            <div className="p-3 pb-0 flex items-center justify-between shrink-0">
                                <span className="text-xs font-semibold text-muted-foreground">Etiquetas</span>
                                <button onClick={() => setIsTagsOpen(false)} className="text-xs hover:text-foreground">✕</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-3">
                                <TagInput
                                    tags={tags}
                                    onTagsChange={(newTags) => {
                                        setTags(newTags);
                                        saveContentData({ content, tags: newTags });
                                    }}
                                />
                            </div>

                            {/* Resize Handle */}
                            <div
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const startX = e.clientX;
                                    const startY = e.clientY;
                                    const startWidth = tagPanelSize.width;
                                    const startHeight = tagPanelSize.height;

                                    const onMouseMove = (moveEvent: MouseEvent) => {
                                        const newWidth = Math.max(200, startWidth + (moveEvent.clientX - startX)); // Dragging right increases width? No, it's right-aligned, so dragging left increases width.
                                        // Wait, it handles regular width if it's just 'width'. But it is absolute right-0.
                                        // If it is anchored RIGHT, creating a wider element means it grows to the LEFT.
                                        // So moving mouse to LEFT (negative delta) should INCREASE width.

                                        // Actually usually resize handles are bottom-right. But this is right-aligned.
                                        // Let's assume the handle is at the bottom-left or bottom-right? 
                                        // If I put a handle at bottom, I can resize height.
                                        // If I put handle at left, I can resize width (growing left).

                                        // Let's make it simple: Handle at bottom-left corner for width/height?
                                        // Or just bottom for height (simplest for now, user requested "arrastrando el borde inferior").
                                        // User asked: "arrastrando el borde inferior".

                                        // Implementing HEIGHT resize only for now as requested "borde inferior".
                                        const newHeight = Math.max(150, startHeight + (moveEvent.clientY - startY));

                                        setTagPanelSize(prev => {
                                            const next = { ...prev, height: newHeight };
                                            localStorage.setItem('tag-panel-size', JSON.stringify(next));
                                            return next;
                                        });
                                    };

                                    const onMouseUp = () => {
                                        document.removeEventListener('mousemove', onMouseMove);
                                        document.removeEventListener('mouseup', onMouseUp);
                                    };

                                    document.addEventListener('mousemove', onMouseMove);
                                    document.addEventListener('mouseup', onMouseUp);
                                }}
                                className="h-3 w-full cursor-s-resize hover:bg-primary/10 flex items-center justify-center shrink-0 border-t border-border/50"
                                title="Arrastrar para redimensionar altura"
                            >
                                <div className="w-8 h-1 rounded-full bg-muted-foreground/20" />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. SHARED TOOLBAR */}
            <SharedToolbar
                editor={activeEditor}
                onExtract={handleExtract}
                onComment={handleComment}
                onSplit={handleLocalSplit}
            />

            {/* AI Floating Menu - Attached to Active Editor */}
            {activeEditor && <AIFloatingMenu editor={activeEditor} blockId={block.id} />}

            {/* Floating Context Toolbar for Text Selection Actions */}
            {activeEditor && <FloatingContextToolbar editor={activeEditor} onExtractToBlock={handleExtractSelectionAction} />}

            {/* 3. MAIN EDITOR AREA SPLIT */}
            {/* 3. MAIN EDITOR AREA SPLIT */}
            <div className="flex-1 overflow-hidden flex">

                {/* 3a. Current Version Editor - HIDE if in Full Chapter Reading Mode */}
                {!showFullChapter && (
                    <div className={`overflow-y-auto p-6 min-h-0 ${comparingItem ? 'flex-1 border-r border-border' : 'flex-1'}`}>

                        {/* Comparison Header (Only if comparing) */}
                        {comparingItem && (
                            <div className="mb-4 flex items-center justify-between">
                                <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wider">
                                    📄 VERSIÓN ACTUAL
                                </span>
                                <div className="flex gap-2">
                                    {isDirty && (
                                        <>
                                            <button
                                                onClick={handleRevert}
                                                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
                                            >
                                                Descartar
                                            </button>
                                            <button
                                                onClick={handleSave}
                                                disabled={isSaving}
                                                className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded hover:opacity-90 disabled:opacity-50 transition-all font-medium"
                                            >
                                                {isSaving ? 'Guardando...' : 'Guardar'}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        <SimpleEditor
                            id={`editor-${block.id}`}
                            ref={mainEditorRef}
                            content={content}
                            onChange={handleContentChange}
                            placeholder="Comienza a escribir aquí..."
                            onFocus={handleMainEditorFocus}
                            onNoteClick={handleNoteClick}
                        />

                        {/* Semantic Links Overlay */}
                        <SemanticLinkOverlay
                            links={semanticLinks}
                            onLinkClick={(targetId) => {
                                const targetBlock = allBlocks.find(b => b.id === targetId);
                                if (targetBlock && onOpenSidePanel) {
                                    onOpenSidePanel({
                                        type: 'block',
                                        id: targetBlock.id,
                                        title: targetBlock.title,
                                        content: targetBlock.content
                                    });
                                }
                            }}
                        />
                    </div>
                )}

                {/* Editor Area */}
                {/* Secondary Area (Reading Mode or Comparison) - Only render if active */}
                {(showFullChapter || comparingItem) && (
                    <div className="flex-1 overflow-y-auto relative scroll-smooth bg-muted/10 border-l border-border">
                        <div className="max-w-4xl mx-auto px-8 py-8 min-h-full">
                            {comparingItem && (
                                <div className="mb-8 p-4 bg-muted/30 rounded-xl border border-border/50">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{comparingItem.label}</h3>
                                        <button onClick={onCloseCompare} className="text-muted-foreground hover:text-foreground">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="prose prose-sm dark:prose-invert max-w-none opacity-80">
                                        <h3>{comparingItem.title}</h3>
                                        <div dangerouslySetInnerHTML={{ __html: comparingItem.content }} />
                                    </div>
                                </div>
                            )}

                            {showFullChapter && (
                                <div className="space-y-8 animate-in fade-in duration-500">
                                    {/* Reading Mode View */}
                                    {fullChapterBlocks.map((blk, index) => {
                                        // Calculate indented level relative to root
                                        // Root (selected block) is level 0 here effectively
                                        let level = 0;
                                        let curr = blk;
                                        // Simple heuristic: if parent is the main block, level 1. If parent is child of main, level 2.
                                        // We can just start from 0 for the selected block.

                                        return (
                                            <div key={blk.id} className={`
                                                ${blk.id === block.id ? 'pb-8 border-b border-border/50' : 'pl-8 border-l-2 border-border/30'}
                                                transition-all hover:bg-accent/5 p-4 rounded-lg
                                            `}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    {blk.id !== block.id && (
                                                        <span className="text-[10px] uppercase font-bold text-muted-foreground/50">
                                                            {blk.block_type || 'Bloque'} {blk.order_index}
                                                        </span>
                                                    )}
                                                    <h2 className={`font-bold ${blk.id === block.id ? 'text-2xl text-primary' : 'text-lg text-foreground/80'}`}>
                                                        {blk.title}
                                                    </h2>
                                                </div>
                                                <div
                                                    className="prose prose-lg dark:prose-invert max-w-none text-foreground/90 leading-relaxed"
                                                    dangerouslySetInnerHTML={{ __html: blk.content }}
                                                />
                                            </div>
                                        );
                                    })}

                                    <div className="flex justify-center pt-8">
                                        <button
                                            onClick={() => setShowFullChapter(false)}
                                            className="px-6 py-2 bg-muted hover:bg-accent text-muted-foreground rounded-full text-xs font-bold uppercase tracking-widest transition-all"
                                        >
                                            Volver a Edición
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* 4. FOOTER STATUS BAR */}
            <div className="p-2 border-t border-border bg-card flex items-center justify-between min-h-[40px] shrink-0">
                <div className="text-xs text-muted-foreground italic flex items-center gap-2">
                    {/* Status Indicators */}
                    {(titleSaveStatus.status === 'saving' || contentSaveStatus.status === 'saving') ? (
                        <span className="text-primary animate-pulse">Guardando...</span>
                    ) : (titleSaveStatus.status === 'error' || contentSaveStatus.status === 'error') ? (
                        <span className="text-destructive">Error al guardar</span>
                    ) : (titleSaveStatus.status === 'saved' && contentSaveStatus.status === 'saved') ? (
                        <span className="text-muted-foreground/50">Todos los cambios guardados</span>
                    ) : (
                        <span>Pendiente...</span>
                    )}
                </div>
            </div>

            {/* 5. DIALOGS */}
            <NoteDialog
                isOpen={noteDialogOpen}
                selectedText={noteSelectedText}
                onClose={() => {
                    setNoteDialogOpen(false);
                    setNoteSelectedText('');
                    setNoteSelectionOffsets(null);
                    setNoteActiveEditorRef(null);
                }}
                onSubmit={handleNoteSubmit}
            />
        </div>
    );
}
