import { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { useState } from 'react';
import { Sparkles, Wand2, Check, X, Expand, Languages } from 'lucide-react';
import { useAIEditor } from '@/hooks/useAIEditor';
import { motion, AnimatePresence } from 'framer-motion';

interface AIFloatingMenuProps {
    editor: Editor;
    blockId: string;
}

export function AIFloatingMenu({ editor, blockId }: AIFloatingMenuProps) {
    const { aiState, setAiState, runTransformation, applyTransformation, closeAI } = useAIEditor(editor, blockId);

    // If preview is showing, we show the Diff/Accept UI
    if (aiState.resultPreview) {
        return (
            <BubbleMenu editor={editor} options={{ placement: 'bottom' }}>
                <div className="bg-card border border-border shadow-2xl rounded-xl p-4 w-[400px] flex flex-col gap-3">
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                        <span className="text-sm font-bold flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-500" />
                            Propuesta IA
                        </span>
                        <button onClick={closeAI}><X className="w-4 h-4" /></button>
                    </div>

                    <div className="bg-muted/50 p-3 rounded-lg text-sm max-h-40 overflow-y-auto">
                        <p className="text-muted-foreground line-through text-xs mb-1 opacity-70">
                            {aiState.selectedText}
                        </p>
                        <p className="text-foreground font-medium">
                            {aiState.resultPreview}
                        </p>
                    </div>

                    <div className="flex gap-2 mt-2">
                        <button
                            onClick={applyTransformation}
                            className="flex-1 bg-green-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-green-700 flex items-center justify-center gap-2"
                        >
                            <Check className="w-4 h-4" /> Aplicar
                        </button>
                        <button
                            onClick={closeAI}
                            className="flex-1 bg-muted hover:bg-muted/80 text-foreground py-2 rounded-lg text-xs font-bold"
                        >
                            Descartar
                        </button>
                    </div>
                </div>
            </BubbleMenu>
        );
    }

    // Default State: Buttons
    return (
        <BubbleMenu
            editor={editor}
            options={{ placement: 'top' }}
            shouldShow={({ state, from, to }: { state: any, from: number, to: number }) => {
                // Show if selection is non-empty and NOT in the middle of AI processing
                return !state.selection.empty && !aiState.isLoading;
            }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1 p-1 bg-background/80 backdrop-blur-md border border-border/50 shadow-xl rounded-full"
            >
                <button
                    onClick={() => runTransformation('simplify')}
                    className="flex items-center gap-1 px-3 py-1.5 hover:bg-primary/10 rounded-full text-xs font-medium transition-colors"
                >
                    <Wand2 className="w-3.5 h-3.5 text-purple-500" />
                    Simplificar
                </button>
                <div className="w-px h-4 bg-border/50" />
                <button
                    onClick={() => runTransformation('expand')}
                    className="flex items-center gap-1 px-3 py-1.5 hover:bg-primary/10 rounded-full text-xs font-medium transition-colors"
                >
                    <Expand className="w-3.5 h-3.5 text-blue-500" />
                    Expandir
                </button>
                <div className="w-px h-4 bg-border/50" />
                <button
                    onClick={() => runTransformation('tone_professional')}
                    className="flex items-center gap-1 px-3 py-1.5 hover:bg-primary/10 rounded-full text-xs font-medium transition-colors"
                >
                    <Languages className="w-3.5 h-3.5 text-amber-500" />
                    Formalizar
                </button>

                {aiState.isLoading && (
                    <div className="ml-2 px-2">
                        <Sparkles className="w-4 h-4 animate-spin text-purple-500" />
                    </div>
                )}
            </motion.div>
        </BubbleMenu>
    );
}
