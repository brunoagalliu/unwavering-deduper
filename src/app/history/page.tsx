'use client';

import { useState, useEffect } from 'react';

interface ProcessingLog {
  id: number;
  batch_name: string;
  source_tag: string;
  files_processed: number;
  scrubbed_against: string[];
  original_count: number;
  duplicates_removed: number;
  final_count: number;
  processed_at: string;
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/history');
      if (!response.ok) throw new Error('Failed to fetch history');
      
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const calculatePercentage = (removed: number, original: number) => {
    if (original === 0) return 0;
    return ((removed / original) * 100).toFixed(1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">⚙️</div>
          <p className="text-xl text-gray-600">Loading history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchHistory}
            className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-900 mb-2">
            Processing History
          </h1>
          <p className="text-gray-600">
            View all your past deduplication jobs
          </p>
        </div>

        {/* Summary Stats */}
        {logs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <p className="text-3xl font-bold text-purple-600">
                {logs.length}
              </p>
              <p className="text-sm text-gray-600 mt-1">Total Jobs</p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <p className="text-3xl font-bold text-gray-700">
                {formatNumber(logs.reduce((sum, log) => sum + log.original_count, 0))}
              </p>
              <p className="text-sm text-gray-600 mt-1">Rows Processed</p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <p className="text-3xl font-bold text-red-600">
                {formatNumber(logs.reduce((sum, log) => sum + log.duplicates_removed, 0))}
              </p>
              <p className="text-sm text-gray-600 mt-1">Dupes Removed</p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <p className="text-3xl font-bold text-green-600">
                {formatNumber(logs.reduce((sum, log) => sum + log.final_count, 0))}
              </p>
              <p className="text-sm text-gray-600 mt-1">Clean Rows</p>
            </div>
          </div>
        )}

        {/* History List */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">
            Recent Jobs
          </h2>
          
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-xl mb-2">No processing history yet</p>
              <p className="text-sm">
                Process some files to see them here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border-2 border-gray-200 rounded-lg p-5 hover:border-purple-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">📦</span>
                        <h3 className="text-lg font-bold text-gray-900">
                          {log.batch_name}
                        </h3>
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                          {log.source_tag}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {formatDate(log.processed_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {calculatePercentage(log.duplicates_removed, log.original_count)}%
                      </div>
                      <div className="text-xs text-gray-500">Dupes</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500">Files Processed</p>
                      <p className="text-lg font-bold text-gray-700">
                        {log.files_processed}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Original Rows</p>
                      <p className="text-lg font-bold text-gray-700">
                        {formatNumber(log.original_count)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Duplicates</p>
                      <p className="text-lg font-bold text-red-600">
                        {formatNumber(log.duplicates_removed)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Clean Rows</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatNumber(log.final_count)}
                      </p>
                    </div>
                  </div>

                  {/* Scrubbed Against */}
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">Scrubbed Against:</p>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(log.scrubbed_against) ? (
                        log.scrubbed_against.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {log.scrubbed_against}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}