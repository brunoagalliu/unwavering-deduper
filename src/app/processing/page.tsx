'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { extractZipFiles, readCSVFile, createZipFromFiles, downloadFile } from '@/lib/file-handler';
import { getStoredFiles } from '@/lib/file-store';

interface FileInfo {
  name: string;
  size: number;
  tag: string;
}

interface ProcessedFile {
  name: string;
  originalCount: number;
  finalCount: number;
  dupesRemoved: number;
  cleanCSV?: string;
  blobUrl?: string | null;
  status: 'processing' | 'complete' | 'error';
}

export default function ProcessingPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [selectedMasters, setSelectedMasters] = useState<string[]>([]);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const filesData = sessionStorage.getItem('uploadedFiles');
    const mastersData = sessionStorage.getItem('selectedMasters');
    const actualFiles = sessionStorage.getItem('actualFileObjects');

    if (!filesData || !mastersData) {
      router.push('/');
      return;
    }

    setFiles(JSON.parse(filesData));
    setSelectedMasters(JSON.parse(mastersData));

    // Start processing automatically
    startProcessing();
  }, [router]);

  const startProcessing = async () => {
    setIsProcessing(true);
    setProgress(0);
    
    try {
      // Get file inputs from previous page (stored in IndexedDB or re-upload)
      // For this implementation, we'll use the file input element
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.multiple = true;
      fileInput.accept = '.csv,.zip';
      
      // In production, you'd have stored files in IndexedDB or temporary storage
      // For now, we'll prompt user to re-select files
      
      const filesData = sessionStorage.getItem('uploadedFiles');
      const tagAssignments = sessionStorage.getItem('tagAssignments');
      
      if (!filesData || !tagAssignments) {
        throw new Error('Missing file data');
      }

      const fileInfos: FileInfo[] = JSON.parse(filesData);
      const tags: Record<string, string> = JSON.parse(tagAssignments);

      // Get actual files from a global store (you'll need to implement this)
      const actualFiles = await getActualFiles();
      
      // Prepare files for processing
      const filesToProcess = await prepareFilesForProcessing(actualFiles, tags);

      setProgress(10);

      // Send to API for processing
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: filesToProcess,
          selectedMasters
        })
      });

      setProgress(90);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Processing failed');
      }

      const result = await response.json();
      setProcessedFiles(result.processedFiles);
      setProgress(100);
      setIsComplete(true);
      
    } catch (err) {
      console.error('Processing error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const getActualFiles = async (): Promise<File[]> => {
    try {
      const files = await getStoredFiles();
      return files;
    } catch (error) {
      console.error('Error retrieving files:', error);
      throw new Error('Failed to retrieve stored files');
    }
  };

  const prepareFilesForProcessing = async (
    files: File[], 
    tags: Record<string, string>
  ) => {
    const prepared = [];

    for (const file of files) {
      const tag = tags[file.name];

      if (file.name.toLowerCase().endsWith('.zip')) {
        // Extract ZIP files
        const extractedFiles = await extractZipFiles(file);
        for (const extracted of extractedFiles) {
          prepared.push({
            fileName: extracted.name,
            csvContent: extracted.content,
            tag: tag
          });
        }
      } else if (file.name.toLowerCase().endsWith('.csv')) {
        // Read CSV file
        const content = await readCSVFile(file);
        prepared.push({
          fileName: file.name,
          csvContent: content,
          tag: tag
        });
      }
    }

    return prepared;
  };

  const handleDownloadFile = (file: ProcessedFile) => {
    if (file.blobUrl) {
      // Download from blob storage
      window.open(file.blobUrl, '_blank');
    } else {
      // Fallback to old method (if blob URL doesn't exist)
      const blob = new Blob([file.cleanCSV || ''], { type: 'text/csv' });
      downloadFile(blob, `clean_${file.name}`);
    }
  };

  const handleDownloadAll = async () => {
    // Filter out files that don't have cleanCSV content
    const filesForZip = processedFiles
      .filter((f): f is ProcessedFile & { cleanCSV: string } => 
        f.status === 'complete' && typeof f.cleanCSV === 'string' && f.cleanCSV.length > 0
      )
      .map(f => ({
        name: `clean_${f.name}`,
        content: f.cleanCSV
      }));
  
    if (filesForZip.length === 0) {
      alert('No files available to download');
      return;
    }
  
    const zipBlob = await createZipFromFiles(filesForZip);
    downloadFile(zipBlob, `deduped_batch_${Date.now()}.zip`);
  };

  const totalOriginal = processedFiles.reduce((sum, f) => sum + f.originalCount, 0);
  const totalFinal = processedFiles.reduce((sum, f) => sum + f.finalCount, 0);
  const totalDupes = processedFiles.reduce((sum, f) => sum + f.dupesRemoved, 0);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">Processing Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-900 mb-2">
            {isComplete ? 'Processing Complete! ✨' : 'Processing Files...'}
          </h1>
          <p className="text-gray-600">
            {isComplete ? 'Your files are ready for download' : 'Please wait while we dedupe your files'}
          </p>
        </div>

        {/* Progress Bar */}
        {isProcessing && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="mb-2 flex justify-between text-sm text-gray-600">
              <span>Processing...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div 
                className="bg-purple-600 h-4 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Summary */}
        {isComplete && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Summary</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-gray-700">
                  {totalOriginal.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 mt-1">Original Rows</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-3xl font-bold text-red-600">
                  {totalDupes.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 mt-1">Duplicates Removed</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">
                  {totalFinal.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 mt-1">Clean Rows</p>
              </div>
            </div>
          </div>
        )}

        {/* File List */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Individual Files
            </h2>
            {isComplete && processedFiles.length > 1 && (
              <button
                onClick={handleDownloadAll}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                📦 Download All as ZIP
              </button>
            )}
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {processedFiles.length === 0 && isProcessing && (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-spin text-4xl mb-2">⚙️</div>
                <p>Preparing files for processing...</p>
              </div>
            )}

            {processedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors"
              >
                <div className="flex-shrink-0">
                  {file.status === 'complete' ? (
                    <span className="text-3xl">✅</span>
                  ) : file.status === 'processing' ? (
                    <span className="text-3xl animate-spin">⚙️</span>
                  ) : (
                    <span className="text-3xl">❌</span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-sm text-gray-600">
                    {file.originalCount.toLocaleString()} → {file.finalCount.toLocaleString()} 
                    <span className="text-red-600 ml-2 font-medium">
                      (-{file.dupesRemoved.toLocaleString()})
                    </span>
                  </p>
                  {file.dupesRemoved > 0 && (
                    <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-green-500 h-1.5 rounded-full"
                        style={{ 
                          width: `${(file.finalCount / file.originalCount * 100).toFixed(1)}%` 
                        }}
                      />
                    </div>
                  )}
                </div>

                {file.status === 'complete' && (
                  <button
                    onClick={() => handleDownloadFile(file)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    Download
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        {isComplete && (
          <div className="flex justify-between gap-4">
            <button
              onClick={() => router.push('/history')}
              className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
            >
              View History
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors shadow-md"
            >
              Process More Files →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}