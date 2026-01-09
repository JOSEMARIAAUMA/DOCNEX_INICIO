'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DocumentBlock, Resource, BlockResourceLink, BlockVersion } from '@docnex/shared';
import { updateBlock, updateBlockTitle, listBlockLinks, removeLink, createResourceExtract, createLink, createBlockComment, listBlockComments } from '@/lib/api';
import { processAutoLinks } from '@/lib/ai/semantic-engine';
import { supabase } from '@/lib/supabase/client';
import type { BlockComment } from '@docnex/shared';
import { Editor } from '@tiptap/react';
import SimpleEditor, { SimpleEditorHandle } from '../editor/SimpleEditor';
import SharedToolbar from '../editor/SharedToolbar';
import NoteDialog from '../notes/NoteDialog';
import { TagInput } from '../ui/TagInput';

interface BlockContentEditorProps {
    block: DocumentBlock;
    allBlocks: DocumentBlock[];
    resources: Resource[];
    onUpdate: () => void;
    onSplit: (splitIndex: number) => void;
    onCreateBlock?: (content: string, title: string) => void;
    comparingItem?: { id: string, title: string, content: string, label: string } | null;
    onCloseCompare?: () => void;
    onVersionUpdated?: () => void;
    onNoteCreated?: () => void;
    refreshTrigger?: number;
}

