import React from 'react';

interface VersionPreviewProps {
  versionLabel: string;
  content: string;
  onReturn: () => void;
}

/**
 * Displays a preview of a document version.
 * @param versionLabel The label for the version being previewed
 * @param content The HTML content to preview
 * @param onReturn Handler for returning to the latest version
 * @returns The version preview component
 */
export const VersionPreview: React.FC<VersionPreviewProps> = ({
  versionLabel,
  content,
  onReturn,
}) => (
  <div className="border rounded bg-gray-50 p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="font-semibold">Previewing Version {versionLabel}</span>
      <button
        className="text-blue-600 underline text-sm"
        onClick={onReturn}
        aria-label="Return to editing latest version"
      >
        Return to Editing
      </button>
    </div>
    <div
      className="prose max-w-none bg-white p-4 rounded shadow-inner min-h-[300px]"
      dangerouslySetInnerHTML={{ __html: content }}
      role="region"
      aria-label="Version preview content"
    />
  </div>
); 