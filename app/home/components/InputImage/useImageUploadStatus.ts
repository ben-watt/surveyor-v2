import { useCallback, useEffect, useState } from 'react';
import { imageUploadStatusStore } from './imageUploadStatusStore';

/**
 * Hook to track the upload status of images at specified paths
 * @param paths - Array of paths to track upload status for
 * @returns Object containing upload status and helper functions
 */
export function useImageUploadStatus(paths: string[]) {
  const [isUploading, setIsUploading] = useState(false);

  // Check if any images are uploading
  const checkUploadStatus = useCallback(() => {
    const uploading = paths.some((path) => imageUploadStatusStore.isUploading(path));
    setIsUploading(uploading);
    return uploading;
  }, [paths]);

  // Subscribe to upload status changes
  useEffect(() => {
    const unsubscribe = imageUploadStatusStore.subscribe((uploading, path) => {
      console.log('[useImageUploadStatus] upload status changed', uploading, path);
      if (paths.includes(path)) {
        checkUploadStatus();
      }
    });

    // Initial check
    checkUploadStatus();

    return () => unsubscribe();
  }, [paths, checkUploadStatus]);

  return {
    isUploading,
    checkUploadStatus,
    isPathUploading: useCallback((path: string) => imageUploadStatusStore.isUploading(path), []),
  };
}
