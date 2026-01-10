import { Extension } from '@tiptap/core';
import { aiAgent } from '@/lib/ai/agent';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        aiActions: {
            simplifySelection: () => ReturnType;
            checkContradictions: () => ReturnType;
            extractKeyData: () => ReturnType;
        };
    }
}

export const AIActionExtension = Extension.create({
    name: 'aiActions',

    addCommands() {
        return {
            simplifySelection: () => ({ editor, chain }) => {
                const { from, to } = editor.state.selection;
                const text = editor.state.doc.textBetween(from, to, ' ');

                if (!text) return false;

                // Set a temporary "thinking" state or highlight
                chain().setHighlight({ color: '#fef08a' }).run();

                // Call the agent (this is async, but Tiptap commands are sync-returning)
                // In a production app, we'd handle the async state better
                (async () => {
                    const dnaString = localStorage.getItem('docnex_ai_context');
                    const dna = dnaString ? JSON.parse(dnaString) : null;

                    const prompt = `Simplifica el siguiente texto: "${text}". 
                    Respeta mi ADN:
                    Rol: ${dna?.role || 'Asistente'}
                    Tono: ${dna?.tone || 'Formal'}
                    Instrucciones: ${dna?.customInstructions || ''}`;

                    // Real substitution would happen here
                    console.log("[AI Extension] Simplifying with DNA...", dna);

                    // For now, we simulate the replacement
                    setTimeout(() => {
                        editor.chain().focus()
                            .insertContentAt({ from, to }, `[Simplificado: ${text.substring(0, 20)}...]`)
                            .unsetHighlight()
                            .run();
                    }, 800);
                })();

                return true;
            },
            checkContradictions: () => ({ editor, chain }) => {
                const { from, to } = editor.state.selection;
                const text = editor.state.doc.textBetween(from, to, ' ');

                if (!text) return false;

                chain().setHighlight({ color: '#fecaca' }).run();
                console.log("[AI Extension] Checking contradictions for:", text);

                return true;
            },
            extractKeyData: () => ({ editor, chain }) => {
                const { from, to } = editor.state.selection;
                const text = editor.state.doc.textBetween(from, to, ' ');

                if (!text) return false;

                chain().setHighlight({ color: '#bfdbfe' }).run();
                console.log("[AI Extension] Extracting data from:", text);

                return true;
            },
        };
    },
});
