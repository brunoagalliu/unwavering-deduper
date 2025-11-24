'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface MasterList {
  id: number;
  tag_name: string;
  phone_count: number;
  created_at: string;
  updated_at: string;
}

export default function MastersPage() {
  const router = useRouter();
  const [masterLists, setMasterLists] = useState<MasterList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  useEffect(() => {
    fetchMasterLists();
  }, []);

  const fetchMasterLists = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/masters');
      if (!response.ok) throw new Error('Failed to fetch masters');
      
      const data = await response.json();
      setMasterLists(data.masters || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMaster = async () => {
    const tagName = newTagName.trim().toUpperCase();
    
    if (!tagName) {
      alert('Please enter a tag name');
      return;
    }

    if (tagName === 'GLOBAL') {
      alert('Cannot create GLOBAL tag (reserved)');
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch('/api/masters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagName })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create master list');
      }

      setNewTagName('');
      await fetchMasterLists();
      alert(`Master list "${tagName}" created successfully!`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create master list');
    } finally {
      setIsCreating(false);
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
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

  const filteredLists = masterLists.filter(list =>
    list.tag_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const globalList = filteredLists.find(m => m.tag_name === 'GLOBAL');
  const otherLists = filteredLists.filter(m => m.tag_name !== 'GLOBAL');
  const totalNumbers = masterLists.reduce((sum, m) => m.tag_name === 'GLOBAL' ? m.phone_count : sum, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">⚙️</div>
          <p className="text-xl text-gray-600">Loading master lists...</p>
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
            onClick={fetchMasterLists}
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
            Master Lists
          </h1>
          <p className="text-gray-600">
            Manage your phone number dedupe lists
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <p className="text-4xl font-bold text-purple-600">
              {formatNumber(totalNumbers)}
            </p>
            <p className="text-gray-600 mt-2">Total Phone Numbers</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <p className="text-4xl font-bold text-purple-600">
              {masterLists.length}
            </p>
            <p className="text-gray-600 mt-2">Master Lists</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <p className="text-4xl font-bold text-purple-600">
              {masterLists.length - 1}
            </p>
            <p className="text-gray-600 mt-2">Tagged Sources</p>
          </div>
        </div>

        {/* Create New Master */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Create New Master List
          </h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateMaster()}
              placeholder="Enter tag name (e.g., VIVINT, AVANTO)"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 uppercase font-medium"
              disabled={isCreating}
            />
            <button
              onClick={handleCreateMaster}
              disabled={isCreating || !newTagName.trim()}
              className={`px-6 py-3 font-semibold rounded-lg transition-colors ${
                isCreating || !newTagName.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {isCreating ? 'Creating...' : 'Create Master'}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            New master list will start with 0 phone numbers
          </p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <input
            type="text"
            placeholder="Search master lists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Global Master List (Featured) */}
        {globalList && (
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg shadow-lg p-6 mb-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-4xl">🌐</span>
                  <h2 className="text-3xl font-bold">{globalList.tag_name}</h2>
                </div>
                <p className="text-purple-100 mb-4">
                  Contains all phone numbers from all sources
                </p>
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-purple-200">Phone Numbers:</span>
                    <span className="ml-2 font-bold text-2xl">
                      {formatNumber(globalList.phone_count)}
                    </span>
                  </div>
                  <div>
                    <span className="text-purple-200">Created:</span>
                    <span className="ml-2 font-semibold">
                      {formatDate(globalList.created_at)}
                    </span>
                  </div>
                  <div>
                    <span className="text-purple-200">Last Updated:</span>
                    <span className="ml-2 font-semibold">
                      {formatDate(globalList.updated_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other Master Lists */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">
            Tagged Master Lists ({otherLists.length})
          </h2>
          
          {otherLists.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-xl mb-2">No tagged master lists yet</p>
              <p className="text-sm mb-6">
                Create a new master list above or upload and process files to create tagged master lists
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {otherLists.map((master) => (
                <div
                  key={master.id}
                  className="border-2 border-gray-200 rounded-lg p-5 hover:border-purple-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">📋</span>
                      <h3 className="text-xl font-bold text-gray-900">
                        {master.tag_name}
                      </h3>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone Numbers:</span>
                      <span className="font-bold text-purple-600">
                        {formatNumber(master.phone_count)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span className="font-medium text-gray-700">
                        {formatDate(master.created_at)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Updated:</span>
                      <span className="font-medium text-gray-700">
                        {formatDate(master.updated_at)}
                      </span>
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