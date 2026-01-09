'use client';

import React, { useState } from 'react';
import { TextStyle } from '@/lib/ai/style-analyzer';
import { DOCUMENT_STYLES, StyleMapping, DocumentStyle } from '@/lib/ai/style-transformer';

interface StyleMapperProps {
    detectedStyles: TextStyle[];
    onMappingsChange: (mappings: StyleMapping[]) => void;
    preserveOriginal: boolean;
    onPreserveChange: (preserve: boolean) => void;
}

export function StyleMapper({
    detectedStyles,
    onMappingsChange,
    preserveOriginal,
    onPreserveChange
}: StyleMapperProps) {
    const [mappings, setMappings] = useState<StyleMapping[]>(() => {
        // Default 1:1 mappings where possible
        return detectedStyles.map(style => ({
            source: style.type,
            target: style.type === 'bold' ? 'strong' :
                style.type === 'italic' ? 'emphasis' :
                    style.type
        }));
    });

    const [draggedSource, setDraggedSource] = useState<string | null>(null);

    const updateMapping = (source: string, target: string) => {
        const newMappings = mappings.filter(m => m.source !== source);
        newMappings.push({ source, target });
        setMappings(newMappings);
        onMappingsChange(newMappings);
    };

    const getMappingForSource = (sourceType: string): DocumentStyle | undefined => {
        const mapping = mappings.find(m => m.source === sourceType);
        return mapping ? DOCUMENT_STYLES.find(s => s.id === mapping.target) : undefined;
    };

    if (detectedStyles.length === 0) {
        return (
            <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">No se detectaron estilos en el texto</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Preserve Original Toggle */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
                <input
                    type="checkbox"
                    id="preserve-original"
                    checked={preserveOriginal}
                    onChange={(e) => onPreserveChange(e.target.checked)}
                    className="w-4 h-4 rounded border-border accent-primary"
                />
                <label htmlFor="preserve-original" className="text-sm font-medium text-foreground cursor-pointer">
                    Importar estilos tal cual (sin transformar)
                </label>
            </div>

            {!preserveOriginal && (
                <div className="grid grid-cols-2 gap-6">
                    {/* Source Styles */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Estilos Detectados
                        </h4>
                        <div className="space-y-2">
                            {detectedStyles.map((style) => {
                                const targetStyle = getMappingForSource(style.type);
                                return (
                                    <div
                                        key={style.type}
                                        draggable
                                        onDragStart={() => setDraggedSource(style.type)}
                                        onDragEnd={() => setDraggedSource(null)}
                                        className={`
                      p-3 rounded-lg border-2 cursor-move transition-all
                      ${draggedSource === style.type
                                                ? 'border-primary bg-primary/10 scale-105 shadow-lg'
                                                : 'border-border bg-card hover:border-primary/50'}
                    `}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">⋮⋮</span>
                                                <div>
                                                    <div className="font-medium text-sm text-foreground">{style.label}</div>
                                                    <code className="text-xs text-muted-foreground">{style.example}</code>
                                                </div>
                                            </div>
                                            {targetStyle && (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs text-muted-foreground">→</span>
                                                    <div
                                                        className="w-2 h-2 rounded-full"
                                                        style={{ backgroundColor: targetStyle.color }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Target Styles */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Estilos del Documento
                        </h4>
                        <div className="space-y-2">
                            {DOCUMENT_STYLES.map((docStyle) => {
                                const mappedSources = mappings
                                    .filter(m => m.target === docStyle.id)
                                    .map(m => detectedStyles.find(s => s.type === m.source)?.label)
                                    .filter(Boolean);

                                return (
                                    <div
                                        key={docStyle.id}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={() => {
                                            if (draggedSource) {
                                                updateMapping(draggedSource, docStyle.id);
                                            }
                                        }}
                                        className={`
                      p-3 rounded-lg border-2 transition-all
                      ${draggedSource
                                                ? 'border-dashed border-primary/50 bg-primary/5'
                                                : 'border-border bg-card'}
                      ${mappedSources.length > 0 ? 'ring-2 ring-primary/20' : ''}
                    `}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full shrink-0"
                                                style={{ backgroundColor: docStyle.color }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm text-foreground">{docStyle.label}</div>
                                                <code className="text-xs text-muted-foreground">{docStyle.markdown}</code>
                                                {mappedSources.length > 0 && (
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                        {mappedSources.map((source, i) => (
                                                            <span
                                                                key={i}
                                                                className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium"
                                                            >
                                                                {source}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {preserveOriginal && (
                <div className="p-6 text-center border border-border rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">
                        Los estilos se importarán sin modificaciones
                    </p>
                </div>
            )}
        </div>
    );
}
