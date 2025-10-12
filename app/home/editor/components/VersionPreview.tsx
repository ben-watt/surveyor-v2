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
  <div className="rounded border bg-gray-50 p-4">
    <div className="mb-2 flex items-center justify-between">
      <span className="font-semibold">Previewing Version {versionLabel}</span>
      <button
        className="text-sm text-blue-600 underline"
        onClick={onReturn}
        aria-label="Return to editing latest version"
      >
        Return to Editing
      </button>
    </div>
    <div
      className="prose min-h-[300px] max-w-none rounded bg-white p-4 shadow-inner"
      dangerouslySetInnerHTML={{ __html: content }}
      role="region"
      aria-label="Version preview content"
    />
  </div>
);
