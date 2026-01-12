'use client';

import { useState, useCallback } from 'react';

export type SplitViewType = 'block' | 'resource' | 'document' | 'search' | 'multi-doc' | 'diff' | 'similarity' | null;

interface SplitViewContent {
    type: SplitViewType;
    id?: string;
    title?: string;
    content?: string;
    metadata?: any;
    data?: any;
}

export function useSplitView() {
    const [isOpen, setIsOpen] = useState(false);
    const [content, setContent] = useState<SplitViewContent | null>(null);

    const openSplitView = useCallback((newContent: SplitViewContent) => {
        setContent(newContent);
        setIsOpen(true);
    }, []);

    const closeSplitView = useCallback(() => {
        setIsOpen(false);
        setContent(null);
    }, []);

    const toggleSplitView = useCallback(() => {
        setIsOpen(prev => !prev);
    }, []);

    return {
        isOpen,
        content,
        openSplitView,
        closeSplitView,
        toggleSplitView
    };
}
