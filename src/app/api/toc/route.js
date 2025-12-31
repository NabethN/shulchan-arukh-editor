import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
    try {
        // עדכון: שימוש בטבלת simanim החדשה
        const [rows] = await db.query(
            `SELECT id, title, order_index 
             FROM simanim 
             ORDER BY order_index ASC`
        );

        const tocItems = rows.map(row => ({
            id: row.id,     // זה ה-Siman ID
            title: row.title,
            index: row.order_index
        }));

        return NextResponse.json(tocItems);

    } catch (error) {
        console.error('Error fetching TOC:', error);
        return NextResponse.json({ error: 'Failed to fetch TOC' }, { status: 500 });
    }
}