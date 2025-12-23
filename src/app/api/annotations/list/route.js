import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const versionId = searchParams.get('versionId');

        if (!versionId) return NextResponse.json({ list: [] });

        // שליפת כל ההערות ששייכות לגרסה הזו של הסעיף
        const [rows] = await pool.query(`
      SELECT annotation_uuid, content, quote_text, created_at 
      FROM annotations 
      WHERE segment_version_id = ? 
      ORDER BY id ASC
    `, [versionId]);

        return NextResponse.json({ list: rows });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}