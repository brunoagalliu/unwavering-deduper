'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { storeFiles } from '@/lib/file-store';

export default function HomePage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [tagAssignments, setTagAssignments] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(file => {
      return file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.zip');
    });
    handleFilesSelected(droppedFiles);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFilesSelected(selectedFiles);
    }
  };

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    
    const newTags: Record<string, string> = {};
    selectedFiles.forEach(file => {
      const baseName = file.name.split('.')[0];
      const potentialTag = baseName.split('_')[0].toUpperCase();
      newTags[file.name] = potentialTag;
    });
    setTagAssignments(newTags);
  };

  const handleTagChange = (fileName: string, tag: string) => {
    setTagAssignments(prev => ({
      ...prev,
      [fileName]: tag.trim().toUpperCase()
    }));
  };

  const handleContinue = async () => {
    const missingTags = files.filter(f => !tagAssignments[f.name]?.trim());
    if (missingTags.length > 0) {
      alert('Please assign tags to all files');
      return;
    }

    try {
      setIsProcessing(true);
      await storeFiles(files);
      
      sessionStorage.setItem('uploadedFiles', JSON.stringify(
        files.map(f => ({
          name: f.name,
          size: f.size,
          tag: tagAssignments[f.name]
        }))
      ));
      sessionStorage.setItem('tagAssignments', JSON.stringify(tagAssignments));

      router.push('/dedupe');
    } catch (error) {
      console.error('Error storing files:', error);
      alert('Failed to store files. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-blue-800">
      <div className="max-w-3xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-12 pt-8">
          <h1 className="text-5xl font-bold text-white mb-3">
            Unwavering Deduper
          </h1>
          <p className="text-purple-200 text-lg">
            Upload your zip file here containing a csv file or multiple files
          </p>
        </div>

        {/* Upload Box */}
        {files.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-2xl p-12">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-3 border-dashed rounded-xl p-16 text-center transition-all cursor-pointer ${
                isDragging 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'border-gray-300 bg-gray-50 hover:border-purple-400'
              }`}
            >
              <input
                type="file"
                id="file-input"
                multiple
                accept=".csv,.zip"
                onChange={handleFileInput}
                className="hidden"
              />
              
              <label htmlFor="file-input" className="cursor-pointer block">
                <div className="mb-6">
                  <svg className="mx-auto h-24 w-24 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-2xl font-semibold text-gray-700 mb-3">
                  Drag/Drop files here
                </p>
                <p className="text-gray-500 mb-6">
                  or click to browse
                </p>
                <span className="inline-block px-8 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors">
                  Browse Files
                </span>
              </label>
            </div>
          </div>
        ) : (
          /* File List */
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Source Files
              </h2>
              <button
                onClick={() => setFiles([])}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear all
              </button>
            </div>

            <div className="space-y-3 mb-6">
              {files.map((file, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">
                      {file.name.endsWith('.zip') ? '📦' : '📄'}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>

                  <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200">
                    <label className="text-sm font-medium text-gray-600">
                      Tag:
                    </label>
                    <input
                      type="text"
                      value={tagAssignments[file.name] || ''}
                      onChange={(e) => handleTagChange(file.name, e.target.value)}
                      placeholder="SOURCE"
                      className="w-28 px-2 py-1 border-0 focus:outline-none focus:ring-0 uppercase font-medium text-gray-800"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleContinue}
              disabled={isProcessing}
              className={`w-full py-4 font-bold text-lg rounded-lg transition-all shadow-lg ${
                isProcessing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 hover:shadow-xl'
              } text-white`}
            >
              {isProcessing ? 'Processing...' : 'Continue →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}