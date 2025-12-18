// lib/db.js
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Secret123!',
    database: 'sefaria_project',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export default pool;