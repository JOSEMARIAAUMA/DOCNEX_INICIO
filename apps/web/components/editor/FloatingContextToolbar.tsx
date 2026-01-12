'use client';

import { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { Sparkles, Zap, Search, FileJson, PackagePlus } from 'lucide-react';
import { Button } from '@/components/ui/UiButton';

interface FloatingContextToolbarProps {
    editor: Editor | null;
    onExtractToBlock?: () => void;
}

export default function FloatingContextToolbar({ editor, onExtractToBlock }: FloatingContextToolbarProps) {
    if (!editor) return null;

    const handleAIAction = (type: string) => {
        const { from, to } = editor.state.selection;
        const text = editor.state.doc.textBetween(from, to, ' ');

        // This will be handled by the editor component or the AIAgent
        // For now we trigger a custom event or call a prop-like function if we had one
        // But since we are inside a component, we can use editor commands set by our extension
        if (type === 'simplify') {
            editor.commands.simplifySelection();
        } else if (type === 'contradictions') {
            editor.commands.checkContradictions();
        } else if (type === 'extract') {
            editor.commands.extractKeyData();
        }
    };

    return (
        <BubbleMenu
            editor={editor}
            options={{}}
            className="flex items-center gap-1 p-1.5 bg-card border border-border rounded-xl shadow-2xl animate-in fade-in zoom-in duration-200"
        >
            <div className="flex items-center gap-1 border-r border-border pr-1 mr-1">
                <div className="p-1 px-2 flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" />
                    AI Polish
                </div>
            </div>

            <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAIAction('simplify')}
                className="h-8 px-2.5 text-xs gap-1.5 hover:bg-primary/10 hover:text-primary transition-colors"
                title="Simplificar lenguaje"
            >
                <Zap className="w-3.5 h-3.5" />
                Simplificar
            </Button>

            <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAIAction('contradictions')}
                className="h-8 px-2.5 text-xs gap-1.5 hover:bg-destructive/10 hover:text-destructive transition-colors"
                title="Detectar posibles contradicciones"
            >
                <Search className="w-3.5 h-3.5" />
                Contradicciones
            </Button>

            <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAIAction('extract')}
                className="h-8 px-2.5 text-xs gap-1.5 hover:bg-blue-500/10 hover:text-blue-500 transition-colors"
                title="Extraer datos clave (Entidades, fechas, etc.)"
            >
                <FileJson className="w-3.5 h-3.5" />
                Extraer Datos
            </Button>

            {onExtractToBlock && (
                <>
                    <div className="w-px h-6 bg-border mx-1" />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onExtractToBlock}
                        className="h-8 px-2.5 text-xs gap-1.5 hover:bg-green-500/10 hover:text-green-600 transition-colors font-medium"
                        title="Crear un nuevo bloque con el texto seleccionado"
                    >
                        <PackagePlus className="w-3.5 h-3.5" />
                        Extraer a Bloque
                    </Button>
                </>
            )}
        </BubbleMenu>
    );
}
