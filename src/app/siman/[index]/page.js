'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TableOfContents from '@/components/TableOfContents';
// הייבוא של הרכיבים החדשים שלנו:
import SimanEditor from '@/components/editor/SimanEditor';
import CommentsSidebar from '@/components/comments/CommentsSidebar';

export default function SimanPage() {
    const params = useParams();
    const router = useRouter();

    // --- State Management ---
    const [segments, setSegments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSegmentId, setActiveSegmentId] = useState(null);
    const [focusedSegmentId, setFocusedSegmentId] = useState(null);

    const [draftComment, setDraftComment] = useState(null);
    const [loadedComments, setLoadedComments] = useState([]);
    const [currentCommentIndex, setCurrentCommentIndex] = useState(0);
    const [feedComments, setFeedComments] = useState([]);

    const currentIndex = parseInt(params.index) || 1;

    // כל פעם שהדף נטען או שה currentIndex משתנה. לוקחים את הDATA ששיך לעמוד הזה. עפ ה currentIndex
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

    // אחראי על כל פעם שבוחרים סעיף, לטעון את הפירושים שלו
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

    // --- ניווט ופוקוס ---
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

    // --- לוגיקה עסקית (שמירה, מחיקה וכו') ---

    // 1. שמירת טקסט (מעבירים את זה ל-SimanEditor)
    const saveTextChange = async (versionId, newJson, updatedQuotes) => {
        setSegments(prev => prev.map(seg => {
            if (seg.version_id === versionId) {
                return { ...seg, content_json: newJson };
            }
            return seg;
        }));

        try {
            await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    version_id: versionId,
                    content_json: newJson,
                    annotation: null,
                    updatedQuotes: updatedQuotes
                })
            });
            fetchFeed(versionId);
        } catch (err) {
            console.error(err);
            alert('שגיאה בשמירת הטקסט');
        }
    };

    // 2. יצירת הערה חדשה (מופעל מתוך SimanEditor)
    const startNewComment = (quote, uuid, newJson, versionId) => {
        setLoadedComments([]); setCurrentCommentIndex(0);
        setDraftComment({ quote, uuid, newJson, versionId, content: '', isExisting: false });
    };

    // 3. טעינת הערה קיימת (מופעל מתוך SimanEditor או CommentsSidebar)
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
                        annotation: { uuid: draftComment.uuid, text: draftComment.content, quote: draftComment.quote }
                    })
                });

                setSegments(prev => prev.map(seg => {
                    if (seg.version_id === draftComment.versionId) {
                        return { ...seg, content_json: draftComment.newJson };
                    }
                    return seg;
                }));
            }
            setDraftComment(null);
            fetchFeed(draftComment.versionId);
        } catch (err) { alert('שגיאה'); }
    };

    const deleteComment = async () => {
        if (!draftComment?.uuid) return;
        if (!confirm('למחוק?')) return;
        try {
            await fetch(`/api/annotation?id=${draftComment.uuid}&versionId=${draftComment.versionId || activeSegmentId}`, { method: 'DELETE' });

            // רענון הנתונים כדי לנקות את הצהוב
            const res = await fetch(`/api/siman?i=${currentIndex}`);
            const json = await res.json();
            setSegments(json.data);

            setDraftComment(null);
            const activeSeg = segments.find(s => s.index_label === activeSegmentId);
            if (activeSeg) fetchFeed(activeSeg.version_id);

        } catch (err) { alert('שגיאה'); }
    };

    const segmentsToDisplay = focusedSegmentId ? segments.filter(s => s.index_label === focusedSegmentId) : segments;

    // --- הרינדור (View) ---
    return (
        <main className="h-screen bg-[#F7F7F5] flex flex-col overflow-hidden font-sans text-slate-900">
            <header className="bg-white border-b border-gray-200 h-14 flex items-center justify-between px-6 z-30 shrink-0 shadow-sm">
                <div className="flex items-center gap-3">
                    <h1 className="text-lg font-bold text-gray-800">שולחן ערוך</h1>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">אורח חיים / סימן {currentIndex}</span>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* 1. תוכן עניינים */}
                <div className={`hidden md:block z-20 shadow-[1px_0_10px_rgba(0,0,0,0.03)] bg-white transition-all duration-300 ${focusedSegmentId ? 'w-0 overflow-hidden opacity-0' : 'w-64 opacity-100'}`}>
                    <TableOfContents />
                </div>

                {/* 2. אזור הטקסט המרכזי */}
                <div className="flex-1 overflow-y-auto bg-[#F7F7F5] relative scroll-smooth">
                    <div className="max-w-[750px] mx-auto py-12 px-8 min-h-screen">
                        {focusedSegmentId && (
                            <button onClick={exitFocusMode} className="mb-8 flex items-center gap-2 text-gray-500 hover:text-blue-600 font-medium transition-colors">
                                <span className="text-xl">→</span> חזרה לרשימה המלאה
                            </button>
                        )}

                        {loading ? <div className="text-center mt-20 text-gray-400">טוען סימן...</div> :
                            segmentsToDisplay.map((seg) => (
                                <SimanEditor
                                    key={seg.index_label}
                                    id={`seg-${seg.index_label}`}
                                    initialContent={seg.content_json}
                                    label={`סעיף ${seg.index_label}`}
                                    versionId={seg.version_id}
                                    isActive={activeSegmentId === seg.index_label}
                                    isFocused={!!focusedSegmentId}
                                    // כאן אנחנו מעבירים את הפונקציות לילדים:
                                    onClick={() => setActiveSegmentId(seg.index_label)}
                                    onZoom={() => enterFocusMode(seg.index_label)}
                                    onNewComment={startNewComment}
                                    onCommentClick={loadExistingComments}
                                    onSaveTextChange={saveTextChange}
                                />
                            ))}

                        {/* ניווט תחתון (לא השתנה) */}
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

                {/* 3. צד שמאל - הערות */}
                <aside className="w-[420px] bg-white border-r border-gray-200 flex flex-col shadow-xl z-30">
                    <CommentsSidebar
                        draftComment={draftComment}
                        loadedComments={loadedComments}
                        currentCommentIndex={currentCommentIndex}
                        feedComments={feedComments}
                        onNavigateComments={navigateComments}
                        setDraftComment={setDraftComment}
                        onSaveComment={saveComment}
                        onDeleteComment={deleteComment}
                        onLoadExistingComments={loadExistingComments}
                    />
                </aside>
            </div>
        </main>
    );
}