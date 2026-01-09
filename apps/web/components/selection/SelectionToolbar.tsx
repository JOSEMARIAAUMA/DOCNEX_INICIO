'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

interface SelectionToolbarProps {
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    onAction: (action: string, selectedText: string, range: { start: number; end: number }) => void;
}

interface Position {
    top: number;
    left: number;
}

const ACTIONS = [
    { id: 'bold', label: 'B', title: 'Bold', className: 'font-bold' },
    { id: 'italic', label: 'I', title: 'Italic', className: 'italic' },
    { id: 'highlight', label: '🎨', title: 'Highlight' },
    { id: 'extract', label: '📦', title: 'Extract to Resource' },
    { id: 'split', label: '✂️', title: 'Split Block Here' },
    { id: 'comment', label: '💬', title: 'Add Comment' },
    { id: 'toblock', label: '📄', title: 'Convert to New Block' },
    { id: 'rewrite', label: '🤖', title: 'AI Rewrite' },
];

export default function SelectionToolbar({ textareaRef, onAction }: SelectionToolbarProps) {
    const [position, setPosition] = useState<Position | null>(null);
    const [selection, setSelection] = useState({ text: '', start: 0, end: 0 });
    const toolbarRef = useRef<HTMLDivElement>(null);

    const updatePosition = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value.substring(start, end);

        if (!text.trim() || start === end) {
            setPosition(null);
            return;
        }

        setSelection({ text, start, end });

        // Calculate position based on textarea and cursor
        const textareaRect = textarea.getBoundingClientRect();

        // Create a temporary element to measure text position
        const mirror = document.createElement('div');
        const computed = window.getComputedStyle(textarea);

        // Copy styles
        mirror.style.cssText = `
            position: absolute;
            visibility: hidden;
            white-space: pre-wrap;
            word-wrap: break-word;
            font: ${computed.font};
            padding: ${computed.padding};
            border: ${computed.border};
            width: ${textarea.clientWidth}px;
            line-height: ${computed.lineHeight};
        `;

        // Get text before selection
        const textBefore = textarea.value.substring(0, start);
        mirror.textContent = textBefore;

        // Add span for selection
        const selectionSpan = document.createElement('span');
        selectionSpan.textContent = text || 'x';
        mirror.appendChild(selectionSpan);

        document.body.appendChild(mirror);

        const spanRect = selectionSpan.getBoundingClientRect();
        const mirrorRect = mirror.getBoundingClientRect();

        // Calculate relative position
        const relativeTop = spanRect.top - mirrorRect.top;
        const relativeLeft = spanRect.left - mirrorRect.left + (spanRect.width / 2);

        document.body.removeChild(mirror);

        // Position toolbar above the selection
        const toolbarWidth = 300; // approximate width
        const toolbarHeight = 40;

        let left = textareaRect.left + relativeLeft - (toolbarWidth / 2);
        let top = textareaRect.top + relativeTop - textarea.scrollTop - toolbarHeight - 10;

        // Keep within viewport
        left = Math.max(10, Math.min(left, window.innerWidth - toolbarWidth - 10));
        top = Math.max(10, top);

        // If would be above viewport, show below
        if (top < 10) {
            top = textareaRect.top + relativeTop - textarea.scrollTop + 25;
        }

        setPosition({ top, left });
    }, [textareaRef]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const handleSelectionChange = () => {
            // Small delay to let selection settle
            setTimeout(updatePosition, 10);
        };

        textarea.addEventListener('mouseup', handleSelectionChange);
        textarea.addEventListener('keyup', handleSelectionChange);
        textarea.addEventListener('select', handleSelectionChange);

        // Hide on scroll
        textarea.addEventListener('scroll', () => setPosition(null));

        return () => {
            textarea.removeEventListener('mouseup', handleSelectionChange);
            textarea.removeEventListener('keyup', handleSelectionChange);
            textarea.removeEventListener('select', handleSelectionChange);
            textarea.removeEventListener('scroll', () => setPosition(null));
        };
    }, [textareaRef, updatePosition]);

    // Hide when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
                // Don't hide if clicking the textarea
                if (e.target !== textareaRef.current) {
                    setPosition(null);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [textareaRef]);

    if (!position) return null;

    const handleAction = (actionId: string) => {
        onAction(actionId, selection.text, { start: selection.start, end: selection.end });
        setPosition(null);
    };

    return (
        <div
            ref={toolbarRef}
            className="fixed z-[100] bg-card border border-border rounded-lg shadow-xl flex items-center gap-0.5 p-1 animate-in fade-in zoom-in-95 duration-150"
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
            }}
        >
            {ACTIONS.map((action, i) => (
                <button
                    key={action.id}
                    onMouseDown={(e) => {
                        e.preventDefault(); // Prevent focus loss
                        handleAction(action.id);
                    }}
                    className={`w-8 h-8 flex items-center justify-center rounded hover:bg-accent transition-colors text-sm text-foreground ${action.className || ''}`}
                    title={action.title}
                >
                    {action.label}
                </button>
            ))}

            {/* Pointer arrow */}
            <div
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-card"
                style={{ filter: 'drop-shadow(0 2px 1px rgba(0,0,0,0.1))' }}
            />
        </div>
    );
}
