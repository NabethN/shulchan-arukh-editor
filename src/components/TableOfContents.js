'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function TableOfContents() {
    const params = useParams();
    const currentSiman = parseInt(params.index) || 1;

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTOC() {
            try {
                const res = await fetch('/api/toc');
                const json = await res.json();
                if (json.items) setItems(json.items);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchTOC();
    }, []);

    if (loading) return <div className="p-4 text-xs text-gray-400">טוען תוכן עניינים...</div>;

    return (
        <nav className="h-full overflow-y-auto bg-white border-l border-gray-200 w-64 flex-shrink-0 flex flex-col">
            <div className="p-4 border-b border-gray-100 font-bold text-gray-700 bg-gray-50">
                תוכן העניינים
            </div>
            <div className="flex-1 py-2">
                {items.map((item) => {
                    const isActive = item.order_index === currentSiman;
                    return (
                        <Link
                            key={item.order_index}
                            href={`/siman/${item.order_index}`}
                            className={`
                block px-4 py-2 text-sm transition-colors border-r-2
                ${isActive
                                    ? 'bg-blue-50 text-blue-700 font-bold border-blue-500'
                                    : 'text-gray-600 hover:bg-gray-50 border-transparent hover:border-gray-300'
                                }
              `}
                        >
                            {item.title_he}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}