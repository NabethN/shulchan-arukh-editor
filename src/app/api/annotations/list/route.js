import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const versionId = searchParams.get('versionId');

    try {
        const query = `
            SELECT DISTINCT
                sm.comment_uuid as uuid,
                sm.content,
                s.content as quote,
                s.position_in_group,       -- חובה עבור ORDER BY עם DISTINCT
                sm.position_in_segment    -- חובה עבור ORDER BY עם DISTINCT
            FROM seif_versions v
            JOIN segment_groups sg ON sg.id = v.last_segment_group_id
            JOIN segments s ON s.segment_group_id = sg.id
            JOIN segment_markers sm ON sm.segment_id = s.id
            WHERE v.id = ? AND sm.type = 'comment'
            ORDER BY s.position_in_group ASC, sm.position_in_segment ASC
        `;

        const [rows] = await db.query(query, [versionId]);
        return NextResponse.json({ list: rows });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}