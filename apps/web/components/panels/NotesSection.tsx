'use client';

import { useState, useEffect } from 'react';
import { BlockComment } from '@docnex/shared';
import { listBlockComments, createBlockComment, resolveBlockComment, deleteBlockComment, updateBlockComment } from '@/lib/api';
import NoteDetailsPanel from '../notes/NoteDetailsPanel';

interface NotesSectionProps {
    blockId: string | null;
    onAddNote?: () => void;
    refreshTrigger?: number;
    selectedNoteId?: string | null;
    onScrollToEditor?: (noteId: string) => void;
    onOpenDetail?: (note: BlockComment, number: number) => void;
    onNotesUpdated?: () => void;
}

export default function NotesSection({ blockId, onAddNote, refreshTrigger = 0, selectedNoteId, onScrollToEditor, onOpenDetail, onNotesUpdated }: NotesSectionProps) {
    const [notes, setNotes] = useState<BlockComment[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newNoteContent, setNewNoteContent] = useState('');
    const [newNoteType, setNewNoteType] = useState<'review' | 'ai_instruction'>('review');
    const [viewMode, setViewMode] = useState<'active' | 'history'>('active');

    useEffect(() => {
        if (blockId) {
            loadNotes();
        } else {
            setNotes([]);
        }
    }, [blockId, refreshTrigger]);

    // Handle scrolling when a note is selected in the editor
    useEffect(() => {
        if (selectedNoteId) {
            const element = document.getElementById(`note-card-${selectedNoteId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [selectedNoteId]);

    const loadNotes = async () => {
        if (!blockId) return;
        setLoading(true);
        try {
            const data = await listBlockComments(blockId);
            setNotes(data || []);
        } catch (err) {
            console.error('Error loading notes:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddNote = async () => {
        if (!blockId || !newNoteContent.trim()) return;

        try {
            await createBlockComment(blockId, '', newNoteContent, newNoteType);
            setNewNoteContent('');
            setShowAddForm(false);
            await loadNotes();
            onNotesUpdated?.();
        } catch (err) {
            console.error('Error creating note:', err);
        }
    };


    const handleResolve = async (noteId: string) => {
        try {
            await resolveBlockComment(noteId);
            await loadNotes();
            onNotesUpdated?.();
        } catch (err) {
            console.error('Error resolving note:', err);
        }
    };

    const handleUnresolve = async (noteId: string) => {
        try {
            await updateBlockComment(noteId, { resolved: false });
            await loadNotes();
            onNotesUpdated?.();
        } catch (err) {
            console.error('Error unresolving note:', err);
        }
    };

    const handleDelete = async (noteId: string) => {
        if (!confirm('¿Eliminar esta nota permanentemente?')) return;
        try {
            await deleteBlockComment(noteId);
            await loadNotes();
            onNotesUpdated?.();
        } catch (err) {
            console.error('Error deleting note:', err);
        }
    };

    // Filter notes based on view mode
    const activeNotes = notes.filter(n => !n.resolved);
    const resolvedNotes = notes.filter(n => n.resolved);
    const displayNotes = viewMode === 'active' ? activeNotes : resolvedNotes;

    if (!blockId) {
        return <p className="text-sm text-muted-foreground italic">Selecciona un bloque</p>;
    }

    return (
        <div className="flex flex-col h-full bg-background/50">
            {/* View Mode Toggle */}
            <div className="mb-4 flex gap-2 bg-muted/50 p-1.5 rounded-xl border border-border/50">
                <button
                    onClick={() => setViewMode('active')}
                    className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-all ${viewMode === 'active' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    📝 ACTIVAS ({activeNotes.length})
                </button>
                <button
                    onClick={() => setViewMode('history')}
                    className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-all ${viewMode === 'history' ? 'bg-muted text-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    ✅ HISTORIAL ({resolvedNotes.length})
                </button>
            </div>

            {viewMode === 'active' && (
                <div className="mb-6">
                    {!showAddForm ? (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="w-full py-4 px-4 bg-primary/5 text-primary border-2 border-dashed border-primary/20 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary/10 hover:border-primary/40 hover:scale-[1.01] transition-all text-sm group"
                        >
                            <span className="bg-primary/10 w-6 h-6 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">+</span>
                            Añadir nota rápida
                        </button>
                    ) : (
                        <div className="bg-card border-2 border-primary/30 rounded-2xl p-4 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                            <textarea
                                value={newNoteContent}
                                onChange={(e) => setNewNoteContent(e.target.value)}
                                placeholder="Escribe el contenido de la nota aquí..."
                                className="w-full p-4 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none min-h-[100px] resize-none leading-relaxed shadow-inner"
                                autoFocus
                            />
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex gap-1 bg-muted/50 p-1.5 rounded-xl border border-border/50">
                                    <button
                                        onClick={() => setNewNoteType('review')}
                                        className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${newNoteType === 'review' ? 'bg-white shadow-md text-blue-600' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        REVISIÓN
                                    </button>
                                    <button
                                        onClick={() => setNewNoteType('ai_instruction')}
                                        className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${newNoteType === 'ai_instruction' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        IA
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setShowAddForm(false)} className="text-xs font-bold text-muted-foreground px-3 py-2 hover:text-foreground transition-colors">Cancelar</button>
                                    <button onClick={handleAddNote} disabled={!newNoteContent.trim()} className="text-xs bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold shadow-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50">Guardar Nota</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Notes list */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground animate-pulse">Cargando notas...</p>
                </div>
            ) : displayNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/30 text-center px-6">
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-muted-foreground/20">
                        <span className="text-4xl opacity-50">{viewMode === 'active' ? '📋' : '✅'}</span>
                    </div>
                    <p className="text-sm font-medium italic mb-1">
                        {viewMode === 'active' ? 'Sin notas activas' : 'Sin notas resueltas'}
                    </p>
                    <p className="text-[11px] max-w-[180px]">
                        {viewMode === 'active' ? 'Usa el botón superior o el menú del editor para crear notas.' : 'Las notas marcadas como resueltas aparecerán aquí.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-5 pb-6">
                    {displayNotes.map((note, index) => {
                        // Calculate the note number based on its type within the current view
                        const notesOfSameType = displayNotes.filter(n => n.comment_type === note.comment_type);
                        const noteIndex = notesOfSameType.findIndex(n => n.id === note.id);
                        const noteNumber = noteIndex + 1;

                        return (
                            <div
                                key={note.id}
                                id={`note-card-${note.id}`}
                                onClick={() => viewMode === 'active' && onScrollToEditor?.(note.id)}
                                className={`bg-card border-2 rounded-2xl p-5 transition-all duration-300 relative shadow-sm hover:shadow-xl ${viewMode === 'active' ? 'cursor-pointer' : ''} group flex flex-col gap-3 ${selectedNoteId === note.id
                                    ? 'border-primary ring-4 ring-primary/10 scale-[1.03] z-10'
                                    : 'border-border hover:border-primary/40'
                                    } ${note.resolved ? 'opacity-70' : ''}`}
                            >
                                {/* Note number badge */}
                                <div className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] border-2 shadow-lg z-20 group-hover:scale-110 transition-transform ${note.comment_type === 'ai_instruction'
                                    ? 'bg-emerald-500 text-white border-white/20'
                                    : 'bg-blue-500 text-white border-white/20'
                                    }`}>
                                    {noteNumber}
                                </div>

                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-md ${note.comment_type === 'ai_instruction' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'
                                                }`}>
                                                {note.comment_type === 'ai_instruction' ? '🤖 Instrucción IA' : '📝 Revisión'}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground font-medium">#{note.id.substring(0, 4)}</span>
                                        </div>
                                        <p className={`text-[13px] leading-relaxed line-clamp-3 transition-colors ${note.resolved ? 'line-through text-muted-foreground' : 'text-foreground/90 font-medium group-hover:text-foreground'}`}>
                                            {note.content}
                                        </p>

                                        {/* Footer indicators */}
                                        <div className="mt-3 flex items-center gap-3">
                                            {Array.isArray(note.meta?.links) && (note.meta?.links as any[]).length > 0 && (
                                                <span className="text-[10px] font-bold text-primary/80 bg-primary/5 px-2 py-1 rounded-lg border border-primary/10 flex items-center gap-1">
                                                    📎 {(note.meta?.links as any[]).length}
                                                </span>
                                            )}
                                            {note.text_selection && (
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
                                                    <span className="w-1 h-3 bg-primary/30 rounded-full" />
                                                    <span className="italic truncate max-w-[120px]">"{String(note.text_selection)}"</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                        {viewMode === 'active' ? (
                                            <>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleResolve(note.id); }}
                                                    className="p-2 bg-green-500/10 hover:bg-green-500 text-green-600 hover:text-white rounded-xl transition-all shadow-sm"
                                                    title="Marcar como resuelto"
                                                >
                                                    ✓
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onOpenDetail?.(note, noteNumber); }}
                                                    className="p-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl transition-all shadow-sm"
                                                    title="Editar detalles"
                                                >
                                                    ✏️
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleUnresolve(note.id); }}
                                                className="p-2 bg-amber-500/10 hover:bg-amber-500 text-amber-600 hover:text-white rounded-xl transition-all shadow-sm"
                                                title="Reactivar nota"
                                            >
                                                ↩️
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                                            className="p-2 bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white rounded-xl transition-all shadow-sm"
                                            title="Eliminar"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
