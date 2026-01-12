import { ArrowRight, CheckCircle2, FileText, Save } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ReviewStepProps {
    content: string;
    onSave: () => void;
}

export function ReviewStep({ content, onSave }: ReviewStepProps) {
    return (
        <div className="space-y-6 max-w-4xl mx-auto h-full flex flex-col">
            <div className="flex flex-col gap-2 flex-shrink-0">
                <h2 className="text-2xl font-bold tracking-tight">Revisión Final</h2>
                <p className="text-muted-foreground text-lg">
                    Revisa el borrador generado antes de guardarlo en tu workspace.
                </p>
            </div>

            <div className="flex-1 border rounded-xl bg-card shadow-sm overflow-hidden flex flex-col">
                <div className="bg-muted/30 border-b px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="w-4 h-4" />
                        <span>Vista Previa</span>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 prose prose-slate dark:prose-invert max-w-none">
                    <ReactMarkdown>{content}</ReactMarkdown>
                </div>
            </div>

            <div className="flex-shrink-0 flex items-center justify-center p-4">
                <button
                    onClick={onSave}
                    className="flex items-center gap-3 px-8 py-4 bg-green-600 text-white rounded-xl text-lg font-semibold shadow-xl shadow-green-600/20 hover:scale-105 transition-transform"
                >
                    <Save className="w-5 h-5" />
                    Guardar y Finalizar
                </button>
            </div>
        </div>
    );
}
