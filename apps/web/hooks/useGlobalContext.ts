import { useState, useEffect } from 'react';
import { AIContext } from '@/types/ai';

const DEFAULT_CONTEXT: AIContext = {
    role: 'Asistente Experto en Análisis Documental',
    tone: 'formal',
    objective: 'Ayudar al usuario a comprender, organizar y refinar documentos complejos con precisión y claridad.',
    customInstructions: '',
};

export function useGlobalContext() {
    const [context, setContext] = useState<AIContext>(DEFAULT_CONTEXT);

    useEffect(() => {
        const loadContext = () => {
            const saved = localStorage.getItem('docnex_ai_context');
            if (saved) {
                try {
                    setContext(JSON.parse(saved));
                } catch (e) {
                    console.error("Failed to load AI context", e);
                }
            }
        };

        loadContext();

        // Listen for internal and external updates
        window.addEventListener('ai_context_updated', loadContext);
        window.addEventListener('storage', loadContext);

        return () => {
            window.removeEventListener('ai_context_updated', loadContext);
            window.removeEventListener('storage', loadContext);
        };
    }, []);

    // Helper to format context for injection
    const getFormattedContext = () => {
        return `
GLOBAL CONTEXT (DNA):
- ROLE: ${context.role}
- TONE: ${context.tone}
- OBJECTIVE: ${context.objective}
- CUSTOM INSTRUCTIONS: ${context.customInstructions || 'None'}
`;
    };

    return { context, getFormattedContext };
}
