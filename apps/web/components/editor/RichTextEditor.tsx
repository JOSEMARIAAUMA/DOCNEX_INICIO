'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { useEffect, useState, useRef } from 'react';
import { marked } from 'marked';
import { AIActionExtension } from './extensions/AIActionExtension';
import FloatingContextToolbar from './FloatingContextToolbar';

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
    onExtractSelection?: (text: string) => void;
    onCommentSelection?: (text: string, comment: string) => void;
    hideToolbar?: boolean;
}

// Convert markdown to HTML if needed
function parseContent(content: string): string {
    if (!content) return '';
    // Enhanced regex to catch Headers (#, ##), bold, lists, etc.
    const markdownPatterns = /^(#|\*\*|__|-\s|\*\s|\d+\.|>|\|)/m;
    if (markdownPatterns.test(content) || content.includes('\n')) {
        return marked.parse(content, { async: false }) as string;
    }
    return content;
}

// Toolbar button component
function ToolbarButton({
    onClick,
    active,
    disabled,
    title,
    children
}: {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${active ? 'bg-primary/20 text-primary' : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
            {children}
        </button>
    );
}

function ToolbarSeparator() {
    return <div className="w-px h-6 bg-border mx-1" />;
}

// Dropdown menu component - hover-based for better UX
function ToolbarDropdown({
    icon,
    title,
    children
}: {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsOpen(true);
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
    };

    return (
        <div
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                type="button"
                title={title}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            >
                {icon}
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 min-w-[120px] py-1">
                    {children}
                </div>
            )}
        </div>
    );
}

function DropdownItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent text-foreground flex items-center gap-2 transition-colors"
        >
            {children}
        </button>
    );
}

// Main formatting toolbar
function EditorToolbar({
    editor,
    onExtract,
    onComment
}: {
    editor: Editor | null;
    onExtract: () => void;
    onComment: () => void;
}) {
    if (!editor) return null;

    return (
        <div className="flex items-center gap-0.5 p-2 border-b border-border bg-muted/30 flex-wrap">
            {/* Text formatting group */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                active={editor.isActive('bold')}
                title="Negrita (Ctrl+B)"
            >
                <span className="font-bold text-sm">B</span>
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                active={editor.isActive('italic')}
                title="Cursiva (Ctrl+I)"
            >
                <span className="italic text-sm">I</span>
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                active={editor.isActive('strike')}
                title="Tachado"
            >
                <span className="line-through text-sm">S</span>
            </ToolbarButton>

            <ToolbarSeparator />

            {/* Highlight colors dropdown */}
            <ToolbarDropdown icon={<span>🎨</span>} title="Resaltar">
                <DropdownItem onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}>
                    <span className="w-4 h-4 rounded bg-yellow-200 border" /> Amarillo
                </DropdownItem>
                <DropdownItem onClick={() => editor.chain().focus().toggleHighlight({ color: '#bbf7d0' }).run()}>
                    <span className="w-4 h-4 rounded bg-green-200 border" /> Verde
                </DropdownItem>
                <DropdownItem onClick={() => editor.chain().focus().toggleHighlight({ color: '#fecaca' }).run()}>
                    <span className="w-4 h-4 rounded bg-red-200 border" /> Rojo
                </DropdownItem>
                <DropdownItem onClick={() => editor.chain().focus().toggleHighlight({ color: '#bfdbfe' }).run()}>
                    <span className="w-4 h-4 rounded bg-blue-200 border border-black/10" /> Azul
                </DropdownItem>
                <DropdownItem onClick={() => editor.chain().focus().unsetHighlight().run()}>
                    <span className="w-4 h-4 rounded bg-transparent border border-border flex items-center justify-center text-[10px] text-muted-foreground">✕</span> Quitar
                </DropdownItem>
                <DropdownItem onClick={() => editor.chain().focus().toggleHighlight({ color: '#dcfce7' }).run()}>
                    <span className="w-4 h-4 rounded bg-green-100 border border-green-300 flex items-center justify-center text-[10px]" title="Fuente Verificada">💎</span> Top Quality
                </DropdownItem>
            </ToolbarDropdown>

            <ToolbarSeparator />

            {/* Headings dropdown */}
            <ToolbarDropdown icon={<span className="text-xs font-bold">H</span>} title="Títulos">
                <DropdownItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
                    <span className="font-bold text-lg">H1</span> Título
                </DropdownItem>
                <DropdownItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                    <span className="font-bold text-base">H2</span> Subtítulo
                </DropdownItem>
                <DropdownItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
                    <span className="font-bold text-sm">H3</span> Sección
                </DropdownItem>
                <DropdownItem onClick={() => editor.chain().focus().setParagraph().run()}>
                    <span className="text-sm">¶</span> Normal
                </DropdownItem>
            </ToolbarDropdown>

            {/* Lists dropdown */}
            <ToolbarDropdown icon={<span className="text-sm">≡</span>} title="Listas">
                <DropdownItem onClick={() => editor.chain().focus().toggleBulletList().run()}>
                    <span>•</span> Con viñetas
                </DropdownItem>
                <DropdownItem onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                    <span>1.</span> Numerada
                </DropdownItem>
                <DropdownItem onClick={() => editor.chain().focus().toggleBlockquote().run()}>
                    <span>"</span> Cita
                </DropdownItem>
            </ToolbarDropdown>

            <ToolbarSeparator />

            {/* Selection actions - IMPORTANT */}
            <ToolbarButton onClick={onExtract} title="Crear extracto de recurso">
                <span>📦</span>
            </ToolbarButton>

            <ToolbarButton onClick={onComment} title="Añadir comentario">
                <span>💬</span>
            </ToolbarButton>

            <ToolbarSeparator />

            {/* Undo/Redo */}
            <ToolbarButton
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                title="Deshacer (Ctrl+Z)"
            >
                <span className="text-sm">↩</span>
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                title="Rehacer (Ctrl+Y)"
            >
                <span className="text-sm">↪</span>
            </ToolbarButton>
        </div>
    );
}

