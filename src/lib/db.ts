import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function getDbPool() {
    if (!pool) {
      pool = mysql.createPool({
        host: process.env.DATABASE_HOST,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
        port: parseInt(process.env.DATABASE_PORT || '3306'),
        waitForConnections: true,
        connectionLimit: 20,           // Increased from 10
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        connectTimeout: 60000,
      });
    }
    return pool;
  }

export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  const pool = getDbPool();
  const [rows] = await pool.execute(sql, params);
  return rows as T;
}