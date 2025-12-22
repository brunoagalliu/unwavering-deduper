import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { dedupeCSV, loadMasterSet, addPhonesToMasters, getOrCreateMasterList } from '@/lib/dedupe-engine';
import { uploadProcessedBatch } from '@/lib/blob-storage';
import Papa from 'papaparse';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

interface ProcessFileRequest {
  fileName: string;
  csvContent: string;
  tag: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { files, selectedMasters } = body as {
      files: ProcessFileRequest[];
      selectedMasters: string[];
    };

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    console.log(`Starting to process ${files.length} files`);

    // Generate batch ID
    const batchId = `batch_${Date.now()}`;

    // Load master sets for deduplication
    console.log('Loading master sets...');
    const scrubSet = await loadMasterSet(selectedMasters);
    console.log(`Loaded ${scrubSet.size} phone numbers from ${selectedMasters.length} master lists`);

    // Track all new numbers across entire batch
    const batchNewNumbers = new Set<string>();

    // Get unique tags from files
    const uniqueTags = [...new Set(files.map(f => f.tag))];

    // Process files in parallel batches
    const PARALLEL_LIMIT = 3;
    const processedFiles = [];

    console.log(`Processing files in batches of ${PARALLEL_LIMIT}...`);

    for (let i = 0; i < files.length; i += PARALLEL_LIMIT) {
      const batch = files.slice(i, i + PARALLEL_LIMIT);
      console.log(`Processing batch ${Math.ceil((i + 1) / PARALLEL_LIMIT)} of ${Math.ceil(files.length / PARALLEL_LIMIT)}`);

      const batchResults = await Promise.all(
        batch.map(async (file) => {
          try {
            console.log(`  Processing ${file.fileName}...`);
            
            const result = dedupeCSV(
              file.csvContent,
              file.fileName,
              scrubSet,
              batchNewNumbers
            );

            // Convert cleaned rows back to CSV
            const cleanCSV = Papa.unparse(result.cleanRows, {
              header: true
            });

            console.log(`  ✓ ${file.fileName}: ${result.originalCount} → ${result.cleanRows.length} (${result.dupesRemoved} dupes removed)`);

            return {
              name: file.fileName,
              originalCount: result.originalCount,
              finalCount: result.cleanRows.length,
              dupesRemoved: result.dupesRemoved,
              cleanCSV: cleanCSV,
              status: 'complete' as const
            };

          } catch (error) {
            console.error(`Error processing file ${file.fileName}:`, error);
            return {
              name: file.fileName,
              originalCount: 0,
              finalCount: 0,
              dupesRemoved: 0,
              cleanCSV: '',
              status: 'error' as const
            };
          }
        })
      );

      processedFiles.push(...batchResults);
    }

    console.log(`All files processed. Total new unique numbers: ${batchNewNumbers.size}`);

    // Upload processed files to Vercel Blob
    console.log('Uploading files to blob storage...');
    const filesToUpload = processedFiles
      .filter(f => f.status === 'complete' && f.cleanCSV)
      .map(f => ({
        name: `clean_${f.name}`,
        content: f.cleanCSV
      }));

    const uploadedBlobs = await uploadProcessedBatch(filesToUpload, batchId);
    console.log(`Uploaded ${uploadedBlobs.length} files to blob storage`);

    // Add blob URLs to processed files
    const processedFilesWithUrls = processedFiles.map(file => {
      const blob = uploadedBlobs.find(b => b.name === `clean_${file.name}`);
      return {
        ...file,
        blobUrl: blob?.url || null,
        cleanCSV: undefined, // Remove CSV content to reduce response size
      };
    });

    // Add new numbers to master lists
    console.log(`Adding ${batchNewNumbers.size} new numbers to master lists...`);
    
    for (const tag of uniqueTags) {
      await getOrCreateMasterList(tag);
    }

    const mastersToUpdate = ['GLOBAL', ...uniqueTags];
    const uniquePhones = Array.from(batchNewNumbers);
    
    await addPhonesToMasters(uniquePhones, mastersToUpdate);

    // Log processing
    const totalOriginal = processedFiles.reduce((sum, f) => sum + f.originalCount, 0);
    const totalDupes = processedFiles.reduce((sum, f) => sum + f.dupesRemoved, 0);
    const totalFinal = processedFiles.reduce((sum, f) => sum + f.finalCount, 0);

    console.log('Logging processing job...');
    await query(`
      INSERT INTO processing_logs 
      (batch_name, source_tag, files_processed, scrubbed_against, original_count, duplicates_removed, final_count, blob_urls)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      batchId,
      uniqueTags.join(','),
      files.length,
      JSON.stringify(selectedMasters),
      totalOriginal,
      totalDupes,
      totalFinal,
      JSON.stringify(uploadedBlobs)
    ]);

    console.log('Processing complete!');

    return NextResponse.json({
      success: true,
      batchId,
      processedFiles: processedFilesWithUrls,
      blobUrls: uploadedBlobs,
      summary: {
        totalOriginal,
        totalDupes,
        totalFinal,
        newNumbersAdded: batchNewNumbers.size,
        mastersUpdated: mastersToUpdate
      }
    });

  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json(
      { 
        error: 'Processing failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}