import { useState, useCallback, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { transformTextWithAI } from '@/actions/ai';
import { useGlobalContext } from '@/hooks/useGlobalContext';

export interface AIAssistState {
    isOpen: boolean;
    position: { x: number; y: number } | null;
    isLoading: boolean;
    selectedText: string;
    resultPreview: string | null;
}

export function useAIEditor(editor: Editor | null, blockId: string) {
    const { context } = useGlobalContext();
    const [aiState, setAiState] = useState<AIAssistState>({
        isOpen: false,
        position: null,
        isLoading: false,
        selectedText: '',
        resultPreview: null
    });

    // Check for selection to show Floating Menu
    useEffect(() => {
        if (!editor) return;

        const handleSelection = () => {
            const { from, to } = editor.state.selection;
            const text = editor.state.doc.textBetween(from, to, ' ');

            // Only show if selection is non-empty and not just whitespace
            if (aiState.isOpen) return; // Don't move if open
            if (text.trim().length > 5 && !aiState.isOpen) {
                // Calculate position (rough approximation or use Tiptap posToCoords)
                // For now, we rely on the component rendering relative to cursor or fixed
                // We'll update state to signal "Ready"
                setAiState(prev => ({ ...prev, selectedText: text }));
            } else {
                setAiState(prev => ({ ...prev, selectedText: '' }));
            }
        };

        // Note: Tiptap controls this via BubbleMenu mainly. 
        // But if we want a custom "Floating Button" that opens the menu:
        editor.on('selectionUpdate', handleSelection);

        return () => {
            editor.off('selectionUpdate', handleSelection);
        };
    }, [editor, aiState.isOpen]);

    const runTransformation = async (instruction: 'simplify' | 'expand' | 'tone_professional' | 'grammar') => {
        if (!editor) return;
        const text = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ');
        if (!text) return;

        setAiState(prev => ({ ...prev, isLoading: true, isOpen: true }));

        try {
            const result = await transformTextWithAI(text, instruction, context);
            if (result.success && result.transformed) {
                setAiState(prev => ({
                    ...prev,
                    isLoading: false,
                    resultPreview: result.transformed || ''
                }));
            } else {
                console.error(result.error);
                setAiState(prev => ({ ...prev, isLoading: false }));
            }
        } catch (err) {
            console.error(err);
            setAiState(prev => ({ ...prev, isLoading: false }));
        }
    };

    const applyTransformation = () => {
        if (!editor || !aiState.resultPreview) return;

        editor.chain().focus().insertContent(aiState.resultPreview).run();
        closeAI();
    };

    const closeAI = () => {
        setAiState({
            isOpen: false,
            position: null,
            isLoading: false,
            selectedText: '',
            resultPreview: null
        });
    };

    return {
        aiState,
        setAiState,
        runTransformation,
        applyTransformation,
        closeAI
    };
}
