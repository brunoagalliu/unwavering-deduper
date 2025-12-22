import { put, list, del } from '@vercel/blob';

export async function uploadProcessedFile(
  fileName: string,
  content: string,
  batchId: string
): Promise<string> {
  const blob = await put(`processed/${batchId}/${fileName}`, content, {
    access: 'public',
    addRandomSuffix: false,
  });
  
  return blob.url;
}

export async function uploadProcessedBatch(
  files: { name: string; content: string }[],
  batchId: string
): Promise<{ name: string; url: string; size: number }[]> {
  const uploadedFiles = [];
  
  for (const file of files) {
    const blob = await put(`processed/${batchId}/${file.name}`, file.content, {
      access: 'public',
      addRandomSuffix: false,
    });
    
    // Calculate size from content since blob.size doesn't exist
    const size = new Blob([file.content]).size;
    
    uploadedFiles.push({
      name: file.name,
      url: blob.url,
      size: size,
    });
  }
  
  return uploadedFiles;
}

export async function listBatchFiles(batchId: string) {
  const { blobs } = await list({
    prefix: `processed/${batchId}/`,
  });
  
  return blobs;
}

export async function deleteOldBatches(daysOld: number = 7) {
  const { blobs } = await list({
    prefix: 'processed/',
  });
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  for (const blob of blobs) {
    if (new Date(blob.uploadedAt) < cutoffDate) {
      await del(blob.url);
    }
  }
}