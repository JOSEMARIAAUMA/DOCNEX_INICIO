import React from 'react';
import { cn } from '@/lib/utils';

interface BestSourceHighlightProps {
    children: React.ReactNode;
    isTopQuality: boolean; // Needs to be determined by the parent based on source quality
    className?: string;
}

/**
 * A wrapper component that visually highlights content from top-tier sources.
 * In a real editor integration (Tiptap), this would be implemented as a Mark or Decoration.
 * For view-only or block rendering, this wrapper works.
 */
export const BestSourceHighlight: React.FC<BestSourceHighlightProps> = ({
    children,
    isTopQuality,
    className,
}) => {
    if (!isTopQuality) {
        return <>{children}</>;
    }

    return (
        <span
            className={cn(
                'bg-green-50 dark:bg-green-900/20 border-b-2 border-green-200 dark:border-green-800 rounded-sm px-0.5',
                className
            )}
            title="Verified High-Quality Source"
        >
            {children}
        </span>
    );
};
