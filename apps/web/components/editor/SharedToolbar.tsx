'use client';

import { Editor } from '@tiptap/react';
import { useState, useRef } from 'react';

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
            onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
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
                onMouseDown={(e) => e.preventDefault()}
                title={title}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            >
                {icon}
                <span className="ml-0.5 text-[8px] opacity-70">▼</span>
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 min-w-[140px] py-1">
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
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent text-foreground flex items-center gap-2 transition-colors"
        >
            {children}
        </button>
    );
}

interface SharedToolbarProps {
    editor: Editor | null;
    onExtract?: () => void;
    onComment?: () => void;
    onSplit?: () => void;
}

export default function SharedToolbar({ editor, onExtract, onComment, onSplit }: SharedToolbarProps) {
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

            {/* Highlight dropdown */}
            <ToolbarDropdown icon={<span className="text-sm">🎨</span>} title="Resaltar">
                <DropdownItem onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}>
                    <span className="w-4 h-4 rounded bg-yellow-200" /> Amarillo
                </DropdownItem>
                <DropdownItem onClick={() => editor.chain().focus().toggleHighlight({ color: '#bbf7d0' }).run()}>
                    <span className="w-4 h-4 rounded bg-green-200" /> Verde
                </DropdownItem>
                <DropdownItem onClick={() => editor.chain().focus().toggleHighlight({ color: '#fecaca' }).run()}>
                    <span className="w-4 h-4 rounded bg-red-200" /> Rojo
                </DropdownItem>
                <DropdownItem onClick={() => editor.chain().focus().toggleHighlight({ color: '#bfdbfe' }).run()}>
                    <span className="w-4 h-4 rounded bg-blue-200" /> Azul
                </DropdownItem>
                <DropdownItem onClick={() => editor.chain().focus().unsetHighlight().run()}>
                    <span className="text-muted-foreground">✕</span> Quitar
                </DropdownItem>
            </ToolbarDropdown>

            <ToolbarSeparator />

            {/* Headings dropdown */}
            <ToolbarDropdown
                icon={<span className="font-bold text-sm">H</span>}
                title="Títulos"
            >
                <DropdownItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
                    <span className="font-bold text-lg">H1</span> Título 1
                </DropdownItem>
                <DropdownItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                    <span className="font-bold text-base">H2</span> Título 2
                </DropdownItem>
                <DropdownItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
                    <span className="font-bold text-sm">H3</span> Título 3
                </DropdownItem>
                <DropdownItem onClick={() => editor.chain().focus().setParagraph().run()}>
                    <span className="text-sm">¶</span> Normal
                </DropdownItem>
            </ToolbarDropdown>

            {/* Lists dropdown */}
            <ToolbarDropdown
                icon={<span className="text-sm">≡</span>}
                title="Listas"
            >
                <DropdownItem onClick={() => editor.chain().focus().toggleBulletList().run()}>
                    • Lista con viñetas
                </DropdownItem>
                <DropdownItem onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                    1. Lista numerada
                </DropdownItem>
                <DropdownItem onClick={() => editor.chain().focus().toggleBlockquote().run()}>
                    ❝ Cita
                </DropdownItem>
            </ToolbarDropdown>

            <ToolbarSeparator />

            {/* Extract & Comment */}
            {onExtract && (
                <ToolbarButton onClick={onExtract} title="Crear extracto de recurso">
                    <span>📦</span>
                </ToolbarButton>
            )}

            {onComment && (
                <ToolbarButton onClick={onComment} title="Añadir comentario">
                    <span>💬</span>
                </ToolbarButton>
            )}

            {onSplit && (
                <ToolbarButton onClick={onSplit} title="Dividir bloque aquí">
                    <span>✂️</span>
                </ToolbarButton>
            )}

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
