'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { NoteMarker } from './extensions/NoteMarker';
import { useEffect, useImperativeHandle, forwardRef } from 'react';
import { marked } from 'marked';

// Convert markdown to HTML if needed
function parseContent(content: string): string {
    if (!content) return '';

    // If it clearly looks like HTML (Tiptap output), don't parse as markdown
    const isHTML = content.trim().startsWith('<') || content.includes('</span>') || content.includes('</p>');
    if (isHTML) return content;

    const markdownPatterns = /(\*\*|__|##|^\s*[-*+]\s|\n\||\[.*\]\(.*\))/m;
    if (markdownPatterns.test(content)) {
        return marked.parse(content, { async: false }) as string;
    }
    return content;
}

export interface SimpleEditorHandle {
    getEditor: () => Editor | null;
    getSelectedText: () => string;
    getSelectionOffsets: () => { from: number; to: number } | null;
    insertNoteMarker: (noteNumber: number, noteType: 'review' | 'ai_instruction', noteId: string) => void;
    scrollToSelector: (selector: string) => void;
}

interface SimpleEditorProps {
    id?: string;
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
    onFocus?: () => void;
    onNoteClick?: (noteId: string) => void;
}

const SimpleEditor = forwardRef<SimpleEditorHandle, SimpleEditorProps>(({
    id,
    content,
    onChange,
    placeholder = 'Comienza a escribir...',
    onFocus,
    onNoteClick
}, ref) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
            Placeholder.configure({ placeholder }),
            Highlight.configure({ multicolor: true }),
            TextStyle,
            Color,
            NoteMarker,
        ],
        content: parseContent(content),
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: 'focus:outline-none min-h-[200px] px-4 py-3',
            },
            handleClick: (view, pos, event) => {
                const target = event.target as HTMLElement;
                // Check if target or parent is a note-ref
                const noteRef = target.closest('.note-ref');
                if (noteRef) {
                    const noteId = noteRef.getAttribute('data-note-id');
                    if (noteId && onNoteClick) {
                        onNoteClick(noteId);
                        return true;
                    }
                }
                return false;
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        onFocus: () => {
            if (onFocus) onFocus();
        },
    });

    useEffect(() => {
        if (editor && content) {
            const parsedContent = parseContent(content);
            const currentHTML = editor.getHTML();
            if (parsedContent !== currentHTML) {
                editor.commands.setContent(parsedContent);
            }
        }
    }, [content, editor]);

    const handle: SimpleEditorHandle = {
        getEditor: () => editor,
        getSelectedText: () => {
            if (!editor) return '';
            const { from, to } = editor.state.selection;
            return editor.state.doc.textBetween(from, to, ' ');
        },
        getSelectionOffsets: () => {
            if (!editor) return null;
            const { from, to } = editor.state.selection;
            if (from === to) return null;
            return { from, to };
        },
        insertNoteMarker: (noteNumber: number, noteType: 'review' | 'ai_instruction', noteId: string) => {
            if (!editor) return;
            const { to } = editor.state.selection;

            editor.chain().focus()
                .setTextSelection(to)
                .insertContent({
                    type: 'noteMarker',
                    attrs: {
                        noteId: noteId,
                        number: noteNumber,
                        type: noteType,
                    },
                })
                .run();
        },
        scrollToSelector: (selector: string) => {
            const element = document.querySelector(selector);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Add a temporary highlight effect
                element.classList.add('note-highlight-pulse');
                setTimeout(() => element.classList.remove('note-highlight-pulse'), 3000);
            }
        }
    };

    useImperativeHandle(ref, () => handle);

    return (
        <div
            id={id}
            ref={(el) => {
                if (el) (el as any).editorHandle = handle;
            }}
            className="border border-border rounded-xl bg-card overflow-hidden shadow-sm"
        >
            <div className="editor-content">
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
                    line-height: 1.3;
                    margin-bottom: 0.75rem;
                    color: var(--foreground);
                }
                .editor-content .ProseMirror h3 {
                    font-size: 1.4rem;
                    font-weight: 600;
                    line-height: 1.4;
                    margin-bottom: 0.75rem;
                    color: var(--foreground);
                }
                .editor-content .ProseMirror p { margin-bottom: 1rem; line-height: 1.7; }
                .editor-content .ProseMirror ul,
                .editor-content .ProseMirror ol {
                    padding-left: 1.5rem;
                    margin-bottom: 1rem;
                }
                .editor-content .ProseMirror ul { list-style-type: disc; }
                .editor-content .ProseMirror ol { list-style-type: decimal; }
                .editor-content .ProseMirror li { margin-bottom: 0.375rem; line-height: 1.6; }
                .editor-content .ProseMirror li p { margin-bottom: 0; }
                .editor-content .ProseMirror blockquote {
                    border-left: 4px solid var(--primary);
                    padding-left: 1.25rem;
                    margin: 1.5rem 0;
                    color: var(--muted-foreground);
                    background-color: var(--muted);
                    padding: 1rem 1.25rem;
                    border-radius: 0 0.75rem 0.75rem 0;
                    font-style: italic;
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
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
                    margin: 1.5rem 0;
                    border: 1px solid var(--border);
                }
                .editor-content .ProseMirror pre code { background: none; color: inherit; padding: 0; }
                .editor-content .ProseMirror strong { font-weight: 700; color: var(--foreground); }
                .editor-content .ProseMirror em { font-style: italic; }
                .editor-content .ProseMirror s { text-decoration: line-through; }
                .editor-content .ProseMirror mark { 
                    padding: 0.125rem 0.2rem; 
                    background-color: rgba(59, 130, 246, 0.1); 
                    border-bottom: 2px solid var(--primary, #3b82f6);
                    color: inherit; 
                    border-radius: 0.25rem;
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
                /* Note superscript markers */
                .editor-content .ProseMirror .note-ref {
                    font-size: 0.75rem;
                    font-weight: 800;
                    cursor: pointer;
                    padding: 0.15rem 0.4rem;
                    border-radius: 0.5rem;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    vertical-align: super;
                    margin-left: 0.2rem;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 1.25rem;
                    height: 1.25rem;
                }
                .editor-content .ProseMirror .note-ref:hover {
                    opacity: 1;
                    filter: brightness(1.1);
                    transform: translateY(-2px);
                }
                .editor-content .ProseMirror .note-ref-review {
                    color: #ffffff;
                    background-color: #3b82f6;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
                }
                .editor-content .ProseMirror .note-ref-ai {
                    color: #ffffff;
                    background-color: #10b981;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
                }
                .editor-content .ProseMirror .note-highlighted {
                    background-color: var(--muted);
                    border-radius: 0.25rem;
                    border-bottom: 2px solid var(--primary);
                }
                @keyframes note-pulse {
                    0% { background-color: transparent; }
                    50% { background-color: var(--primary); color: var(--primary-foreground); }
                    100% { background-color: transparent; }
                }
                .note-highlight-pulse {
                    animation: note-pulse 1.5s ease-in-out;
                    border-radius: 0.25rem;
                    padding: 0 0.2rem;
                }
            `}</style>
        </div>
    );
});

SimpleEditor.displayName = 'SimpleEditor';

export default SimpleEditor;
