'use client';

import { useState } from 'react';
import { ProgressiveImage } from '../components/ProgressiveImage';
import { enhancedImageStore } from '../clients/enhancedImageMetadataStore';

export default function TestEnhancedImages() {
  const [imageIds, setImageIds] = useState<string[]>([]);
  const [showMigration, setShowMigration] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const newIds: string[] = [];

      for (const file of Array.from(files)) {
        const path = `public/test-uploads/${file.name}`; // Use allowed public path
        const result = await enhancedImageStore.uploadImage(file, path, {
          caption: `Test upload: ${file.name}`,
          onProgress: (progress) => {
            console.log(`Upload progress for ${file.name}: ${progress}%`);
          }
        });

        if (result.ok) {
          newIds.push(result.val);
          console.log(`Successfully uploaded ${file.name} with ID: ${result.val}`);
        } else {
          console.error(`Failed to upload ${file.name}:`, result.val.message);
        }
      }

      if (newIds.length > 0) {
        setImageIds(prev => [...prev, ...newIds]);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      // Reset the file input
      event.target.value = '';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Enhanced Image Store Test</h1>

      <div className="grid gap-8">
        {/* File Upload Test */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Test Image Upload</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Select images to upload:
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                disabled={isUploading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
              />
            </div>

            {isUploading && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Uploading images...</span>
              </div>
            )}

            <div className="text-sm text-gray-600">
              <p>• Images will be uploaded to the enhanced image store</p>
              <p>• Thumbnails will be generated automatically</p>
              <p>• Check the browser console for upload progress</p>
            </div>
          </div>
        </div>

        {/* Test ProgressiveImage Component */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Test ProgressiveImage Component</h2>

          {imageIds.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {imageIds.map((imageId) => (
                <div key={imageId} className="border rounded">
                  <ProgressiveImage
                    imageId={imageId}
                    className="aspect-square object-cover w-full rounded"
                    alt={`Test image ${imageId}`}
                  />
                  <p className="text-xs p-2 text-gray-500">ID: {imageId}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <p className="text-gray-600">
                No images to display. Add some test image IDs using the buttons below.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                ProgressiveImage component is loaded and ready ✅
              </p>
            </div>
          )}
        </div>

        {/* Debug Info */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
          <div className="space-y-2 text-sm">
            <div><strong>Status:</strong> Testing image upload + display</div>
            <div><strong>Next.js:</strong> Running successfully</div>
            <div><strong>Routing:</strong> Working ✅</div>
            <div><strong>ProgressiveImage:</strong> Imported ✅</div>
            <div><strong>EnhancedImageStore:</strong> Imported ✅</div>
            <div><strong>Upload Function:</strong> Ready ✅</div>
            <div><strong>Current Image IDs:</strong> {imageIds.length}</div>
            <div><strong>Uploading:</strong> {isUploading ? 'Yes 🔄' : 'No'}</div>
          </div>
        </div>

        {/* Migration Tools Placeholder */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Migration Tools</h2>
            <button
              onClick={() => setShowMigration(!showMigration)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {showMigration ? 'Hide' : 'Show'} Debug Info
            </button>
          </div>

          {showMigration && (
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold mb-2">Implementation Status:</h3>
              <ul className="space-y-1 text-sm">
                <li>✅ Enhanced Image Store - Created</li>
                <li>✅ Image Utilities - Created</li>
                <li>✅ Progressive Image Component - Created</li>
                <li>✅ Migration Scripts - Created</li>
                <li>⏳ Component Integration - In Progress</li>
              </ul>
            </div>
          )}
        </div>

        {/* Test Actions */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                console.log('Enhanced Image Store Test Page Loaded Successfully');
                console.log('Available for testing:', {
                  imageIds,
                  timestamp: new Date().toISOString()
                });
              }}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Test Console Log
            </button>

            <button
              onClick={() => {
                setImageIds([`test-${Date.now()}`]);
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add Test Image ID
            </button>

            <button
              onClick={() => {
                setImageIds([]);
              }}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Clear State
            </button>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">Next Steps</h2>
          <div className="space-y-2 text-blue-700">
            <p>1. ✅ Verify this test page loads (you're seeing this!)</p>
            <p>2. 🔧 Fix any TypeScript compilation errors in enhanced components</p>
            <p>3. 🔄 Gradually add back the enhanced components</p>
            <p>4. 🧪 Test image upload functionality</p>
            <p>5. 🚀 Migration from old image store</p>
          </div>
        </div>
      </div>
    </div>
  );
}