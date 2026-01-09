import { Node, mergeAttributes } from '@tiptap/core';

export const NoteMarker = Node.create({
    name: 'noteMarker',
    group: 'inline',
    inline: true,
    selectable: false,
    atom: true,

    addAttributes() {
        return {
            noteId: {
                default: null,
            },
            number: {
                default: 0,
            },
            type: {
                default: 'review',
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-note-id]',
                getAttrs: (element) => {
                    const el = element as HTMLElement;
                    console.log('📖 Parsing NoteMarker:', el.getAttribute('data-note-id'));
                    return {
                        noteId: el.getAttribute('data-note-id') || el.getAttribute('data-id'),
                        number: parseInt(el.textContent || '0'),
                        type: el.classList.contains('note-ref-ai') ? 'ai_instruction' : 'review',
                    };
                },
            },
        ];
    },

    renderHTML({ HTMLAttributes, node }) {
        console.log('🎨 Rendering NoteMarker:', node.attrs.noteId);
        const typeClass = node.attrs.type === 'ai_instruction' ? 'note-ref-ai' : 'note-ref-review';
        return [
            'span',
            mergeAttributes(HTMLAttributes, {
                'class': `note-ref ${typeClass}`,
                'data-note-id': node.attrs.noteId,
            }),
            node.attrs.number.toString(),
        ];
    },
});
