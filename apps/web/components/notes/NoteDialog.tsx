'use client';

import { useState } from 'react';

interface NoteDialogProps {
    isOpen: boolean;
    selectedText: string;
    onClose: () => void;
    onSubmit: (content: string, type: 'review' | 'ai_instruction') => void;
}

export default function NoteDialog({ isOpen, selectedText, onClose, onSubmit }: NoteDialogProps) {
    const [noteType, setNoteType] = useState<'review' | 'ai_instruction' | null>(null);
    const [content, setContent] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!noteType || !content.trim()) return;
        onSubmit(content, noteType);
        setNoteType(null);
        setContent('');
    };

    const handleClose = () => {
        setNoteType(null);
        setContent('');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-border">
                {/* Header */}
                <div className="px-5 py-4 border-b border-border bg-muted">
                    <h3 className="text-lg font-semibold text-foreground">
                        {noteType === null ? 'Crear Nota' : noteType === 'review' ? '📝 Comentario de Revisión' : '🤖 Instrucción para IA'}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                        Texto: "{selectedText.substring(0, 50)}{selectedText.length > 50 ? '...' : ''}"
                    </p>
                </div>

                {/* Content */}
                <div className="p-5">
                    {noteType === null ? (
                        // Step 1: Choose type
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground mb-4">Selecciona el tipo de nota:</p>

                            <button
                                onClick={() => setNoteType('review')}
                                className="w-full p-4 border-2 border-border rounded-lg text-left hover:border-primary hover:bg-primary/5 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">📝</span>
                                    <div>
                                        <div className="font-medium text-foreground group-hover:text-primary">
                                            Comentario de Revisión
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Notas personales, correcciones, observaciones
                                        </div>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => setNoteType('ai_instruction')}
                                className="w-full p-4 border-2 border-border rounded-lg text-left hover:border-primary hover:bg-primary/5 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">🤖</span>
                                    <div>
                                        <div className="font-medium text-foreground group-hover:text-primary">
                                            Instrucción para IA
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Indicaciones para procesamiento con IA
                                        </div>
                                    </div>
                                </div>
                            </button>
                        </div>
                    ) : (
                        // Step 2: Enter content
                        <div className="space-y-4">
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder={noteType === 'review'
                                    ? 'Escribe tu comentario...'
                                    : 'Describe qué debe hacer la IA con este texto...'}
                                className="w-full h-32 p-3 border border-border bg-background text-foreground rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                                autoFocus
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-border bg-muted flex justify-between">
                    <button
                        onClick={noteType ? () => setNoteType(null) : handleClose}
                        className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {noteType ? '← Volver' : 'Cancelar'}
                    </button>

                    {noteType && (
                        <button
                            onClick={handleSubmit}
                            disabled={!content.trim()}
                            className={`px-6 py-2 rounded-lg font-medium transition-all ${content.trim()
                                    ? 'bg-primary text-primary-foreground hover:opacity-90'
                                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                                }`}
                        >
                            Crear Nota
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
