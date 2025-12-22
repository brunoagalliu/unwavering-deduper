import { NextResponse } from 'next/server';
import { deleteOldBatches } from '@/lib/blob-storage';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await deleteOldBatches(7); // Delete files older than 7 days
    return NextResponse.json({ success: true, message: 'Cleanup complete' });
  } catch (error) {
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}