import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request) {
    try {
        // 1. חילוץ המספר מתוך הכתובת (URL)
        // אם לא נשלח מספר, נשתמש ב-1 כברירת מחדל
        const { searchParams } = new URL(request.url);
        const simanIndex = searchParams.get('i') || 1;

        // 2. השאילתה המעודכנת
        // שים לב: שינינו את הסינון ל-order_index (מספר הסימן) במקום title_he
        // זה הרבה יותר יציב ואמין
        const [rows] = await pool.query(`
      SELECT 
        s.index_label, 
        sv.id as version_id,  /* <--- הוספנו את זה! חשוב מאוד לשמירה */
        sv.content_json
      FROM structure_nodes sn
      JOIN segments s ON s.structure_node_id = sn.id
      JOIN segment_versions sv ON sv.segment_id = s.id
      WHERE sn.order_index = ? 
      AND sn.node_type = 'siman'
      AND sv.is_base_text = 1
      ORDER BY s.id ASC
    `, [simanIndex]);

        return NextResponse.json({
            data: rows,
            currentSiman: simanIndex
        });

    } catch (error) {
        console.error('Database Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}