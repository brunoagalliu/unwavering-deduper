'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface FileInfo {
  name: string;
  size: number;
  tag: string;
}

interface MasterList {
  id: number;
  tag_name: string;
  phone_count: number;
}

export default function DedupePage() {
  const router = useRouter();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [masterLists, setMasterLists] = useState<MasterList[]>([]);
  const [selectedMasters, setSelectedMasters] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const filesData = sessionStorage.getItem('uploadedFiles');
    if (!filesData) {
      router.push('/');
      return;
    }
    setFiles(JSON.parse(filesData));
    fetchMasterLists();
  }, [router]);

  const fetchMasterLists = async () => {
    try {
      const response = await fetch('/api/masters');
      const data = await response.json();
      setMasterLists(data.masters || []);
    } catch (error) {
      console.error('Error fetching master lists:', error);
      alert('Failed to load master lists');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMasterToggle = (tagName: string) => {
    setSelectedMasters(prev => {
      if (prev.includes(tagName)) {
        return prev.filter(t => t !== tagName);
      } else {
        return [...prev, tagName];
      }
    });
  };

  const handleProcess = async () => {
    if (selectedMasters.length === 0) {
      alert('Please select at least one master list to scrub against');
      return;
    }

    sessionStorage.setItem('selectedMasters', JSON.stringify(selectedMasters));
    router.push('/processing');
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const uniqueTags = [...new Set(files.map(f => f.tag))];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-blue-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">⚙️</div>
          <p className="text-xl text-white">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-blue-800">
      <div className="max-w-3xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-5xl font-bold text-white mb-3">
            Source Files
          </h1>
          <p className="text-purple-200 text-lg">
            Below ZIP files are ready and the files inside has been deduped based on chosen dedupe LIST
          </p>
        </div>

        {/* Files Display */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Files to Process ({files.length})
          </h2>
          <div className="space-y-3 mb-6">
            {files.map((file, index) => (
              <div 
                key={index}
                className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📄</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{file.name}</p>
                  <p className="text-sm text-purple-600 font-medium">{file.tag}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Master List Selection */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Select Dedupe Lists
          </h2>
          
          <div className="space-y-3">
            {masterLists.map(master => (
              <label
                key={master.id}
                className={`
                  flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all border-2
                  ${selectedMasters.includes(master.tag_name)
                    ? 'bg-purple-50 border-purple-500'
                    : 'bg-gray-50 border-gray-200 hover:border-purple-300'
                  }
                `}
              >
                <input
                  type="checkbox"
                  checked={selectedMasters.includes(master.tag_name)}
                  onChange={() => handleMasterToggle(master.tag_name)}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{master.tag_name}</span>
                    {master.tag_name === 'GLOBAL' && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                        All Data
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatNumber(master.phone_count)} phone numbers
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => router.push('/')}
            className="flex-1 py-4 bg-white text-purple-600 font-bold text-lg rounded-lg hover:bg-gray-100 transition-all shadow-lg"
          >
            ← Back
          </button>
          <button
            onClick={handleProcess}
            disabled={selectedMasters.length === 0}
            className={`
              flex-1 py-4 font-bold text-lg rounded-lg transition-all shadow-lg
              ${selectedMasters.length === 0
                ? 'bg-gray-400 cursor-not-allowed text-white'
                : 'bg-purple-600 hover:bg-purple-700 text-white hover:shadow-xl'
              }
            `}
          >
            Process Files →
          </button>
        </div>
      </div>
    </div>
  );
}