'use client';

import { useEffect, useState, useRef } from 'react';

interface SelectionPopoverProps {
    onAction: (action: string, selectedText: string, range: { start: number, end: number }) => void;
    containerRef: React.RefObject<HTMLElement | null>;
}

export default function SelectionPopover({ onAction, containerRef }: SelectionPopoverProps) {
    const [position, setPosition] = useState<{ top: number, left: number } | null>(null);
    const [selectedText, setSelectedText] = useState('');
    const [range, setRange] = useState({ start: 0, end: 0 });
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleSelection = () => {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed || !containerRef.current) {
                setPosition(null);
                return;
            }

            // Check if selection is within the target container (the textarea)
            // Note: For textarea we need a different approach than standard getSelection()
            // since getSelection doesn't give range within textarea value.
            // We use document.activeElement and selectionStart/End.
            const activeElement = document.activeElement as HTMLTextAreaElement;
            if (activeElement?.tagName !== 'TEXTAREA') {
                setPosition(null);
                return;
            }

            const start = activeElement.selectionStart;
            const end = activeElement.selectionEnd;
            const text = activeElement.value.substring(start, end);

            if (!text.trim()) {
                setPosition(null);
                return;
            }

            // Position calculation for floating menu
            // This is tricky with textarea since we don't have exact pixel coordinates of text.
            // Simplified approach: Position near the active textarea's top.
            const rect = activeElement.getBoundingClientRect();

            setSelectedText(text);
            setRange({ start, end });
            setPosition({
                top: rect.top - 50, // Above the textarea
                left: rect.left + rect.width / 2 - 100 // Centered roughly
            });
        };

        document.addEventListener('mouseup', handleSelection);
        document.addEventListener('keyup', handleSelection);
        return () => {
            document.removeEventListener('mouseup', handleSelection);
            document.removeEventListener('keyup', handleSelection);
        };
    }, [containerRef]);

    if (!position) return null;

    const actions = [
        { id: 'highlight', label: '🎨 Resaltar', color: 'yellow' },
        { id: 'extract', label: '📦 Extraer', color: 'blue' },
        { id: 'rewrite', label: '🤖 Reescribir IA', color: 'purple' },
        { id: 'comment', label: '💬 Comentar', color: 'gray' },
        { id: 'split', label: '✂️ Dividir aquí', color: 'red' },
    ];

    return (
        <div
            ref={popoverRef}
            className="fixed z-[100] bg-card border border-border rounded-lg shadow-xl p-1 flex gap-1 animate-in fade-in zoom-in duration-200"
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
            }}
        >
            {actions.map(action => (
                <button
                    key={action.id}
                    onClick={() => {
                        onAction(action.id, selectedText, range);
                        setPosition(null);
                    }}
                    className="px-2 py-1.5 text-xs font-medium hover:bg-accent text-foreground rounded transition-colors whitespace-nowrap"
                >
                    {action.label}
                </button>
            ))}
        </div>
    );
}
