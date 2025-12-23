import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// --- פונקציית עזר לניקוי הסימון מתוך ה-JSON של Tiptap ---
// הפונקציה רצה בצורה רקורסיבית על כל העץ ומוחקת את ה-Mark הרלוונטי
function removeHighlightFromJson(node, markId) {
    if (!node) return;

    // 1. אם יש ל-node הזה marks (עיצובים), נחפש אם אחד מהם הוא ההערה שלנו
    if (node.marks) {
        // משאירים רק את מה שלא ההערה שאנחנו מוחקים
        node.marks = node.marks.filter(mark => {
            const isTargetComment = mark.type === 'comment' && mark.attrs?.id === markId;
            return !isTargetComment; // אם זה ההערה - תחזיר false (תעיף אותה)
        });
    }

    // 2. אם יש ל-node ילדים (content), נצלול פנימה (רקורסיה)
    if (node.content && Array.isArray(node.content)) {
        node.content.forEach(child => removeHighlightFromJson(child, markId));
    }

    return node;
}


export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const uuid = searchParams.get('id');
        if (!uuid) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        const [rows] = await pool.query(`SELECT content FROM annotations WHERE annotation_uuid = ?`, [uuid]);
        if (rows.length === 0) return NextResponse.json({ content: '' });

        return NextResponse.json({ content: rows[0].content });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const { uuid, content } = body;
        await pool.query(`UPDATE annotations SET content = ? WHERE annotation_uuid = ?`, [content, uuid]);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// --- ה-DELETE המשודרג ---
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const uuid = searchParams.get('id');

        // אנחנו צריכים את versionId כדי לדעת איזה סעיף לעדכן
        // בלקוח אנחנו מעבירים את זה כפרמטר, אבל ליתר ביטחון נשלוף אותו מה-DB אם חסר
        let versionId = searchParams.get('versionId');

        if (!uuid) return NextResponse.json({ error: 'Missing Data' }, { status: 400 });

        // 1. אם אין versionId בבקשה, נשלוף אותו לפי ה-uuid של ההערה
        if (!versionId || versionId === '0' || versionId === 'undefined') {
            const [annoRows] = await pool.query(`SELECT segment_version_id FROM annotations WHERE annotation_uuid = ?`, [uuid]);
            if (annoRows.length > 0) {
                versionId = annoRows[0].segment_version_id;
            }
        }

        // 2. מחיקת השורה מטבלת הפירושים (החלק הקל)
        await pool.query(`DELETE FROM annotations WHERE annotation_uuid = ?`, [uuid]);

        // 3. ניקוי ה"צהוב" מה-JSON (החלק החשוב)
        if (versionId) {
            // א. שליפת ה-JSON הנוכחי
            const [segRows] = await pool.query(`SELECT content_json FROM segment_versions WHERE id = ?`, [versionId]);

            if (segRows.length > 0) {
                let contentJson = segRows[0].content_json;

                // וודא שזה אובייקט ולא מחרוזת
                if (typeof contentJson === 'string') {
                    contentJson = JSON.parse(contentJson);
                }

                // ב. ביצוע הניקוי
                const cleanJson = removeHighlightFromJson(contentJson, uuid);

                // ג. שמירה חזרה ל-DB
                await pool.query(
                    `UPDATE segment_versions SET content_json = ? WHERE id = ?`,
                    [JSON.stringify(cleanJson), versionId]
                );
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}