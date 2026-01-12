import { Document } from '@/lib/api';
import { Card } from '@/components/ui/UiCard';
import { CheckCircle2, Circle, FileText, Search, Tag } from 'lucide-react';
import { useState } from 'react';

interface ScopeStepProps {
    availableDocs: Document[];
    selectedDocIds: string[];
    onSelectionChange: (ids: string[]) => void;
}

export function ScopeStep({ availableDocs, selectedDocIds, onSelectionChange }: ScopeStepProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const toggleSelection = (id: string) => {
        if (selectedDocIds.includes(id)) {
            onSelectionChange(selectedDocIds.filter(d => d !== id));
        } else {
            onSelectionChange([...selectedDocIds, id]);
        }
    };

    const toggleAll = () => {
        if (selectedDocIds.length === availableDocs.length) {
            onSelectionChange([]);
        } else {
            onSelectionChange(availableDocs.map(d => d.id));
        }
    };

    const filteredDocs = availableDocs.filter(doc =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold tracking-tight">Selecciona el Alcance</h2>
                <p className="text-muted-foreground text-lg">
                    Elige los documentos que formarán parte de la base de conocimiento para esta síntesis.
                </p>
            </div>

            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar documentos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-muted/50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>
                <button
                    onClick={toggleAll}
                    className="text-sm font-medium text-primary hover:underline"
                >
                    {selectedDocIds.length === availableDocs.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDocs.map(doc => {
                    const isSelected = selectedDocIds.includes(doc.id);
                    return (
                        <div
                            key={doc.id}
                            onClick={() => toggleSelection(doc.id)}
                            className={`
                                cursor-pointer group relative flex items-start gap-4 p-4 rounded-xl border transition-all duration-200
                                ${isSelected
                                    ? 'bg-primary/5 border-primary shadow-sm'
                                    : 'bg-card border-border hover:border-primary/50 hover:bg-muted/30'}
                            `}
                        >
                            <div className={`mt-1 transition-colors ${isSelected ? 'text-primary' : 'text-muted-foreground group-hover:text-primary/70'}`}>
                                {isSelected ? <CheckCircle2 className="w-5 h-5 fill-primary/10" /> : <Circle className="w-5 h-5" />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className={`font-semibold mb-1 truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                    {doc.title}
                                </h3>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                    <span className="flex items-center gap-1">
                                        <FileText className="w-3 h-3" />
                                        Documento
                                    </span>
                                    <span>•</span>
                                    <span>{new Date(doc.updated_at).toLocaleDateString()}</span>
                                </div>

                                {doc.tags && doc.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {doc.tags.slice(0, 3).map(tag => (
                                            <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                                                <Tag className="w-3 h-3 mr-1 opacity-50" />
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg border border-border">
                <div className="flex items-center gap-2">
                    <span className="font-medium">{selectedDocIds.length}</span>
                    <span className="text-muted-foreground">documentos seleccionados</span>
                </div>
            </div>
        </div>
    );
}
