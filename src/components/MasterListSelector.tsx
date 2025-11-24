'use client';

interface MasterList {
  id: number;
  tag_name: string;
  phone_count: number;
}

interface MasterListSelectorProps {
  masterLists: MasterList[];
  selectedMasters: string[];
  onToggle: (tagName: string) => void;
}

export default function MasterListSelector({
  masterLists,
  selectedMasters,
  onToggle
}: MasterListSelectorProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  // Separate GLOBAL from others
  const globalList = masterLists.find(m => m.tag_name === 'GLOBAL');
  const otherLists = masterLists.filter(m => m.tag_name !== 'GLOBAL');

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
      {/* GLOBAL first */}
      {globalList && (
        <label className="flex items-center gap-3 p-4 border-2 border-purple-300 rounded-lg cursor-pointer hover:bg-purple-50 transition-colors">
          <input
            type="checkbox"
            checked={selectedMasters.includes(globalList.tag_name)}
            onChange={() => onToggle(globalList.tag_name)}
            className="w-5 h-5 text-purple-600"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌐</span>
              <span className="font-semibold text-gray-900">
                {globalList.tag_name}
              </span>
              <span className="text-sm text-gray-500">
                (everything in system)
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {formatNumber(globalList.phone_count)} phone numbers
            </p>
          </div>
        </label>
      )}

      {/* Other master lists */}
      {otherLists.map(master => (
        <label
          key={master.id}
          className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <input
            type="checkbox"
            checked={selectedMasters.includes(master.tag_name)}
            onChange={() => onToggle(master.tag_name)}
            className="w-5 h-5 text-purple-600"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">📋</span>
              <span className="font-semibold text-gray-900">
                {master.tag_name}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {formatNumber(master.phone_count)} phone numbers
            </p>
          </div>
        </label>
      ))}

      {otherLists.length === 0 && !globalList && (
        <div className="text-center py-8 text-gray-500">
          <p>No master lists available yet.</p>
          <p className="text-sm mt-2">Upload and process files to create master lists.</p>
        </div>
      )}
    </div>
  );
}