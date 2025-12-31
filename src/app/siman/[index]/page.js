'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import TableOfContents from '@/components/TableOfContents';
import SimanEditor from '@/components/editor/SimanEditor';
import CommentsSidebar from '@/components/comments/CommentsSidebar';

export default function SimanPage() {
    const params = useParams();
    const [segments, setSegments] = useState([]);
    const [simanTitle, setSimanTitle] = useState("");
    const [loading, setLoading] = useState(true);
    const [activeSegmentId, setActiveSegmentId] = useState(null);
    const [focusedSegmentId, setFocusedSegmentId] = useState(null);

    const [draftComment, setDraftComment] = useState(null);
    const [loadedComments, setLoadedComments] = useState([]);
    const [currentCommentIndex, setCurrentCommentIndex] = useState(0);
    const [feedComments, setFeedComments] = useState([]);

    const currentIndex = parseInt(params.index) || 1;

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const res = await fetch(`/api/siman?i=${currentIndex}`);
                const json = await res.json();
                if (json.data) {
                    setSegments(json.data);
                    setSimanTitle(json.simanTitle || "");
                }
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        }
        fetchData();
    }, [currentIndex]);

    // שליפת הפיד מהקבוצה האחרונה המשויכת לגרסה
    useEffect(() => {
        if (!activeSegmentId || !segments.length) return;
        const activeSeg = segments.find(s => s.seif_id === activeSegmentId);
        if (activeSeg) fetchFeed(activeSeg.version_id);
    }, [activeSegmentId, segments]);

    const fetchFeed = async (versionId) => {
        try {
            const res = await fetch(`/api/annotations/list?versionId=${versionId}`);
            const json = await res.json();

            // הגנה מפני כפילויות UUID ברמת ה-UI
            const unique = [];
            const seen = new Set();
            (json.list || []).forEach(c => {
                if (!seen.has(c.uuid)) {
                    seen.add(c.uuid);
                    unique.push(c);
                }
            });
            setFeedComments(unique);
        } catch (err) { console.error(err); }
    };
    // בתוך SimanPage.js - החלף את פונקציות השמירה הקיימות:

    const saveTextChange = async (versionId, newJson) => {
        const currentSegment = segments.find(seg => seg.version_id === versionId);
        if (!currentSegment) return;

        try {
            const res = await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    seif_id: currentSegment.seif_id,
                    version_id: versionId,
                    content_json: newJson
                })
            });
            const data = await res.json();

            if (data.success) {
                // עדכון ה-State: אם חזר versionId חדש (כי הטקסט השתנה), נעדכן אותו
                setSegments(prev => prev.map(s =>
                    s.seif_id === currentSegment.seif_id
                        ? { ...s, version_id: data.versionId, content_json: newJson }
                        : s
                ));
            }
        } catch (err) { console.error("Save Text Error:", err); }
    };

    const saveComment = async () => {
        if (!draftComment) return;

        try {
            if (draftComment.isExisting) {
                // ... עדכון פירוש קיים (PUT) - ללא שינוי ...
                await fetch('/api/annotation', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: draftComment.uuid, content: draftComment.content })
                });
                setFeedComments(prev => prev.map(c => c.uuid === draftComment.uuid ? { ...c, content: draftComment.content } : c));
            } else {
                // הזרקת התוכן ל-JSON החדש
                const enrichedJson = JSON.parse(JSON.stringify(draftComment.newJson));
                const inject = (node) => {
                    if (node.marks) {
                        node.marks.forEach(m => {
                            if (m.type === 'comment') {
                                if (m.attrs.id === draftComment.uuid) m.attrs.content = draftComment.content;
                                else {
                                    const ex = feedComments.find(c => c.uuid === m.attrs.id);
                                    if (ex) m.attrs.content = ex.content;
                                }
                            }
                        });
                    }
                    if (node.content) node.content.forEach(inject);
                };
                inject(enrichedJson);

                const res = await fetch('/api/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        seif_id: draftComment.seifId,
                        version_id: draftComment.versionId,
                        content_json: enrichedJson
                    })
                });

                const data = await res.json();
                if (data.success) {
                    // עדכון ה-State עם ה-JSON וה-versionId שחזר
                    setSegments(prev => prev.map(s =>
                        s.seif_id === draftComment.seifId
                            ? { ...s, version_id: data.versionId, content_json: enrichedJson }
                            : s
                    ));
                    fetchFeed(data.versionId);
                }
            }
            setDraftComment(null);
        } catch (err) { console.error("Save Comment Error:", err); }
    };

    const startNewComment = (quote, uuid, newJson, versionId) => {
        const currentSeg = segments.find(s => s.version_id === versionId);
        setDraftComment({
            quote, uuid, newJson, versionId,
            seifId: currentSeg?.seif_id,
            content: '', isExisting: false
        });
    };

    const loadExistingComments = async (uuids, quoteText = "") => {
        try {
            const promises = uuids.map(id => fetch(`/api/annotation?id=${id}`).then(res => res.json()));
            const results = await Promise.all(promises);
            const data = results.map((res, i) => ({ uuid: uuids[i], content: res.content || "", quote: quoteText, isExisting: true }));
            setLoadedComments(data);
            setCurrentCommentIndex(0);
            setDraftComment(data[0]);
        } catch (err) { console.error(err); }
    };

    return (
        <main className="h-screen bg-[#F7F7F5] flex flex-col overflow-hidden font-sans">
            <header className="bg-white border-b h-14 flex items-center justify-between px-6 z-30 shadow-sm">
                <h1 className="text-lg font-bold">שולחן ערוך - עורך גרסאות</h1>
            </header>

            <div className="flex flex-1 overflow-hidden">
                <div className={`hidden md:block bg-white transition-all ${focusedSegmentId ? 'w-0 opacity-0' : 'w-64 opacity-100'}`}>
                    <TableOfContents />
                </div>

                <div className="flex-1 overflow-y-auto relative scroll-smooth bg-[#F7F7F5]">
                    <div className="max-w-[750px] mx-auto py-12 px-8">
                        {focusedSegmentId && (
                            <button onClick={() => setFocusedSegmentId(null)} className="mb-8 text-gray-500 hover:text-blue-600 font-medium">
                                → חזרה לכל הסימן
                            </button>
                        )}
                        {!loading && !focusedSegmentId && simanTitle && (
                            <h2 className="text-3xl font-serif font-bold text-center mb-10 border-b-2 pb-6">{simanTitle}</h2>
                        )}

                        {loading ? <div className="text-center mt-20 text-gray-400 font-torah">טוען נתונים...</div> : (
                            (focusedSegmentId ? segments.filter(s => s.seif_id === focusedSegmentId) : segments).map((seg) => (
                                <SimanEditor
                                    key={seg.seif_id}
                                    id={`seg-${seg.seif_id}`}
                                    initialContent={seg.content_json}
                                    label={`סעיף ${seg.index_label}`}
                                    versionId={seg.version_id}
                                    isActive={activeSegmentId === seg.seif_id}
                                    isFocused={focusedSegmentId === seg.seif_id}
                                    onClick={() => setActiveSegmentId(seg.seif_id)}
                                    onZoom={() => { setFocusedSegmentId(seg.seif_id); setActiveSegmentId(seg.seif_id); }}
                                    onNewComment={startNewComment}
                                    onCommentClick={loadExistingComments}
                                    onSaveTextChange={saveTextChange}
                                />
                            ))
                        )}
                    </div>
                </div>

                <aside className="w-[420px] bg-white border-r shadow-xl z-30 flex flex-col">
                    <CommentsSidebar
                        draftComment={draftComment}
                        loadedComments={loadedComments}
                        currentCommentIndex={currentCommentIndex}
                        feedComments={feedComments}
                        onNavigateComments={(dir) => {
                            const n = currentCommentIndex + dir;
                            if (n >= 0 && n < loadedComments.length) { setCurrentCommentIndex(n); setDraftComment(loadedComments[n]); }
                        }}
                        setDraftComment={setDraftComment}
                        onSaveComment={saveComment}
                    />
                </aside>
            </div>
        </main>
    );
}