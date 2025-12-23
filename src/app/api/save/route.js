import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request) {
    try {
        const body = await request.json();
        const { version_id, content_json, annotation, updatedQuotes } = body;
        // updatedQuotes: מערך של { uuid, text } שמגיע מהלקוח כשיש עריכת טקסט

        // 1. עדכון ה-JSON של הסעיף (הסימונים הצהובים / הטקסט החדש)
        await pool.query(
            `UPDATE segment_versions SET content_json = ? WHERE id = ?`,
            [JSON.stringify(content_json), version_id]
        );

        // 2. שמירת פירוש חדש (אם נשלח)
        if (annotation) {
            await pool.query(
                `INSERT INTO annotations (annotation_uuid, segment_version_id, content, quote_text) VALUES (?, ?, ?, ?)`,
                [annotation.uuid, version_id, annotation.text, annotation.quote]
            );
        }

        // 3. עדכון המוני של ציטוטים (הפתרון לבעיה השניה שלך!)
        // אם ערכנו את הטקסט, הלקוח שולח לנו את כל הציטוטים החדשים
        if (updatedQuotes && Array.isArray(updatedQuotes) && updatedQuotes.length > 0) {
            for (const quote of updatedQuotes) {
                await pool.query(
                    `UPDATE annotations SET quote_text = ? WHERE annotation_uuid = ?`,
                    [quote.text, quote.uuid]
                );
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Save error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}