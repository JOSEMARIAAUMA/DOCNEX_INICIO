'use client';

import { useState, useEffect } from 'react';
import { BlockComment, BlockCommentReply } from '@docnex/shared';
import { updateBlockComment, listCommentReplies, addCommentReply } from '@/lib/api';
import { X, Send, Paperclip, Link as LinkIcon, MessageSquare, Clock, CheckCircle2 } from 'lucide-react';

interface NoteDetailsPanelProps {
    isOpen: boolean;
    note: BlockComment | null;
    noteNumber: number;
    onClose: () => void;
    onUpdate: () => void;
}

export default function NoteDetailsPanel({ isOpen, note, noteNumber, onClose, onUpdate }: NoteDetailsPanelProps) {
    const [content, setContent] = useState('');
    const [noteType, setNoteType] = useState<'review' | 'ai_instruction'>('review');
    const [links, setLinks] = useState<string>('');
    const [replies, setReplies] = useState<BlockCommentReply[]>([]);
    const [newReply, setNewReply] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'content' | 'followup' | 'attachments'>('content');

    useEffect(() => {
        if (note && isOpen) {
            setContent(note.content);
            setNoteType(note.comment_type);
            const metaLinks = (note.meta?.links as string[]) || [];
            setLinks(metaLinks.join('\n'));
            loadReplies();
        }
    }, [note, isOpen]);

    const loadReplies = async () => {
        if (!note) return;
        try {
            const data = await listCommentReplies(note.id);
            setReplies(data);
        } catch (err) {
            console.error('Error loading replies:', err);
        }
    };

    const handleSave = async () => {
        if (!note) return;
        setLoading(true);
        try {
            const linkList = links.split('\n').filter(l => l.trim().startsWith('http'));
            await updateBlockComment(note.id, {
                content,
                comment_type: noteType,
                meta: { ...(note.meta || {}), links: linkList }
            });
            onUpdate();
        } catch (err) {
            console.error('Save failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddReply = async () => {
        if (!note || !newReply.trim()) return;
        try {
            await addCommentReply(note.id, newReply);
            setNewReply('');
            loadReplies();
        } catch (err) {
            console.error('Error adding reply:', err);
        }
    };

    return (
        <div
            className={`absolute top-0 right-0 h-full bg-card border-l border-border shadow-2xl z-50 transition-transform duration-500 ease-in-out transform flex flex-col w-full ${isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
        >
            {/* Header */}
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg ${noteType === 'ai_instruction' ? 'bg-primary text-primary-foreground' : 'bg-blue-500 text-white'
                        }`}>
                        {noteNumber}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Detalles de la Nota</h2>
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 leading-none">
                            {noteType === 'ai_instruction' ? '🤖 IA Instruction' : '📝 Revision Note'}
                        </span>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-all hover:rotate-90 duration-300">
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex px-6 pt-4 gap-4 border-b border-border bg-muted/20 shrink-0">
                <button
                    onClick={() => setActiveTab('content')}
                    className={`pb-3 text-sm font-bold transition-all relative ${activeTab === 'content' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Detalles
                    {activeTab === 'content' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full" />}
                </button>
                <button
                    onClick={() => setActiveTab('attachments')}
                    className={`pb-3 text-sm font-bold transition-all relative ${activeTab === 'attachments' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Adjuntos
                    {activeTab === 'attachments' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full" />}
                </button>
                <button
                    onClick={() => setActiveTab('followup')}
                    className={`pb-3 text-sm font-bold transition-all relative ${activeTab === 'followup' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Seguimiento ({replies.length})
                    {activeTab === 'followup' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full" />}
                </button>
            </div>

            {/* Content Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {activeTab === 'content' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Note Type Selector */}
                        <div className="space-y-3">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                                Tipo de Nota
                            </label>
                            <div className="flex gap-2 bg-muted/50 p-2 rounded-xl border border-border/50">
                                <button
                                    onClick={() => setNoteType('review')}
                                    className={`flex-1 px-4 py-2.5 text-xs font-bold rounded-lg transition-all ${noteType === 'review' ? 'bg-blue-500 text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                                >
                                    📝 REVISIÓN
                                </button>
                                <button
                                    onClick={() => setNoteType('ai_instruction')}
                                    className={`flex-1 px-4 py-2.5 text-xs font-bold rounded-lg transition-all ${noteType === 'ai_instruction' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                                >
                                    🤖 INSTRUCCIÓN IA
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <MessageSquare className="w-3.5 h-3.5" /> Contenido de la Nota
                            </label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="w-full min-h-[180px] p-5 bg-background border-2 border-border rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-[15px] leading-relaxed"
                                placeholder="Escribe el detalle aquí..."
                            />
                        </div>

                        {note?.text_selection && (
                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5" /> Texto Referenciado
                                </label>
                                <div className="p-4 bg-muted/50 border-2 border-border/50 rounded-2xl italic text-[13px] text-muted-foreground leading-relaxed">
                                    "{note.text_selection}"
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'attachments' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-3">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <LinkIcon className="w-3.5 h-3.5" /> Enlaces y Referencias
                            </label>
                            <textarea
                                value={links}
                                onChange={(e) => setLinks(e.target.value)}
                                className="w-full min-h-[150px] p-5 bg-background border-2 border-border rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-mono text-xs leading-relaxed"
                                placeholder="Pega un enlace por línea..."
                            />
                            <p className="text-[10px] text-muted-foreground bg-muted p-2 rounded-lg">
                                Tip: Añade enlaces a documentos de apoyo, imágenes o recursos externos para acceso rápido.
                            </p>
                        </div>

                        {/* Display parsed links as clickable cards */}
                        <div className="grid grid-cols-1 gap-3">
                            {links.split('\n').filter(l => l.trim().startsWith('http')).map((url, i) => (
                                <a
                                    key={i}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-3 bg-card border border-border rounded-xl flex items-center gap-3 hover:border-primary/50 transition-colors group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary/10">
                                        <Paperclip className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 truncate">
                                        <div className="text-xs font-medium truncate">{url.split('/').pop() || 'Enlace'}</div>
                                        <div className="text-[10px] text-muted-foreground truncate">{url}</div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'followup' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-4">
                            {replies.length === 0 ? (
                                <div className="py-12 flex flex-col items-center justify-center text-muted-foreground/40 gap-3 border-2 border-dashed border-border/50 rounded-3xl">
                                    <MessageSquare className="w-12 h-12" />
                                    <p className="text-sm font-medium">No hay comentarios de seguimiento</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {replies.map((reply, i) => (
                                        <div key={reply.id} className="flex gap-3 items-start group">
                                            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0 border-2 border-background">
                                                {reply.user_id ? 'U' : 'A'}
                                            </div>
                                            <div className="flex-1">
                                                <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-none shadow-sm group-hover:shadow-md transition-shadow">
                                                    <p className="text-[14px] leading-relaxed text-foreground/90">{reply.content}</p>
                                                </div>
                                                <div className="mt-1 ml-1 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                                                    {new Date(reply.created_at).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-border bg-muted/40 shrink-0">
                {activeTab === 'followup' ? (
                    <div className="flex items-center gap-3">
                        <div className="flex-1 relative">
                            <input
                                value={newReply}
                                onChange={(e) => setNewReply(e.target.value)}
                                placeholder="Escribe al hilo..."
                                className="w-full p-4 pr-12 bg-background border-2 border-border rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm"
                                onKeyPress={(e) => e.key === 'Enter' && handleAddReply()}
                            />
                            <button
                                onClick={handleAddReply}
                                disabled={!newReply.trim()}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-primary text-primary-foreground rounded-xl disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all shadow-md"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-4">
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="flex-1 bg-primary text-primary-foreground py-4 rounded-2xl font-bold shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                            Guardar Cambios
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
