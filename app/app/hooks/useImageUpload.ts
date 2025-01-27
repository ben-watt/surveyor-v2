import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { imageUploadStore } from '../clients/Database';

interface ImageUploadOptions {
  path: string;
  metadata?: Record<string, string>;
  onProgress?: (progress: number) => void;
}

export function useImageUpload() {
  const queueUpload = useCallback(async (file: File | Blob, options: ImageUploadOptions) => {
    const id = uuidv4();

    try {
      await imageUploadStore.add({
        id,
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