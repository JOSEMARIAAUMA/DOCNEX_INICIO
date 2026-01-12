import { Bot, Loader2, Play } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface DraftingStepProps {
    isGenerating: boolean;
    content: string;
    onStartGeneration: () => void;
}

export function DraftingStep({ isGenerating, content, onStartGeneration }: DraftingStepProps) {
    return (
        <div className="space-y-6 max-w-4xl mx-auto h-full flex flex-col">
            <div className="flex flex-col gap-2 flex-shrink-0">
                <h2 className="text-2xl font-bold tracking-tight">Generación de Borrador</h2>
                <p className="text-muted-foreground text-lg">
                    La IA redactará el contenido basándose en la estructura y fuentes seleccionadas.
                </p>
            </div>

            <div className="flex-1 border rounded-xl bg-card shadow-sm flex flex-col min-h-0 relative overflow-hidden">
                {!content && !isGenerating ? (
                    <div className="flex flex-col items-center justify-center flex-1 p-12 bg-muted/10">
                        <Bot className="w-16 h-16 text-primary/20 mb-6" />
                        <h3 className="text-xl font-medium mb-2">Listo para redactar</h3>
                        <p className="text-muted-foreground mb-8 text-center max-w-md">
                            Se generará un borrador completo siguiendo la estructura aprobada.
                            Este proceso puede tomar unos minutos.
                        </p>
                        <button
                            onClick={onStartGeneration}
                            className="flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-xl text-lg font-semibold shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
                        >
                            <Play className="w-5 h-5 fill-current" />
                            Iniciar Redacción
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 overflow-y-auto p-8 prose prose-slate dark:prose-invert max-w-none">
                            <ReactMarkdown>{content}</ReactMarkdown>
                            {isGenerating && (
                                <div className="animate-pulse mt-4 flex items-center gap-2 text-primary font-medium">
                                    <span className="w-2 h-4 bg-primary inline-block animate-bounce" />
                                </div>
                            )}
                        </div>
                        {isGenerating && (
                            <div className="absolute bottom-6 right-6 flex items-center gap-3 px-4 py-2 bg-background/80 backdrop-blur border rounded-full shadow-lg">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                <span className="text-sm font-medium">Escribiendo...</span>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
