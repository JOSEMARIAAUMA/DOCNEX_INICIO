import React, { useState, KeyboardEvent } from 'react';
import { X, Plus, Hash } from 'lucide-react';

interface TagInputProps {
    tags: string[];
    onTagsChange: (newTags: string[]) => void;
    readOnly?: boolean;
}

export function TagInput({ tags = [], onTagsChange, readOnly = false }: TagInputProps) {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag();
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            removeTag(tags.length - 1);
        }
    };

    const addTag = () => {
        const trimmed = inputValue.trim();
        if (trimmed && !tags.includes(trimmed)) {
            onTagsChange([...tags, trimmed]);
            setInputValue('');
        }
    };

    const removeTag = (index: number) => {
        if (readOnly) return;
        const newTags = [...tags];
        newTags.splice(index, 1);
        onTagsChange(newTags);
    };

    return (
        <div className="flex flex-wrap gap-2 items-center p-2 rounded-md border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
            <Hash className="w-4 h-4 text-gray-400" />

            {tags.map((tag, index) => (
                <span
                    key={index}
                    className="inline-flex items-center px-2 py-0.5 rounded text-sm font-medium bg-blue-50 text-blue-700 border border-blue-100 animate-in fade-in zoom-in duration-200"
                >
                    {tag}
                    {!readOnly && (
                        <button
                            type="button"
                            onClick={() => removeTag(index)}
                            className="ml-1.5 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-600 focus:outline-none transition-colors"
                        >
                            <span className="sr-only">Remove {tag}</span>
                            <X className="w-2.5 h-2.5" />
                        </button>
                    )}
                </span>
            ))}

            {!readOnly && (
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={addTag}
                    className="flex-1 min-w-[120px] bg-transparent border-none focus:ring-0 p-0 text-sm text-gray-700 placeholder-gray-400"
                    placeholder="Añadir etiqueta..."
                />
            )}
        </div>
    );
}
