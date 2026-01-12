
import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export type AIContext = {
    type: 'document' | 'general' | 'project' | 'settings' | 'library';
    id?: string;
    projectId?: string;
    selection?: string;
    metadata?: any;
};

export function useAIContext() {
    const pathname = usePathname();
    const [selection, setSelection] = useState('');
    const [context, setContext] = useState<AIContext>({ type: 'general' });

    const updateSelection = useCallback(() => {
        const selectedText = window.getSelection()?.toString();
        if (selectedText) {
            setSelection(selectedText);
        }
    }, []);

    useEffect(() => {
        document.addEventListener('selectionchange', updateSelection);
        return () => document.removeEventListener('selectionchange', updateSelection);
    }, [updateSelection]);

    useEffect(() => {
        const fetchContextDetails = async () => {
            let newContext: AIContext = { type: 'general' };

            if (pathname.includes('/documents/')) {
                const id = pathname.split('/').pop()?.split('?')[0];
                if (id && id.length > 30) { // Simple UUID check
                    const { data: doc } = await supabase
                        .from('documents')
                        .select('id, project_id, title')
                        .eq('id', id)
                        .single();

                    if (doc) {
                        newContext = {
                            type: 'document',
                            id: doc.id,
                            projectId: doc.project_id,
                            metadata: { title: doc.title }
                        };
                    }
                }
            } else if (pathname.includes('/library')) {
                newContext = { type: 'library' };
            } else if (pathname.includes('/settings')) {
                newContext = { type: 'settings' };
            } else if (pathname.includes('/projects/')) {
                const id = pathname.split('/').pop()?.split('?')[0];
                newContext = { type: 'project', id };
            }

            setContext(newContext);
        };

        fetchContextDetails();
    }, [pathname]);

    return { ...context, selection };
}
