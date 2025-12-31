import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const simanId = searchParams.get('i');

    try {
        const query = `
            SELECT 
                sim.title as siman_title,
                s.id as seif_id,
                s.index_label,
                v.id as version_id,
                v.content as full_seif_text,
                seg.id as segment_id,
                seg.content as text_content,
                m.type as marker_type,
                m.comment_uuid,
                m.content as marker_content
            FROM simanim sim
            JOIN seifim s ON s.siman_id = sim.id
            JOIN seif_versions v ON v.seif_id = s.id 
                 -- שליפת הגרסה האחרונה של הסעיף
                 AND v.id = (SELECT id FROM seif_versions WHERE seif_id = s.id ORDER BY id DESC LIMIT 1)
            -- הקישור לקבוצה הפעילה דרך השדה המעודכן בגרסה
            JOIN segment_groups sg ON sg.id = v.last_segment_group_id
            JOIN segments seg ON seg.segment_group_id = sg.id
            LEFT JOIN segment_markers m ON m.segment_id = seg.id
            WHERE sim.id = ? 
            ORDER BY s.id ASC, seg.position_in_group ASC, m.position_in_segment ASC
        `;

        const [rows] = await db.query(query, [simanId]);
        if (rows.length === 0) return NextResponse.json({ data: [], simanTitle: "" });

        const seifimMap = new Map();
        rows.forEach(row => {
            if (!seifimMap.has(row.seif_id)) {
                seifimMap.set(row.seif_id, {
                    seif_id: row.seif_id,
                    index_label: row.index_label,
                    version_id: row.version_id,
                    segmentsMap: new Map()
                });
            }
            const currentSeif = seifimMap.get(row.seif_id);

            if (!currentSeif.segmentsMap.has(row.segment_id)) {
                currentSeif.segmentsMap.set(row.segment_id, {
                    type: 'text',
                    text: row.text_content,
                    marks: []
                });
            }
            const currentSegment = currentSeif.segmentsMap.get(row.segment_id);

            if (row.marker_type) {
                let attrs = {};
                if (row.marker_type === 'comment') {
                    attrs = { id: row.comment_uuid, content: row.marker_content };
                } else if (row.marker_type === 'textStyle') {
                    try {
                        attrs = typeof row.marker_content === 'string' ? JSON.parse(row.marker_content) : row.marker_content;
                    } catch (e) { attrs = {}; }
                }
                currentSegment.marks.push({ type: row.marker_type, attrs });
            }
        });

        const result = Array.from(seifimMap.values()).map(seif => ({
            seif_id: seif.seif_id,
            version_id: seif.version_id,
            index_label: seif.index_label,
            content_json: {
                type: 'doc',
                content: [{ type: 'paragraph', content: Array.from(seif.segmentsMap.values()) }]
            }
        }));

        return NextResponse.json({ simanTitle: rows[0].siman_title, data: result });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}