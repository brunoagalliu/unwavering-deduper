import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
        processed_at,
        blob_urls
      FROM processing_logs
      ORDER BY processed_at DESC
      LIMIT 100
    `);

    // Parse JSON fields
    const parsedLogs = logs.map(log => ({
      ...log,
      scrubbed_against: typeof log.scrubbed_against === 'string' 
        ? JSON.parse(log.scrubbed_against)
        : log.scrubbed_against,
      blob_urls: typeof log.blob_urls === 'string'
        ? JSON.parse(log.blob_urls)
        : log.blob_urls
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