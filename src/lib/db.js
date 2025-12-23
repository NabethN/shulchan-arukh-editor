import mysql from 'mysql2/promise';
const isDevelopment = process.env.NODE_ENV === 'development';

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // התיקון הקריטי:
    // ב-TiDB (ענן) חובה SSL.
    // בלוקאלי - לפעמים זה מפריע, אז אנחנו מאפשרים חיבור גם אם התעודה לא מושלמת
    ssl: {
        rejectUnauthorized: !isDevelopment // בלוקאלי (False) זה יעבוד גם בלי תעודות קפדניות
    }
});

export default pool;

// // lib/db.js
// import mysql from 'mysql2/promise';

// const pool = mysql.createPool({
//     host: 'localhost',
//     user: 'root',
//     password: 'Secret123!',
//     database: 'sefaria_project',
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0
// });

// export default pool;