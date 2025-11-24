import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const masters = await query<any[]>(`
      SELECT id, tag_name, phone_count, created_at, updated_at
      FROM master_lists
      ORDER BY 
        CASE WHEN tag_name = 'GLOBAL' THEN 0 ELSE 1 END,
        tag_name ASC
    `);

    return NextResponse.json({ 
      masters,
      timestamp: Date.now()
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error('Error fetching masters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch master lists', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tagName } = body;

    if (!tagName || typeof tagName !== 'string') {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }

    const cleanTagName = tagName.trim().toUpperCase();

    if (cleanTagName === 'GLOBAL') {
      return NextResponse.json(
        { error: 'Cannot create GLOBAL tag (reserved)' },
        { status: 400 }
      );
    }

    if (cleanTagName.length === 0 || cleanTagName.length > 100) {
      return NextResponse.json(
        { error: 'Tag name must be between 1 and 100 characters' },
        { status: 400 }
      );
    }

    // Check if already exists
    const existing = await query<any[]>(
      'SELECT id FROM master_lists WHERE tag_name = ?',
      [cleanTagName]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `Master list "${cleanTagName}" already exists` },
        { status: 400 }
      );
    }

    // Create new master list
    const result = await query<any>(
      'INSERT INTO master_lists (tag_name, phone_count) VALUES (?, 0)',
      [cleanTagName]
    );

    return NextResponse.json({
      success: true,
      master: {
        id: result.insertId,
        tag_name: cleanTagName,
        phone_count: 0
      }
    });

  } catch (error) {
    console.error('Error creating master list:', error);
    return NextResponse.json(
      { error: 'Failed to create master list', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}