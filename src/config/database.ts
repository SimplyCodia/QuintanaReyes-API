import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const base = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+00:00',
});

// Force every session to UTC so CURRENT_TIMESTAMP === UTC_TIMESTAMP().
const rawPool = base.pool;
rawPool.on('connection', (connection) => {
  connection.query("SET time_zone = '+00:00'");
});

export default base;
