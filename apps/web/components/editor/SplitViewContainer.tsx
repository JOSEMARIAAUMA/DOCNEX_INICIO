'use client';

import React, { ReactNode } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SplitViewContainerProps {
    isOpen: boolean;
    onClose: () => void;
    leftContent: ReactNode;
    rightContent: ReactNode;
    title?: string;
    rightPanelWidth?: string;
}

export function SplitViewContainer({
    isOpen,
    onClose,
    leftContent,
    rightContent,
    title = 'Vista Secundaria',
    rightPanelWidth = '50%'
}: SplitViewContainerProps) {
    const [isMaximized, setIsMaximized] = React.useState(false);

    if (!isOpen) {
        return <div className="h-full w-full">{leftContent}</div>;
    }

    return (
        <div className="h-full w-full flex overflow-hidden">
            {/* Left Panel */}
            <div
                className={cn(
                    "h-full transition-all duration-300",
                    isMaximized ? "w-0 opacity-0" : ""
                )}
                style={{ width: isMaximized ? '0' : `calc(100% - ${rightPanelWidth})` }}
            >
                {leftContent}
            </div>

            {/* Splitter / Divider */}
            <div className="w-[1px] bg-border relative z-10 shrink-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-8 bg-muted border border-border rounded-full flex items-center justify-center cursor-col-resize hover:bg-accent transition-colors">
                    <div className="w-[1px] h-3 bg-muted-foreground/30 mx-[1px]" />
                    <div className="w-[1px] h-3 bg-muted-foreground/30 mx-[1px]" />
                </div>
            </div>

            {/* Right Panel */}
            <div
                className={cn(
                    "h-full flex flex-col bg-card shadow-2xl relative transition-all duration-300",
                    isMaximized ? "w-full" : ""
                )}
                style={{ width: isMaximized ? '100%' : rightPanelWidth }}
            >
                {/* Header */}
                <div className="h-12 border-b border-border bg-muted/30 flex items-center justify-between px-4 shrink-0">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground truncate mr-4">
                        {title}
                    </h3>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setIsMaximized(!isMaximized)}
                            className="p-1.5 hover:bg-accent rounded-md text-muted-foreground transition-colors"
                            title={isMaximized ? "Restaurar" : "Maximizar"}
                        >
                            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-md text-muted-foreground transition-colors"
                            title="Cerrar"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto bg-background p-6">
                    {rightContent}
                </div>
            </div>
        </div>
    );
}
