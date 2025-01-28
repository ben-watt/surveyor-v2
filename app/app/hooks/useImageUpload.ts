import { useCallback, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { imageUploadStore } from '../clients/ImageUploadStore';
import { SyncStatus, ImageUpload } from '../clients/Dexie';

interface ImageUploadOptions {
  path: string;
  metadata?: Record<string, string>;
  onProgress?: (progress: number) => void;
}

// Type for the image list response
export interface ImageListItem {
    fullPath: string;
    syncStatus: SyncStatus;
}

export const useImageList = (path: string) => {
    const [isLoading, setIsLoading] = useState(true);
    const [images, setImages] = useState<ImageListItem[]>([]);

    useEffect(() => {
        const loadImages = async () => {
            setIsLoading(true);
            try {
                const result = await imageUploadStore.list(path);
                if (result.ok) {
                    setImages(result.val);
                }
            } catch (error) {
                console.error('Failed to load images:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadImages();
        // Set up an interval to refresh the list periodically
        const interval = setInterval(loadImages, 5000);

        return () => clearInterval(interval);
    }, [path]);

    return { images, isLoading };
};

export function useImageUpload() {
  const queueUpload = useCallback(async (file: File | Blob, options: ImageUploadOptions) => {
    const id = uuidv4();

    try {
      await imageUploadStore.create({
        file,
        path: options.path,
        metadata: options.metadata
      });

      // Trigger sync immediately
      imageUploadStore.sync();
      
      return id;
    } catch (error) {
      console.error('Failed to queue upload:', error);
      throw error;
    }
  }, []);

  const cancelUpload = useCallback(async (id: string) => {
    try {
      await imageUploadStore.remove(id);
      return true;
    } catch (error) {
      console.error('Failed to cancel upload:', error);
      return false;
    }
  }, []);

  return { queueUpload, cancelUpload };
} 