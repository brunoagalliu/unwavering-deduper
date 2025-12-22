'use client';

import { useState, useEffect } from 'react';

interface ProcessingLog {
  id: number;
  batch_name: string;
  source_tag: string;
  files_processed: number;
  original_count: number;
  duplicates_removed: number;
  final_count: number;
  processed_at: string;
  blob_urls?: Array<{
    name: string;
    url: string;
    size: number;
  }>;
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const formatNumber = (num: number) => num.toLocaleString();
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  useEffect(() => {
    fetch('/api/history')
      .then(r => r.json())
      .then(d => {
        setLogs(d.logs || []);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">⚙️</div>
          <p className="text-xl text-gray-600">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-purple-900 mb-8 text-center">
          Processing History
        </h1>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-xl mb-2">No processing history yet</p>
              <p className="text-sm">Process some files to see them here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map(log => (
                <div
                  key={log.id}
                  className="border-2 border-gray-200 rounded-lg p-5 hover:border-purple-300 hover:shadow-md transition-all"
                >
                  <div className="mb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">📦</span>
                      <h3 className="text-lg font-bold text-gray-900">
                        {log.batch_name}
                      </h3>
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        {log.source_tag}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{formatDate(log.processed_at)}</p>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500">Files Processed</p>
                      <p className="text-lg font-bold text-gray-700">{log.files_processed}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Original Rows</p>
                      <p className="text-lg font-bold text-gray-700">{formatNumber(log.original_count)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Duplicates</p>
                      <p className="text-lg font-bold text-red-600">{formatNumber(log.duplicates_removed)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Clean Rows</p>
                      <p className="text-lg font-bold text-green-600">{formatNumber(log.final_count)}</p>
                    </div>
                  </div>

                  {log.blob_urls && log.blob_urls.length > 0 && (
                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-2">Download Processed Files:</p>
                      <div className="flex flex-wrap gap-2">
                        {log.blob_urls.map((file, idx) => (
                          <a
                            key={idx}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-xs hover:bg-purple-200 transition-colors inline-flex items-center gap-1"
                          >
                            <span>📥</span>
                            <span className="font-medium">{file.name}</span>
                            <span className="text-purple-500">({formatFileSize(file.size)})</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {(!log.blob_urls || log.blob_urls.length === 0) && (
                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-400 italic">
                        Files not available (processed before blob storage was enabled)
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}