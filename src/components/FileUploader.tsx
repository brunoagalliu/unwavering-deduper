'use client';

import { useCallback, useState } from 'react';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
}

export default function FileUploader({ onFilesSelected }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;

    const validFiles = Array.from(fileList).filter(file => {
      const isCSV = file.name.toLowerCase().endsWith('.csv');
      const isZIP = file.name.toLowerCase().endsWith('.zip');
      return isCSV || isZIP;
    });

    if (validFiles.length === 0) {
      alert('Please upload CSV or ZIP files only');
      return;
    }

    onFilesSelected(validFiles);
  }, [onFilesSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  }, [handleFiles]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        border-4 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer
        ${isDragging 
          ? 'border-purple-500 bg-purple-50' 
          : 'border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-25'
        }
      `}
    >
      <input
        type="file"
        id="file-input"
        multiple
        accept=".csv,.zip"
        onChange={handleFileInput}
        className="hidden"
      />
      
      <label htmlFor="file-input" className="cursor-pointer">
        <div className="text-6xl mb-4">☁️</div>
        <p className="text-xl font-semibold text-gray-700 mb-2">
          Drag & Drop files here
        </p>
        <p className="text-gray-500 mb-4">
          or click to browse
        </p>
        <p className="text-sm text-gray-400">
          Supports CSV and ZIP files (multiple files allowed)
        </p>
      </label>
    </div>
  );
}