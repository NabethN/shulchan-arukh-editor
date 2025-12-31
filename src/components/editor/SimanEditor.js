'use client';

import { useState, useEffect } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import { editorExtensions } from './extensions';

const SimanEditor = ({
    initialContent,
    label,
    id,
    versionId, // זהו ה-seif_version_id הקבוע
    isActive,
    isFocused,
    onClick,
    onNewComment,
    onCommentClick,
    onZoom,
    onSaveTextChange
}) => {
    const [isEditingText, setIsEditingText] = useState(false);

    const editor = useEditor({
        extensions: editorExtensions,
        content: initialContent,
        textDirection: 'rtl',
        editable: false,
        immediatelyRender: false,
    });

    useEffect(() => {
        if (editor && initialContent) {
            const currentJSON = JSON.stringify(editor.getJSON());
            const newJSON = JSON.stringify(initialContent);
            if (currentJSON !== newJSON) {
                editor.commands.setContent(initialContent);
            }
        }
    }, [initialContent, editor]);

    useEffect(() => {
        if (editor) {
            editor.setEditable(isEditingText);
        }
    }, [editor, isEditingText]);

    useEffect(() => {
        if (!editor || isEditingText) return;

        const handleSelection = () => {
            const { $from } = editor.state.selection;
            const currentMarks = $from.marks().filter(mark => mark.type.name === 'comment');

            if (currentMarks.length > 0) {
                const ids = currentMarks.map(mark => mark.attrs.id);
                let markRange = { from: $from.pos, to: $from.pos };
                editor.state.doc.nodesBetween($from.pos, $from.pos, (node, pos) => {
                    if (node.marks.find(m => m.type.name === 'comment')) {
                        markRange = { from: pos, to: pos + node.nodeSize };
                    }
                });
                const quoteText = editor.state.doc.textBetween(markRange.from, markRange.to, ' ');
                onCommentClick(ids, quoteText);
            }
        };
        editor.on('selectionUpdate', handleSelection);
        return () => editor.off('selectionUpdate', handleSelection);
    }, [editor, onCommentClick, isEditingText]);

    const handleAddComment = () => {
        if (!editor) return;
        const { from, to } = editor.state.selection;
        const text = editor.state.doc.textBetween(from, to, ' ');
        if (!text) return;

        if (!isEditingText) editor.setEditable(true);
        const tempId = crypto.randomUUID();
        editor.chain().focus().setTextSelection({ from, to }).setMark('comment', { id: tempId }).run();
        if (!isEditingText) editor.setEditable(false);

        onNewComment(text, tempId, editor.getJSON(), versionId);
    };

    const handleSaveText = () => {
        // שליחת ה-versionId הקבוע לטובת עדכון ה-content בגרסה הקיימת
        onSaveTextChange(versionId, editor.getJSON());
        setIsEditingText(false);
    };

    if (!editor) return null;

    return (
        <div id={id} onClick={onClick} className={`mb-8 border rounded-xl transition-all duration-300 relative group bg-white ${isActive ? 'border-blue-500 shadow-md ring-1 ring-blue-500' : 'border-transparent hover:border-gray-200 hover:shadow-sm'} ${isFocused ? 'shadow-2xl ring-2 ring-blue-200 min-h-[60vh]' : ''} ${isEditingText ? 'ring-2 ring-green-400 border-green-500' : ''}`}>
            {editor && (
                <div className={isEditingText ? 'hidden' : 'block'}>
                    <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} shouldShow={({ state, editor }) => !state.selection.empty && !editor.isActive('comment')}>
                        <button onClick={handleAddComment} className="bg-slate-800 text-white text-xs font-medium px-3 py-1.5 rounded-md shadow-xl hover:bg-black flex items-center gap-2 transform transition-all active:scale-95">
                            <span className="text-yellow-400 font-bold text-lg">+</span> <span>כתוב פירוש</span>
                        </button>
                    </BubbleMenu>
                </div>
            )}

            <div className={`flex justify-between items-center px-4 pt-3 pb-2 border-b ${isEditingText ? 'bg-green-50 border-green-100' : 'border-transparent group-hover:border-gray-50'}`}>
                <div className="flex gap-2">
                    {!isEditingText && (
                        <>
                            <button onClick={(e) => { e.stopPropagation(); onZoom(); }} className="text-gray-300 hover:text-blue-600 p-1.5 rounded-full hover:bg-blue-50 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setIsEditingText(true); }} className="text-gray-300 hover:text-green-600 p-1.5 rounded-full hover:bg-green-50 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                            </button>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {isEditingText && <span className="text-xs font-bold text-green-600 animate-pulse">מצב עריכת מקור</span>}
                    <span className={`text-xs font-bold ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>{label}</span>
                </div>
            </div>

            <div className="px-8 py-6 relative">
                <div className={`font-torah text-gray-900 leading-loose ${isFocused ? 'text-2xl' : 'text-xl'}`}>
                    <EditorContent editor={editor} />
                </div>
                {isEditingText && (
                    <div className="absolute bottom-4 left-4 flex gap-2 z-10">
                        <button onClick={() => setIsEditingText(false)} className="bg-white border border-gray-300 px-4 py-1.5 rounded-lg text-sm font-bold">ביטול</button>
                        <button onClick={handleSaveText} className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-md">שמור שינויים</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SimanEditor;