export default function RichTextEditor({
    content,
    onChange,
    placeholder = 'Comienza a escribir...',
    onExtractSelection,
    onCommentSelection,
    hideToolbar = false,
}: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
            Placeholder.configure({ placeholder }),
            Highlight.configure({ multicolor: true }),
            TextStyle,
            Color,
            AIActionExtension,
        ],
        content: parseContent(content),
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: 'focus:outline-none min-h-[200px] px-4 py-3',
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    useEffect(() => {
        if (editor && content) {
            const parsedContent = parseContent(content);
            const currentHTML = editor.getHTML();
            if (parsedContent !== currentHTML && !currentHTML.includes(content.substring(0, 50))) {
                editor.commands.setContent(parsedContent);
            }
        }
    }, [content, editor]);

    const getSelectedText = (): string => {
        if (!editor) return '';
        const { from, to } = editor.state.selection;
        return editor.state.doc.textBetween(from, to, ' ');
    };

    const handleExtract = () => {
        const text = getSelectedText();
        if (!text) {
            alert('Selecciona texto primero para crear un extracto.');
            return;
        }
        if (onExtractSelection) {
            onExtractSelection(text);
        } else {
            alert(`📦 Extracto pendiente de implementar.\n\nTexto seleccionado:\n"${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
        }
    };

    const handleComment = () => {
        const text = getSelectedText();
        if (!text) {
            alert('Selecciona texto primero para añadir un comentario.');
            return;
        }
        const comment = prompt('Escribe tu comentario:');
        if (comment) {
            if (onCommentSelection) {
                onCommentSelection(text, comment);
            } else {
                // Insert comment as HTML comment after selection
                const { to } = editor!.state.selection;
                editor!.chain().focus().insertContentAt(to, ` <span class="comment-marker" title="${comment}">💬</span>`).run();
            }
        }
    };

    return (
        <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
            {!hideToolbar && (
                <EditorToolbar
                    editor={editor}
                    onExtract={handleExtract}
                    onComment={handleComment}
                />
            )}

            <div className="editor-content relative">
                <FloatingContextToolbar editor={editor} />
                <EditorContent editor={editor} />
            </div>

            <style jsx global>{`
                .editor-content .ProseMirror {
                    min-height: 200px;
                    padding: 1.5rem;
                    color: var(--foreground);
                }
                .editor-content .ProseMirror:focus { outline: none; }
                .editor-content .ProseMirror h1 {
                    font-size: 2.25rem;
                    font-weight: 800;
                    line-height: 1.2;
                    margin-bottom: 1rem;
                    color: var(--foreground);
                    border-bottom: 2px solid var(--border);
                    padding-bottom: 0.5rem;
                }
                .editor-content .ProseMirror h2 {
                    font-size: 1.75rem;
                    font-weight: 700;
                    margin-top: 2rem;
                    margin-bottom: 0.75rem;
                    color: var(--foreground);
                }
                .editor-content .ProseMirror h3 {
                    font-size: 1.4rem;
                    font-weight: 600;
                    margin-top: 1.5rem;
                    margin-bottom: 0.75rem;
                    color: var(--foreground);
                }
                .editor-content .ProseMirror p { margin-bottom: 1rem; line-height: 1.7; }
                .editor-content .ProseMirror ul {
                    list-style-type: disc;
                    padding-left: 1.5rem;
                    margin-bottom: 1rem;
                }
                .editor-content .ProseMirror ol {
                    list-style-type: decimal;
                    padding-left: 1.5rem;
                    margin-bottom: 1rem;
                }
                .editor-content .ProseMirror li { margin-bottom: 0.375rem; line-height: 1.6; }
                .editor-content .ProseMirror blockquote {
                    border-left: 4px solid var(--primary);
                    padding: 1rem 1.25rem;
                    margin: 1.5rem 0;
                    font-style: italic;
                    color: var(--muted-foreground);
                    background-color: var(--muted);
                    border-radius: 0 0.75rem 0.75rem 0;
                }
                .editor-content .ProseMirror code {
                    background-color: var(--muted);
                    color: var(--primary);
                    padding: 0.2rem 0.4rem;
                    border-radius: 0.375rem;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                    font-size: 0.9em;
                }
                .editor-content .ProseMirror pre {
                    background-color: var(--muted);
                    color: var(--foreground);
                    padding: 1.25rem;
                    border-radius: 0.75rem;
                    overflow-x: auto;
                    margin: 1.5rem 0;
                    border: 1px solid var(--border);
                }
                .editor-content .ProseMirror pre code { background: none; color: inherit; padding: 0; }
                .editor-content .ProseMirror strong { font-weight: 700; color: var(--foreground); }
                .editor-content .ProseMirror em { font-style: italic; }
                .editor-content .ProseMirror s { text-decoration: line-through; }
                .editor-content .ProseMirror mark { 
                    padding: 0.125rem 0; 
                    background-color: var(--primary); 
                    color: inherit; 
                }
                .editor-content .ProseMirror table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 1.5rem 0;
                }
                .editor-content .ProseMirror th, .editor-content .ProseMirror td {
                    border: 1px solid var(--border);
                    padding: 0.75rem 1rem;
                    text-align: left;
                }
                .editor-content .ProseMirror th { background-color: var(--muted); font-weight: 700; color: var(--foreground); }
                .editor-content .ProseMirror hr { border: none; border-top: 2px solid var(--border); margin: 2rem 0; }
                .editor-content .ProseMirror p.is-editor-empty:first-child::before {
                    color: var(--muted-foreground);
                    content: attr(data-placeholder);
                    float: left;
                    height: 0;
                    pointer-events: none;
                    font-style: italic;
                }
                .editor-content .comment-marker {
                    cursor: help;
                    font-size: 0.875rem;
                    background-color: var(--primary/20);
                    color: var(--primary);
                    padding: 0 0.2rem;
                    border-radius: 0.25rem;
                }
            `}</style>
        </div>
    );
}
