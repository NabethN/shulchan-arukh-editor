import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id'); // UUID

    try {
        // שולפים מ-segment_markers
        const [rows] = await db.query(
            `SELECT content FROM segment_markers WHERE comment_uuid = ? LIMIT 1`,
            [id]
        );
        return NextResponse.json(rows[0] || {});
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const { id, content } = await req.json();

        // מעדכנים את כל המרקרים עם ה-UUID הזה
        await db.query(
            'UPDATE segment_markers SET content = ? WHERE comment_uuid = ?',
            [content, id]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}