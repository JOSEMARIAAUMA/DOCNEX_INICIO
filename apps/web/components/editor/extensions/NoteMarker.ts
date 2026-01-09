import { Node, mergeAttributes } from '@tiptap/core';

export const NoteMarker = Node.create({
    name: 'noteMarker',
    group: 'inline',
    inline: true,
    selectable: false,
    atom: true,

    addAttributes() {
        return {
            id: {
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
                getAttrs: (element) => ({
                    id: (element as HTMLElement).getAttribute('data-note-id'),
                    number: parseInt((element as HTMLElement).textContent || '0'),
                    type: (element as HTMLElement).classList.contains('note-ref-ai') ? 'ai_instruction' : 'review',
                }),
            },
        ];
    },

    renderHTML({ HTMLAttributes, node }) {
        const typeClass = node.attrs.type === 'ai_instruction' ? 'note-ref-ai' : 'note-ref-review';
        return [
            'span',
            mergeAttributes(HTMLAttributes, {
                'class': `note-ref ${typeClass}`,
                'data-note-id': node.attrs.id,
            }),
            node.attrs.number.toString(),
        ];
    },
});
