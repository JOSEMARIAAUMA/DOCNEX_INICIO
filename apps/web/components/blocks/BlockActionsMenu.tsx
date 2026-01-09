'use client';

import { useEffect, useRef } from 'react';

interface BlockActionsMenuProps {
    blockId: string;
    onAction: (action: string) => void;
    onClose: () => void;
}

export default function BlockActionsMenu({ blockId, onAction, onClose }: BlockActionsMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const actions = [
        { id: 'rename', label: 'Renombrar', icon: '✏️' },
        { id: 'duplicate', label: 'Duplicar', icon: '📋' },
        { id: 'add-subblock', label: 'Añadir sub-bloque', icon: '🌿' },
        { id: 'divider1', label: '', divider: true },
        { id: 'merge-prev', label: 'Fusionar con anterior', icon: '⬆️' },
        { id: 'merge-next', label: 'Fusionar con siguiente', icon: '⬇️' },
        { id: 'split', label: 'Dividir bloque', icon: '✂️' },
        { id: 'divider2', label: '', divider: true },
        { id: 'delete', label: 'Eliminar', icon: '🗑️', danger: true }
    ];

    return (
        <div
            ref={menuRef}
            className="absolute right-0 top-full mt-1 z-50 w-48 bg-card rounded-lg shadow-xl border border-border py-1"
        >
            {actions.map(action =>
                action.divider ? (
                    <div key={action.id} className="border-t my-1" />
                ) : (
                    <button
                        key={action.id}
                        onClick={() => onAction(action.id)}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-accent transition-colors ${action.danger ? 'text-red-500 hover:bg-red-500/10' : 'text-foreground hover:text-primary transition-colors'
                            }`}
                    >
                        <span>{action.icon}</span>
                        <span>{action.label}</span>
                    </button>
                )
            )}
        </div>
    );
}
