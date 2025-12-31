import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { seif_id, content_json, version_id } = await req.json();

        // 1. חילוץ טקסט נקי לבדיקה אם נוסח המקור השתנה
        let fullContentText = "";
        const segmentsData = [];
        let segPos = 1;
        function traverseNodes(node) {
            if (node.type === 'text') {
                fullContentText += node.text;
                segmentsData.push({ text: node.text, marks: node.marks || [], position: segPos++ });
            } else if (node.content && Array.isArray(node.content)) {
                node.content.forEach(traverseNodes);
            }
        }
        traverseNodes(content_json);

        // 2. החלטה: האם ליצור גרסה חדשה (שינוי טקסט) או לעדכן קיימת (רק פירוש)?
        let finalVersionId = version_id;
        const [existingVersion] = await connection.query(
            'SELECT content FROM seif_versions WHERE id = ?', [version_id]
        );

        // אם הטקסט השתנה או שאין גרסה קודמת - יוצרים שורה חדשה ב-seif_versions
        if (!existingVersion[0] || existingVersion[0].content !== fullContentText) {
            const [newVerResult] = await connection.query(
                'INSERT INTO seif_versions (seif_id, content) VALUES (?, ?)',
                [seif_id, fullContentText]
            );
            finalVersionId = newVerResult.insertId;
        }

        // 3. תמיד יוצרים Segment Group חדש (Snapshot של המצב הנוכחי)
        const [groupRes] = await connection.query(
            'INSERT INTO segment_groups (seif_version_id) VALUES (?)',
            [finalVersionId]
        );
        const newGroupId = groupRes.insertId;

        // 4. עדכון המצביע בגרסה (החדשה או הקיימת) לקבוצה החדשה
        await connection.query(
            'UPDATE seif_versions SET last_segment_group_id = ? WHERE id = ?',
            [newGroupId, finalVersionId]
        );

        // 5. שמירת הסגמנטים והמרקרים
        for (const seg of segmentsData) {
            const [segRes] = await connection.query(
                'INSERT INTO segments (segment_group_id, type, content, position_in_group) VALUES (?, ?, ?, ?)',
                [newGroupId, 'text', seg.text, seg.position]
            );
            const newSegmentId = segRes.insertId;

            if (seg.marks?.length > 0) {
                let mPos = 1;
                const markerValues = seg.marks.map(m => [
                    newSegmentId,
                    m.type,
                    m.type === 'comment' ? m.attrs.id : null,
                    m.type === 'comment' ? m.attrs.content : JSON.stringify(m.attrs),
                    mPos++
                ]);
                await connection.query(
                    'INSERT INTO segment_markers (segment_id, type, comment_uuid, content, position_in_segment) VALUES ?',
                    [markerValues]
                );
            }
        }

        await connection.commit();
        return NextResponse.json({ success: true, versionId: finalVersionId });
    } catch (error) {
        await connection.rollback();
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        connection.release();
    }
}