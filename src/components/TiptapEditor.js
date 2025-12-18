'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

const content = {
    "type": "doc",
    "content": [
        {
            "type": "paragraph",
            "content": [{ "type": "text", "text": "יתגבר כארי לעמוד בבוקר לעבודת בוראו, שיהא הוא מעורר השחר." }]
        },
        {
            "type": "paragraph",
            "content": [{ "type": "text", "text": "הגה: ועל כל פנים לא יאחר זמן התפלה שהצבור מתפללין. (טור)." }]
        }
    ]
}

const TiptapEditor = () => {
    const editor = useEditor({
        extensions: [StarterKit],
        content: content,
        immediatelyRender: false, // <--- הנה התיקון שהוספנו
        editorProps: {
            attributes: {
                class: 'prose prose-lg m-5 focus:outline-none',
                dir: 'rtl',
            },
        },
    })

    if (!editor) {
        return null
    }

    return (
        <div style={{ direction: 'rtl', fontFamily: 'Frank Ruhl Libre, serif', fontSize: '22px', maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center' }}>עורך שולחן ערוך - סימן א'</h2>
            <div style={{ border: '1px solid #ccc', padding: '20px', minHeight: '300px', borderRadius: '8px', background: '#fff', color: '#000' }}>
                <EditorContent editor={editor} />
            </div>
        </div>
    )
}

export default TiptapEditor