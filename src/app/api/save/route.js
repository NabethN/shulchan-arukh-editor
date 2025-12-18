import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request) {
    try {
        const body = await request.json();
        const { version_id, content_json, annotation } = body;

        // 1. עדכון ה-JSON של הסעיף (הסימונים הצהובים)
        await pool.query(
            `UPDATE segment_versions SET content_json = ? WHERE id = ?`,
            [JSON.stringify(content_json), version_id]
        );

        // 2. שמירת הפירוש + הציטוט (השינוי כאן!)
        if (annotation) {
            await pool.query(
                `INSERT INTO annotations (annotation_uuid, segment_version_id, content, quote_text) VALUES (?, ?, ?, ?)`,
                [annotation.uuid, version_id, annotation.text, annotation.quote] // הוספנו את quote
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Save error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}