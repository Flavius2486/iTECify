import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '1309',
  database: process.env.DB_NAME || 'itecify',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  namedPlaceholders: false,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0
});

pool.on('connection', () => {
  console.log('✓ New connection to MySQL pool established');
});

pool.on('error', (err) => {
  console.error('✗ MySQL pool error:', err.message);
});

console.log('✓ Connected to MySQL database at', process.env.DB_HOST || 'localhost');

export default pool;
