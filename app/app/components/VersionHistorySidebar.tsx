import React, { useState } from 'react';
import type { DocumentRecord } from '@/app/home/clients/DocumentStore';

interface VersionHistorySidebarProps {
  versions: DocumentRecord[];
  onSelect: (version: DocumentRecord) => void;
  onClose: () => void;
  selectedVersion?: DocumentRecord | null;
  isOpen: boolean;
  isLoading: boolean;
}

/**
 * VersionHistorySidebar displays a list of document versions in a sidebar.
 * @param versions List of version records
 * @param onSelect Callback when a version is selected
 * @param onClose Callback to close the sidebar
 * @param selectedVersion The currently selected version
 * @param isOpen Whether the sidebar is open
 * @param isLoading Whether the version list is loading
 * @returns Sidebar component
 */
export const VersionHistorySidebar: React.FC<VersionHistorySidebarProps> = ({
  versions,
  onSelect,
  onClose,
  selectedVersion,
  isOpen,
  isLoading,
}) => {
  return (
    <aside
      className={`fixed top-0 right-0 h-full w-96 bg-white shadow-lg z-50 transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      role="complementary"
      aria-label="Version History Sidebar"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-lg font-semibold">Version History</h2>
        <button
          onClick={onClose}
          aria-label="Close version history sidebar"
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>
      <div className="overflow-y-auto h-[calc(100%-56px)] p-4">
        {isLoading ? (
          <div>Loading versions...</div>
        ) : versions.length === 0 ? (
          <div>No versions found.</div>
        ) : (
          <ul className="space-y-2">
            {versions.sort((a, b) => (b.version || 0) - (a.version || 0)).map(v => (
              <li key={v.sk}>
                <button
                  className={`w-full text-left px-3 py-2 rounded border ${
                    selectedVersion && selectedVersion.sk === v.sk
                      ? 'bg-blue-100 border-blue-400' : 'bg-white border-gray-200'
                  } hover:bg-blue-50 focus:outline-none`}
                  onClick={() => onSelect(v)}
                  aria-current={selectedVersion && selectedVersion.sk === v.sk ? 'true' : undefined}
                  aria-label={`Version ${typeof v.version === 'number' ? v.version : v.sk}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      Version {typeof v.version === 'number' ? v.version : v.sk}
                    </span>
                    <span className="text-xs text-gray-500">
                      {v.author || 'Unknown'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {v.createdAt ? new Date(v.createdAt).toLocaleString() : ''}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}; 