import Papa from 'papaparse';
import { query } from './db';
import { normalizePhone, isValidUSPhone } from './phone-utils';

interface DedupeResult {
  cleanRows: any[];
  originalCount: number;
  dupesRemoved: number;
}

export async function loadMasterSet(tagNames: string[]): Promise<Set<string>> {
  if (tagNames.length === 0) return new Set();
  
  const placeholders = tagNames.map(() => '?').join(',');
  const sql = `
    SELECT DISTINCT pn.normalized_phone 
    FROM phone_numbers pn
    JOIN phone_master_mapping pmm ON pn.id = pmm.phone_id
    JOIN master_lists ml ON pmm.master_list_id = ml.id
    WHERE ml.tag_name IN (${placeholders})
  `;
  
  const phones = await query<{ normalized_phone: string }[]>(sql, tagNames);
  return new Set(phones.map(p => p.normalized_phone));
}











export function dedupeCSV(
  csvContent: string,
  fileName: string,
  scrubSet: Set<string>,
  batchSeenNumbers: Set<string>,
  phoneColumnName?: string
): DedupeResult {
  const cleanRows: Record<string, unknown>[] = [];
  let originalCount = 0;
  let dupesRemoved = 0;
  
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });
  
  // Auto-detect phone column if not specified
  if (!phoneColumnName && parsed.data.length > 0) {
    const headers = Object.keys(parsed.data[0] as object);
    phoneColumnName = headers.find(h => 
      h.toLowerCase().includes('phone') || 
      h.toLowerCase().includes('number') ||
      h.toLowerCase().includes('mobile') ||
      h.toLowerCase().includes('cell')
    ) || headers[0];
    
    console.log(`Auto-detected phone column: ${phoneColumnName}`);
  }
  
  for (const row of parsed.data as Record<string, unknown>[]) {
    // Skip empty rows
    if (!row || typeof row !== 'object') continue;
    
    originalCount++;
    const phoneValue = row[phoneColumnName!];
    
    if (!phoneValue || String(phoneValue).trim() === '') {
      dupesRemoved++; // Skip rows without phone numbers
      continue;
    }
    
    const normalized = normalizePhone(phoneValue);
    
    // Reject non-US or invalid phone numbers
    if (!isValidUSPhone(normalized)) {
      dupesRemoved++; // Count as removed (invalid/non-US)
      continue;
    }
    
    // Check against scrub list and batch seen numbers
    if (!scrubSet.has(normalized) && !batchSeenNumbers.has(normalized)) {
      batchSeenNumbers.add(normalized);
      // Store normalized phone in output
      row[phoneColumnName!] = normalized;
      cleanRows.push(row);
    } else {
      dupesRemoved++;
    }
  }
  
  return { cleanRows, originalCount, dupesRemoved };
}












  export async function addPhonesToMasters(
    phones: string[],
    tagNames: string[]
  ): Promise<void> {
    if (phones.length === 0) return;
    
    console.log(`📊 Processing ${phones.length.toLocaleString()} phones for ${tagNames.length} masters`);
    const startTime = Date.now();
    
    // Create temporary table with all phones
    console.log('Creating temporary table...');
    await query(`
      CREATE TEMPORARY TABLE temp_phones (
        normalized_phone VARCHAR(20) NOT NULL,
        KEY idx_phone (normalized_phone)
      )
    `);
    
    // Bulk insert into temp table (SUPER FAST)
    console.log('Bulk loading into temp table...');
    const BATCH_SIZE = 20000;
    for (let i = 0; i < phones.length; i += BATCH_SIZE) {
      const batch = phones.slice(i, i + BATCH_SIZE);
      const values = batch.map(p => `('${p.replace(/'/g, "''")}')`).join(',');
      
      await query(`INSERT INTO temp_phones (normalized_phone) VALUES ${values}`);
      
      if (i % 100000 === 0) {
        console.log(`  ${((i / phones.length) * 100).toFixed(1)}% complete`);
      }
    }
    console.log('✅ Temp table loaded');
    
    // Insert only NEW phones in one query (FAST)
    console.log('Inserting new phones...');
    const result = await query<any>(`
      INSERT IGNORE INTO phone_numbers (normalized_phone)
      SELECT DISTINCT tp.normalized_phone
      FROM temp_phones tp
      LEFT JOIN phone_numbers pn ON tp.normalized_phone = pn.normalized_phone
      WHERE pn.id IS NULL
    `);
    console.log(`✅ Inserted ${result.affectedRows || 0} new phones`);
    
    // Get master IDs
    const masterIds = await query<{ id: number; tag_name: string }[]>(
      `SELECT id, tag_name FROM master_lists WHERE tag_name IN (${tagNames.map(() => '?').join(',')})`,
      tagNames
    );
    
    // Create mappings in bulk (SUPER FAST)
    console.log('Creating mappings...');
    for (const master of masterIds) {
      console.log(`  Processing ${master.tag_name}...`);
      
      await query(`
        INSERT IGNORE INTO phone_master_mapping (phone_id, master_list_id)
        SELECT pn.id, ?
        FROM phone_numbers pn
        INNER JOIN temp_phones tp ON pn.normalized_phone = tp.normalized_phone
      `, [master.id]);
    }
    console.log('✅ Mappings created');
    
    // Update counts
    console.log('Updating counts...');
    for (const master of masterIds) {
      await query(`
        UPDATE master_lists 
        SET phone_count = (
          SELECT COUNT(*) 
          FROM phone_master_mapping 
          WHERE master_list_id = ?
        )
        WHERE id = ?
      `, [master.id, master.id]);
    }
    
    // Cleanup
    await query('DROP TEMPORARY TABLE temp_phones');
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Complete! ${phones.length.toLocaleString()} phones in ${duration}s (${(phones.length / parseFloat(duration)).toFixed(0)} phones/sec)`);
  }











export async function getOrCreateMasterList(tagName: string): Promise<number> {
    const existing = await query<{ id: number }[]>(
      'SELECT id FROM master_lists WHERE tag_name = ?',
      [tagName]
    );
    
    if (existing.length > 0) {
      return existing[0].id;
    }
    
    try {
      const result = await query<any>(
        'INSERT INTO master_lists (tag_name, phone_count) VALUES (?, 0)',
        [tagName]
      );
      
      return result.insertId;
    } catch (error: any) {
      // If duplicate error, fetch the existing record
      if (error.code === 'ER_DUP_ENTRY') {
        const existing = await query<{ id: number }[]>(
          'SELECT id FROM master_lists WHERE tag_name = ?',
          [tagName]
        );
        return existing[0].id;
      }
      throw error;
    }
  }