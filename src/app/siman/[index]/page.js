'use client';

import { useState, useEffect } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import BubbleMenuExtension from '@tiptap/extension-bubble-menu';
import { Mark, mergeAttributes } from '@tiptap/core';
import { useParams, useRouter } from 'next/navigation';
import TableOfContents from '@/components/TableOfContents';

// --- הגדרות Tiptap ---
const CommentMark = Mark.create({
    name: 'comment',
    addAttributes() { return { id: { default: null } } },
    parseHTML() { return [{ tag: 'mark', getAttrs: el => ({ id: el.getAttribute('data-id') }) }]; },
    renderHTML({ HTMLAttributes }) {
        return ['mark', mergeAttributes(HTMLAttributes, {
            'data-id': HTMLAttributes.id,
            class: 'bg-yellow-200/70 border-b-2 border-yellow-400 cursor-pointer hover:bg-yellow-300 transition-colors'
        }), 0]
    },
});

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

// --- קומפוננטת עורך בודד ---
const SingleSegmentEditor = ({
    initialContent, label, id, versionId, isActive, isFocused,
    onClick, onNewComment, onCommentClick, onZoom, onSaveTextChange
}) => {
    const [isEditingText, setIsEditingText] = useState(false);

    const editor = useEditor({
        extensions: [StarterKit, CustomTextStyle, BubbleMenuExtension, CommentMark],
        content: initialContent,
        textDirection: 'rtl',
        editable: false, // מתחילים במצב נעול (קריאה בלבד)
        immediatelyRender: false,
    });

    // סנכרון מצב העריכה הידני (עיפרון) מול Tiptap
    useEffect(() => {
        if (editor) {
            editor.setEditable(isEditingText);
        }
    }, [editor, isEditingText]);

    // זיהוי לחיצה על הערה קיימת
    useEffect(() => {
        if (!editor || isEditingText) return; // לא מפעילים בזמן עריכת טקסט

        const handleSelection = () => {
            const { $from } = editor.state.selection;
            const currentMarks = $from.marks().filter(mark => mark.type.name === 'comment');

            if (currentMarks.length > 0) {
                const ids = currentMarks.map(mark => mark.attrs.id);

                // חילוץ ה"דיבור המתחיל" (הטקסט שנמצא מתחת לסימון)
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

        // --- טריק להוספת סימון כשהעורך נעול ---
        // פותחים לרגע את הנעילה כדי שה-Mark ייתפס
        if (!isEditingText) editor.setEditable(true);

        const tempId = crypto.randomUUID();
        editor.chain().focus().setTextSelection({ from, to }).setMark('comment', { id: tempId }).run();

        // נועלים חזרה מיד
        if (!isEditingText) editor.setEditable(false);
        // ----------------------------------------

        onNewComment(text, tempId, editor.getJSON(), versionId);
    };

    const handleSaveText = () => {
        onSaveTextChange(versionId, editor.getJSON());
        setIsEditingText(false);
    };

    if (!editor) return null;

    return (
        <div
            id={id}
            onClick={onClick}
            className={`
        mb-8 border rounded-xl transition-all duration-300 relative group bg-white
        ${isActive ? 'border-blue-500 shadow-md ring-1 ring-blue-500' : 'border-transparent hover:border-gray-200 hover:shadow-sm'}
        ${isFocused ? 'shadow-2xl ring-2 ring-blue-200 min-h-[60vh]' : ''}
        ${isEditingText ? 'ring-2 ring-green-400 border-green-500' : ''}
      `}
        >
            {/* תיקון לשגיאת removeChild:
         אנחנו משתמשים ב-CSS (hidden) כדי להסתיר את התפריט כשיש עריכת טקסט,
         במקום להסיר אותו מה-DOM בעזרת React conditional rendering.
      */}
            {editor && (
                <div className={isEditingText ? 'hidden' : 'block'}>
                    <BubbleMenu
                        editor={editor}
                        tippyOptions={{ duration: 100 }}
                        shouldShow={({ editor, state }) => {
                            // מציגים את התפריט אם יש בחירה, גם כשהעורך במצב read-only (editable=false)
                            return !state.selection.empty && !editor.isActive('comment');
                        }}
                    >
                        <button onClick={handleAddComment} className="bg-slate-800 text-white text-xs font-medium px-3 py-1.5 rounded-md shadow-xl hover:bg-black flex items-center gap-2 transform transition-all active:scale-95">
                            <span className="text-yellow-400 font-bold text-lg">+</span> <span>כתוב פירוש</span>
                        </button>
                    </BubbleMenu>
                </div>
            )}

            {/* כותרת וכלים */}
            <div className={`flex justify-between items-center px-4 pt-3 pb-2 border-b ${isEditingText ? 'bg-green-50 border-green-100' : 'border-transparent group-hover:border-gray-50'}`}>
                <div className="flex gap-2">
                    {!isFocused && !isEditingText && (
                        <button onClick={(e) => { e.stopPropagation(); onZoom(); }} className="text-gray-300 hover:text-blue-600 p-1.5 rounded-full hover:bg-blue-50 transition-colors" title="הגדל סעיף">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
                        </button>
                    )}

                    {!isEditingText && (
                        <button onClick={(e) => { e.stopPropagation(); setIsEditingText(true); }} className="text-gray-300 hover:text-green-600 p-1.5 rounded-full hover:bg-green-50 transition-colors" title="ערוך את הטקסט עצמו">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {isEditingText && <span className="text-xs font-bold text-green-600 bg-white px-2 py-0.5 rounded shadow-sm border border-green-100 animate-pulse">מצב עריכת מקור</span>}
                    <span className={`text-xs font-bold tracking-wide ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'}`}>
                        {label}
                    </span>
                </div>
            </div>

            <div className="px-8 py-6 relative">
                <div className={`font-torah text-gray-900 leading-loose ${isFocused ? 'text-2xl' : 'text-xl'}`}>
                    <EditorContent editor={editor} />
                </div>

                {isEditingText && (
                    <div className="absolute bottom-4 left-4 flex gap-2 z-10">
                        <button onClick={() => setIsEditingText(false)} className="bg-white border border-gray-300 text-gray-600 px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50">ביטול</button>
                        <button onClick={handleSaveText} className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-md hover:bg-green-700">שמור שינויים בטקסט</button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- הדף הראשי ---
export default function SimanPage() {
    const params = useParams();
    const router = useRouter();

    const [segments, setSegments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSegmentId, setActiveSegmentId] = useState(null);
    const [focusedSegmentId, setFocusedSegmentId] = useState(null);

    const [draftComment, setDraftComment] = useState(null);
    const [loadedComments, setLoadedComments] = useState([]);
    const [currentCommentIndex, setCurrentCommentIndex] = useState(0);
    const [feedComments, setFeedComments] = useState([]);

    const currentIndex = parseInt(params.index) || 1;

    // טעינת הסימן
    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const res = await fetch(`/api/siman?i=${currentIndex}`);
                const json = await res.json();
                if (json.data) setSegments(json.data);
            } catch (err) { console.error(err); } finally { setLoading(false); }
        }
        fetchData();
    }, [currentIndex]);

    // טעינת הפיד של הפירושים כשעוברים סעיף
    useEffect(() => {
        if (!activeSegmentId || !segments.length) return;
        const activeSeg = segments.find(s => s.index_label === activeSegmentId);
        if (activeSeg) fetchFeed(activeSeg.version_id);
    }, [activeSegmentId, segments]);

    const fetchFeed = async (versionId) => {
        try {
            const res = await fetch(`/api/annotations/list?versionId=${versionId}`);
            const json = await res.json();
            setFeedComments(json.list || []);
        } catch (err) { console.error(err); }
    };

    const goNextSiman = () => { setFocusedSegmentId(null); router.push(`/siman/${currentIndex + 1}`); };
    const enterFocusMode = (segId) => { setFocusedSegmentId(segId); setActiveSegmentId(segId); };
    const exitFocusMode = () => setFocusedSegmentId(null);

    const navigateFocusedSegment = (direction) => {
        const idx = segments.findIndex(s => s.index_label === focusedSegmentId);
        const newIdx = idx + direction;
        if (newIdx >= 0 && newIdx < segments.length) {
            const newSeg = segments[newIdx];
            setFocusedSegmentId(newSeg.index_label); setActiveSegmentId(newSeg.index_label);
        }
    };

    const saveTextChange = async (versionId, newJson) => {
        try {
            await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    version_id: versionId,
                    content_json: newJson,
                    annotation: null
                })
            });
            alert('הטקסט עודכן בהצלחה!');
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert('שגיאה בשמירת הטקסט');
        }
    };

    const startNewComment = (quote, uuid, newJson, versionId) => {
        setLoadedComments([]); setCurrentCommentIndex(0);
        setDraftComment({ quote, uuid, newJson, versionId, content: '', isExisting: false });
    };

    const loadExistingComments = async (uuids, quoteText = "") => {
        if (loadedComments.length > 0 && loadedComments[0].uuid === uuids[0] && loadedComments.length === uuids.length) return;
        try {
            const promises = uuids.map(id => fetch(`/api/annotation?id=${id}`).then(res => res.json()));
            const results = await Promise.all(promises);
            const commentsData = results.map((res, index) => ({
                uuid: uuids[index],
                content: res.content || "",
                quote: quoteText,
                isExisting: true
            }));
            setLoadedComments(commentsData); setCurrentCommentIndex(0); setDraftComment(commentsData[0]);
        } catch (err) { console.error(err); }
    };

    const navigateComments = (dir) => {
        const newIndex = currentCommentIndex + dir;
        if (newIndex >= 0 && newIndex < loadedComments.length) {
            setCurrentCommentIndex(newIndex); setDraftComment(loadedComments[newIndex]);
        }
    };

    const saveComment = async () => {
        if (!draftComment) return;
        try {
            if (draftComment.isExisting) {
                await fetch('/api/annotation', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uuid: draftComment.uuid, content: draftComment.content }) });
            } else {
                await fetch('/api/save', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        version_id: draftComment.versionId,
                        content_json: draftComment.newJson,
                        // שליחת ה-quote ל-DB!
                        annotation: { uuid: draftComment.uuid, text: draftComment.content, quote: draftComment.quote }
                    })
                });
            }
            setDraftComment(null);
            const activeSeg = segments.find(s => s.index_label === activeSegmentId);
            if (activeSeg) fetchFeed(activeSeg.version_id);
            if (!draftComment.isExisting) window.location.reload();
        } catch (err) { alert('שגיאה'); }
    };

    const deleteComment = async () => {
        if (!draftComment?.uuid) return;
        if (!confirm('למחוק?')) return;
        try { await fetch(`/api/annotation?id=${draftComment.uuid}&versionId=0`, { method: 'DELETE' }); window.location.reload(); } catch (err) { alert('שגיאה'); }
    };

    const segmentsToDisplay = focusedSegmentId ? segments.filter(s => s.index_label === focusedSegmentId) : segments;

    return (
        <main className="h-screen bg-[#F7F7F5] flex flex-col overflow-hidden font-sans text-slate-900">
            <header className="bg-white border-b border-gray-200 h-14 flex items-center justify-between px-6 z-30 shrink-0 shadow-sm">
                <div className="flex items-center gap-3">
                    <h1 className="text-lg font-bold text-gray-800">שולחן ערוך</h1>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">אורח חיים / סימן {currentIndex}</span>
                </div>
            </header>
            <div className="flex flex-1 overflow-hidden">

                <div className={`hidden md:block z-20 shadow-[1px_0_10px_rgba(0,0,0,0.03)] bg-white transition-all duration-300 ${focusedSegmentId ? 'w-0 overflow-hidden opacity-0' : 'w-64 opacity-100'}`}>
                    <TableOfContents />
                </div>

                <div className="flex-1 overflow-y-auto bg-[#F7F7F5] relative scroll-smooth">
                    <div className="max-w-[750px] mx-auto py-12 px-8 min-h-screen">
                        {focusedSegmentId && (
                            <button onClick={exitFocusMode} className="mb-8 flex items-center gap-2 text-gray-500 hover:text-blue-600 font-medium transition-colors">
                                <span className="text-xl">→</span> חזרה לרשימה המלאה
                            </button>
                        )}

                        {loading ? <div className="text-center mt-20 text-gray-400">טוען סימן...</div> :
                            segmentsToDisplay.map((seg) => (
                                <SingleSegmentEditor
                                    key={seg.index_label}
                                    id={`seg-${seg.index_label}`}
                                    initialContent={seg.content_json}
                                    label={`סעיף ${seg.index_label}`}
                                    versionId={seg.version_id}
                                    isActive={activeSegmentId === seg.index_label}
                                    isFocused={!!focusedSegmentId}
                                    onClick={() => setActiveSegmentId(seg.index_label)}
                                    onZoom={() => enterFocusMode(seg.index_label)}
                                    onNewComment={startNewComment}
                                    onCommentClick={loadExistingComments}
                                    onSaveTextChange={saveTextChange}
                                />
                            ))}

                        {focusedSegmentId && segments.length > 0 && (
                            <div className="flex justify-between mt-8 border-t pt-8 text-sm font-bold text-gray-500">
                                <button onClick={() => navigateFocusedSegment(-1)} disabled={segments[0].index_label === focusedSegmentId} className="hover:text-blue-600 disabled:opacity-30">→ סעיף קודם</button>
                                <button onClick={() => navigateFocusedSegment(1)} disabled={segments[segments.length - 1].index_label === focusedSegmentId} className="hover:text-blue-600 disabled:opacity-30">סעיף הבא ←</button>
                            </div>
                        )}

                        {!loading && !focusedSegmentId && segments.length > 0 && (
                            <div className="mt-12 flex justify-center border-t border-gray-200 pt-8 pb-20">
                                <button onClick={goNextSiman} className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-full font-medium hover:bg-gray-50 shadow-sm transition-all">לסימן הבא ({currentIndex + 1}) ←</button>
                            </div>
                        )}
                    </div>
                </div>

                <aside className="w-[420px] bg-white border-r border-gray-200 flex flex-col shadow-xl z-30">
                    {draftComment ? (
                        <div className="flex flex-col h-full animate-in slide-in-from-right-5 duration-300 bg-white">
                            {loadedComments.length > 1 && (
                                <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-gray-200 text-xs font-medium text-slate-600">
                                    <button onClick={() => navigateComments(-1)} disabled={currentCommentIndex === 0} className="hover:bg-white px-2 py-1 rounded border border-transparent hover:border-gray-200 disabled:opacity-30">◄</button>
                                    <span>הערה {currentCommentIndex + 1} מתוך {loadedComments.length}</span>
                                    <button onClick={() => navigateComments(1)} disabled={currentCommentIndex === loadedComments.length - 1} className="hover:bg-white px-2 py-1 rounded border border-transparent hover:border-gray-200 disabled:opacity-30">►</button>
                                </div>
                            )}
                            <div className={`p-8 border-b border-gray-100 relative overflow-hidden`}>
                                <div className={`absolute top-0 right-0 w-1.5 h-full ${draftComment.isExisting ? 'bg-blue-500' : 'bg-yellow-400'}`}></div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${draftComment.isExisting ? 'text-blue-600' : 'text-yellow-600'}`}>
                                        {draftComment.isExisting ? 'עריכה פעילה' : 'יצירת הערה'}
                                    </span>
                                </div>
                                <h3 className="font-torah text-xl text-gray-900 leading-snug mb-1">{draftComment.quote}</h3>
                            </div>
                            <div className="flex-1 p-6 bg-gray-50/30">
                                <textarea
                                    className="w-full h-full resize-none outline-none text-lg leading-relaxed bg-transparent placeholder:text-gray-300 font-serif"
                                    placeholder="כתוב את ביאורך כאן..."
                                    value={draftComment.content}
                                    onChange={(e) => setDraftComment({ ...draftComment, content: e.target.value })}
                                    autoFocus
                                />
                            </div>
                            <div className="p-6 border-t border-gray-100 flex gap-4 bg-white">
                                {draftComment.isExisting && <button onClick={deleteComment} className="text-gray-400 hover:text-red-600 p-2"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg></button>}
                                <div className="flex-1"></div>
                                <button onClick={() => setDraftComment(null)} className="px-5 py-2.5 text-sm text-gray-500 hover:text-gray-800 font-medium">ביטול</button>
                                <button onClick={saveComment} className="bg-slate-900 text-white px-8 py-2.5 rounded-lg text-sm font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl">{draftComment.isExisting ? 'שמור שינויים' : 'צור פירוש'}</button>
                            </div>
                        </div>
                    ) : (

                        <div className="flex flex-col h-full bg-slate-50">
                            <div className="p-4 border-b border-gray-200 bg-white">
                                <h3 className="font-bold text-gray-700">פירושים על הסעיף ({feedComments.length})</h3>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {feedComments.length > 0 ? (
                                    feedComments.map((comment) => (
                                        <div
                                            key={comment.annotation_uuid}
                                            onClick={() => loadExistingComments([comment.annotation_uuid], comment.quote_text)}
                                            className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group"
                                        >
                                            <div className="text-xs font-bold text-blue-600 mb-1 opacity-70 group-hover:opacity-100 font-torah">
                                                {comment.quote_text || 'פירוש מסומן'}
                                            </div>
                                            <div className="font-serif text-gray-800 line-clamp-3">
                                                {comment.content}
                                            </div>
                                            <div className="text-[10px] text-gray-400 mt-2 text-left">
                                                {new Date(comment.created_at).toLocaleDateString('he-IL')}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-gray-400 mt-20">
                                        <p className="text-sm">עדיין אין פירושים בסעיף זה.</p>
                                        <p className="text-xs mt-2">לחץ על העיפרון כדי לערוך טקסט, או סמן להוספת פירוש.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </aside>

            </div>
        </main>
    );
}