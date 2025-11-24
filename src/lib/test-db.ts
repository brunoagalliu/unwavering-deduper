import { query } from './db';

export async function testConnection() {
  try {
    const result = await query('SELECT 1 as test');
    console.log('✅ Database connected successfully:', result);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}