'use client';

import { useState } from 'react';

interface SidePanelProps {
    children: React.ReactNode;
}

interface SectionProps {
    title: string;
    icon: string;
    count?: number;
    defaultOpen?: boolean;
    children: React.ReactNode;
}

export function SidePanel({ children }: SidePanelProps) {
    return (
        <div className="h-full flex flex-col bg-card border-l border-border overflow-hidden">
            <div className="flex-1 overflow-y-auto">
                {children}
            </div>
        </div>
    );
}

export function Section({ title, icon, count, defaultOpen = false, children }: SectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border-b border-border">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span>{icon}</span>
                    <span className="font-medium text-sm text-foreground">{title}</span>
                    {count !== undefined && count > 0 && (
                        <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                            {count}
                        </span>
                    )}
                </div>
                <span className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    ▼
                </span>
            </button>
            {isOpen && (
                <div className="px-4 py-3 bg-muted border-t border-border">
                    {children}
                </div>
            )}
        </div>
    );
}
