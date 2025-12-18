import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// קריאת פירוש (GET)
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const uuid = searchParams.get('id');

        if (!uuid) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        const [rows] = await pool.query(
            `SELECT content FROM annotations WHERE annotation_uuid = ?`,
            [uuid]
        );

        if (rows.length === 0) return NextResponse.json({ content: '' });

        return NextResponse.json({ content: rows[0].content });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// מחיקת פירוש (DELETE)
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const uuid = searchParams.get('id');

        if (!uuid) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        // מחיקה מה-DB
        await pool.query(`DELETE FROM annotations WHERE annotation_uuid = ?`, [uuid]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// עדכון פירוש קיים (PUT)
export async function PUT(request) {
    try {
        const body = await request.json();
        const { uuid, content } = body;

        if (!uuid || content === undefined) {
            return NextResponse.json({ error: 'Missing Data' }, { status: 400 });
        }

        await pool.query(
            `UPDATE annotations SET content = ? WHERE annotation_uuid = ?`,
            [content, uuid]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}