import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic'; // <--- הוסף

export async function GET() {
    try {
        // שליפת כל ה"סימנים" שקיימים בספר, מסודרים לפי הסדר
        const [rows] = await pool.query(`
      SELECT title_he, order_index 
      FROM structure_nodes 
      WHERE node_type = 'siman' 
      ORDER BY order_index ASC
    `);

        return NextResponse.json({ items: rows });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}