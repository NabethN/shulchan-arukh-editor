'use client';

export default function CommentsSidebar({
    draftComment,          // ההערה שאנחנו עורכים כרגע (או null אם אין)
    loadedComments,        // רשימת ההערות שטענו עבור הטקסט המסומן
    currentCommentIndex,   // באיזו הערה אנחנו צופים כרגע (דפדוף)
    feedComments,          // הרשימה הכללית של כל ההערות בסימן
    onNavigateComments,    // פונקציה לדפדוף (קדימה/אחורה)
    setDraftComment,       // פונקציה לעדכון הטקסט בטופס
    onSaveComment,         // פונקציה לשמירה
    onDeleteComment,       // פונקציה למחיקה
    onLoadExistingComments // פונקציה שטוענת הערה כשלוחצים עליה ברשימה
}) {

    // מצב 1: עריכה או צפייה בהערה ספציפית (הטופס הגדול)
    if (draftComment) {
        return (
            <div className="flex flex-col h-full animate-in slide-in-from-right-5 duration-300 bg-white">
                {/* כותרת עליונה עם דפדוף אם יש כמה הערות על אותו משפט */}
                {loadedComments.length > 1 && (
                    <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-gray-200 text-xs font-medium text-slate-600">
                        <button onClick={() => onNavigateComments(-1)} disabled={currentCommentIndex === 0} className="hover:bg-white px-2 py-1 rounded border border-transparent hover:border-gray-200 disabled:opacity-30">◄</button>
                        <span>הערה {currentCommentIndex + 1} מתוך {loadedComments.length}</span>
                        <button onClick={() => onNavigateComments(1)} disabled={currentCommentIndex === loadedComments.length - 1} className="hover:bg-white px-2 py-1 rounded border border-transparent hover:border-gray-200 disabled:opacity-30">►</button>
                    </div>
                )}

                {/* אזור הציטוט הצהוב/כחול */}
                <div className={`p-8 border-b border-gray-100 relative overflow-hidden`}>
                    <div className={`absolute top-0 right-0 w-1.5 h-full ${draftComment.isExisting ? 'bg-blue-500' : 'bg-yellow-400'}`}></div>
                    <div className="flex items-center justify-between mb-3">
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${draftComment.isExisting ? 'text-blue-600' : 'text-yellow-600'}`}>
                            {draftComment.isExisting ? 'עריכה פעילה' : 'יצירת הערה'}
                        </span>
                    </div>
                    <h3 className="font-torah text-xl text-gray-900 leading-snug mb-1">{draftComment.quote}</h3>
                </div>

                {/* תיבת הטקסט לכתיבה */}
                <div className="flex-1 p-6 bg-gray-50/30">
                    <textarea
                        className="w-full h-full resize-none outline-none text-lg leading-relaxed bg-transparent placeholder:text-gray-300 font-serif"
                        placeholder="כתוב את ביאורך כאן..."
                        value={draftComment.content}
                        onChange={(e) => setDraftComment({ ...draftComment, content: e.target.value })}
                        autoFocus
                    />
                </div>

                {/* כפתורים למטה */}
                <div className="p-6 border-t border-gray-100 flex gap-4 bg-white">
                    {draftComment.isExisting && (
                        <button onClick={onDeleteComment} className="text-gray-400 hover:text-red-600 p-2" title="מחק הערה">
                            {/* אייקון פח */}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                        </button>
                    )}
                    <div className="flex-1"></div>
                    <button onClick={() => setDraftComment(null)} className="px-5 py-2.5 text-sm text-gray-500 hover:text-gray-800 font-medium">ביטול</button>
                    <button onClick={onSaveComment} className="bg-slate-900 text-white px-8 py-2.5 rounded-lg text-sm font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl">
                        {draftComment.isExisting ? 'שמור שינויים' : 'צור פירוש'}
                    </button>
                </div>
            </div>
        );
    }

    // מצב 2: רשימת הפיד (כשלא בחרו שום דבר)
    return (
        <div className="flex flex-col h-full bg-slate-50">
            <div className="p-4 border-b border-gray-200 bg-white">
                <h3 className="font-bold text-gray-700">פירושים על הסעיף ({feedComments.length})</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {feedComments.length > 0 ? (
                    feedComments.map((comment) => (
                        <div
                            key={comment.annotation_uuid}
                            onClick={() => onLoadExistingComments([comment.annotation_uuid], comment.quote_text)}
                            className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group"
                        >
                            <div className="text-xs font-bold text-blue-600 mb-1 opacity-70 group-hover:opacity-100 font-torah">
                                {comment.quote_text || 'פירוש כללי'}
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
    );
}