export default function BlockContentEditor({
    block,
    allBlocks,
    resources,
    onUpdate,
    onSplit,
    onCreateBlock,
    comparingItem,
    onCloseCompare,
    onVersionUpdated,
    onNoteCreated,
    refreshTrigger = 0
}: BlockContentEditorProps) {
    const [title, setTitle] = useState(block.title);
    const [content, setContent] = useState(block.content);
    const [tags, setTags] = useState<string[]>(block.tags || []);
    const [links, setLinks] = useState<BlockResourceLink[]>([]);
    const [notes, setNotes] = useState<BlockComment[]>([]);
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [saving, setSaving] = useState(false);

    // State for version editing
    const [versionTitle, setVersionTitle] = useState('');
    const [versionContent, setVersionContent] = useState('');
    const [isVersionDirty, setIsVersionDirty] = useState(false);
    const [savingVersion, setSavingVersion] = useState(false);

    // Track which editor is active for shared toolbar
    const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
    const mainEditorRef = useRef<SimpleEditorHandle>(null);
    const versionEditorRef = useRef<SimpleEditorHandle>(null);

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
    }, [notes, block.id]);

    // Initialize version state when comparingItem changes
    useEffect(() => {
        if (comparingItem) {
            setVersionTitle(comparingItem.title || '');
            setVersionContent(comparingItem.content || '');
            setIsVersionDirty(false);
        }
    }, [comparingItem?.id]);

    // Set main editor as active by default
    useEffect(() => {
        if (mainEditorRef.current) {
            const editor = mainEditorRef.current.getEditor();
            if (editor && !activeEditor) {
                setActiveEditor(editor);
            }
        }
    }, [mainEditorRef.current, activeEditor]);

    const loadLinks = useCallback(async () => {
        const fetchedLinks = await listBlockLinks(block.id);
        setLinks(fetchedLinks);
    }, [block.id]);

    // Initial load when block changes
    useEffect(() => {
        setTitle(block.title);
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
        setSaving(true);
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
            setSaving(false);
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

        // Since we are using HTML in the editor, we should ideally split at a position that makes sense.
        // For simplicity, we'll use the character offset in the text, but splitBlock expects a position in the content.
        // Simplest way is to notify parent with the split index if possible, or just use character offset.
        onSplit(from);
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
            {/* Header with title */}
            <div className="p-4 border-b border-border bg-card">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                        setTitle(e.target.value);
                        setIsDirty(true);
                    }}
                    className="text-2xl font-bold bg-transparent border-b-2 border-transparent hover:border-border focus:border-primary focus:outline-none w-full transition-all text-foreground"
                    placeholder="Título del bloque..."
                />

                {/* Tag Input */}
                <div className="mt-3">
                    <TagInput
                        tags={tags}
                        onTagsChange={(newTags) => {
                            setTags(newTags);
                            setIsDirty(true);
                        }}
                    />
                </div>
            </div>

            {/* SHARED TOOLBAR - controls whichever editor has focus */}
            <SharedToolbar
                editor={activeEditor}
                onExtract={handleExtract}
                onComment={handleComment}
                onSplit={handleLocalSplit}
            />

            {/* Main content area - split when comparing */}
            <div className={`flex-1 overflow-hidden flex ${comparingItem ? 'flex-col' : ''}`}>
                {/* Current version editor */}
                <div className={`overflow-y-auto p-6 min-h-0 ${comparingItem ? 'flex-1 border-b border-border' : 'flex-1'}`}>
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
                                            disabled={saving}
                                            className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded hover:opacity-90 disabled:opacity-50 transition-all font-medium"
                                        >
                                            {saving ? 'Guardando...' : 'Guardar'}
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

                    {/* Linked resources - only when not comparing */}
                    {!comparingItem && links.length > 0 && (
                        <div className="mt-8 p-4 bg-muted/20 border border-border rounded-xl">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3 tracking-widest">
                                Recursos vinculados
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {links.map(link => {
                                    const resource = (link as unknown as { resource: Resource }).resource;
                                    return (
                                        <span
                                            key={link.id}
                                            className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/10"
                                        >
                                            📎 {resource?.title || 'Recurso'}
                                            <button
                                                onClick={() => handleUnlink(link.id)}
                                                className="text-primary/60 hover:text-red-500 ml-1 transition-colors"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Compared version panel - EDITABLE */}
                {comparingItem && (
                    <div className="flex-1 overflow-y-auto bg-muted/40 border-t-4 border-primary/30 min-h-0">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-bold text-primary bg-primary/20 px-3 py-1 rounded-full uppercase tracking-wider">
                                    {comparingItem.label}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            const editor = mainEditorRef.current?.getEditor();
                                            if (editor) {
                                                editor.chain().focus().insertContent(` [Ref: ${comparingItem.title}] `).run();
                                            }
                                        }}
                                        className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600 transition-all font-medium flex items-center gap-1"
                                        title="Insertar cita a este bloque en el texto principal"
                                    >
                                        🔗 Citar
                                    </button>
                                    <button
                                        onClick={handleSubstitute}
                                        className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded hover:bg-amber-600 transition-all font-medium flex items-center gap-1"
                                        title="Sustituir el bloque actual con este contenido"
                                    >
                                        🔄 Sustituir
                                    </button>
                                    {isVersionDirty && comparingItem.label.includes('VERSIÓN') && (
                                        <button
                                            onClick={handleSaveVersion}
                                            disabled={savingVersion}
                                            className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded hover:opacity-90 disabled:opacity-50 transition-all font-medium"
                                        >
                                            {savingVersion ? 'Guardando...' : 'Guardar cambios'}
                                        </button>
                                    )}
                                    <button
                                        onClick={onCloseCompare}
                                        className="text-xs text-muted-foreground hover:text-foreground bg-card px-3 py-1.5 rounded border border-border flex items-center gap-1 transition-all"
                                    >
                                        ✕ Cerrar
                                    </button>
                                </div>
                            </div>

                            {/* Version title - editable */}
                            <input
                                type="text"
                                value={versionTitle}
                                onChange={(e) => {
                                    setVersionTitle(e.target.value);
                                    setIsVersionDirty(true);
                                }}
                                className="w-full text-lg font-bold text-foreground mb-4 bg-card border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                                placeholder="Título de la versión..."
                            />

                            {/* Version content - EDITABLE */}
                            <SimpleEditor
                                ref={versionEditorRef}
                                content={versionContent}
                                onChange={handleVersionContentChange}
                                placeholder="Contenido de la versión..."
                                onFocus={handleVersionEditorFocus}
                                onNoteClick={handleNoteClick}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom action bar - only when NOT comparing */}
            {!comparingItem && (
                <div className="p-4 border-t border-border bg-card flex items-center justify-between">
                    <div className="text-xs text-muted-foreground italic">
                        {isDirty && '● Cambios sin guardar'}
                    </div>

                    <div className="flex gap-3">
                        {isDirty && (
                            <button
                                onClick={handleRevert}
                                className="text-sm text-muted-foreground px-4 py-2 hover:text-foreground hover:bg-muted rounded-lg transition-all"
                            >
                                Descartar
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={!isDirty || saving}
                            className={`px-8 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm ${isDirty && !saving
                                ? 'bg-primary text-primary-foreground hover:opacity-90 active:scale-95'
                                : 'bg-muted text-muted-foreground cursor-not-allowed'
                                }`}
                        >
                            {saving ? 'Guardando...' : '💾 Guardar Cambios'}
                        </button>
                    </div>
                </div>
            )}

            {/* Note Dialog */}
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
