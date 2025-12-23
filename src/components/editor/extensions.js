import { Mark, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import BubbleMenuExtension from '@tiptap/extension-bubble-menu';

// 1. הגדרת "סימון הערה" (הרקע הצהוב)
const CommentMark = Mark.create({
    name: 'comment',
    addAttributes() { return { id: { default: null } } },

    // Deserialization: איך מזהים את זה כשקוראים HTML?
    // אנחנו מחפשים תגית <mark> ושולפים ממנה את ה-id
    parseHTML() { return [{ tag: 'mark', getAttrs: el => ({ id: el.getAttribute('data-id') }) }]; },

    // Serialization: איך שומרים/מציגים את זה ב-HTML?
    // אנחנו יוצרים תגית <mark> עם מחלקות עיצוב (Tailwind)
    renderHTML({ HTMLAttributes }) {
        return ['mark', mergeAttributes(HTMLAttributes, {
            'data-id': HTMLAttributes.id,
            class: 'bg-yellow-200/70 border-b-2 border-yellow-400 cursor-pointer hover:bg-yellow-300 transition-colors'
        }), 0]
    },
});

// 2. הגדרת עיצוב טקסט מיוחד (למשל כתב רש"י/רמ"א)
const CustomTextStyle = Mark.create({
    name: 'textStyle',
    addAttributes() {
        return {
            class: {
                default: null,
                parseHTML: element => element.getAttribute('class'),
                renderHTML: attributes => { if (!attributes.class) return {}; return { class: attributes.class }; },
            },
        }
    },
    parseHTML() { return [{ tag: 'span', getAttrs: element => ({ class: element.getAttribute('class') }) }]; },
    renderHTML({ HTMLAttributes }) {
        if (HTMLAttributes.class === 'rema') {
            return ['span', mergeAttributes(HTMLAttributes, {
                style: 'font-size: 0.9em; color: #555; font-family: var(--font-interface); background-color: rgba(0,0,0,0.03); padding: 0 2px; border-radius: 3px;'
            }), 0]
        }
        return ['span', mergeAttributes(HTMLAttributes), 0]
    },
});

// אנחנו מייצאים רשימה מוכנה של כל ההרחבות שלנו
export const editorExtensions = [
    StarterKit,
    BubbleMenuExtension,
    CommentMark,
    CustomTextStyle
];