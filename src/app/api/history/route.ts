import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const logs = await query<any[]>(`
      SELECT 
        id, 
        batch_name, 
        source_tag, 
        files_processed, 
        scrubbed_against, 
        original_count, 
        duplicates_removed, 
        final_count, 
        processed_at
      FROM processing_logs
      ORDER BY processed_at DESC
      LIMIT 100
    `);

    // Parse JSON scrubbed_against field
    const parsedLogs = logs.map(log => ({
      ...log,
      scrubbed_against: typeof log.scrubbed_against === 'string' 
        ? JSON.parse(log.scrubbed_against)
        : log.scrubbed_against
    }));

    return NextResponse.json({ logs: parsedLogs });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}