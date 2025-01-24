import { useCallback } from 'react';
import { db } from '../clients/Dexie';
import { v4 as uuidv4 } from 'uuid';
import { TransferProgressEvent, uploadData } from "aws-amplify/storage";

interface ImageUploadOptions {
  path: string;
  metadata?: Record<string, string>;
  onProgress?: (progress: number) => void;
}

export function useImageUpload() {
  const queueUpload = useCallback(async (file: File | Blob, options: ImageUploadOptions) => {
    const id = uuidv4();
    const now = new Date().toISOString();

    // Queue the upload in IndexedDB
    await db.imageUploads.add({
      id,
      file,
      path: options.path,
      metadata: options.metadata,
      updatedAt: now,
      syncStatus: 'queued'
    });

    // Request background sync if available
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if ('sync' in registration) {
          await registration.sync.register('image-uploads');
        } else {
          await handleFallbackUpload(id, options.onProgress);
        }
      } else {
        await handleFallbackUpload(id, options.onProgress);
      }
    } catch (error) {
      console.error('Failed to queue upload:', error);
      throw error;
    }

    return id;
  }, []);

  const cancelUpload = useCallback(async (id: string) => {
    try {
      const upload = await db.imageUploads.get(id);
      if (upload) {
        // If the upload is in progress in the service worker, we can't really stop it
        // But we can remove it from the queue if it hasn't started yet
        await db.imageUploads.delete(id);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to cancel upload:', error);
      return false;
    }
  }, []);

  return { queueUpload, cancelUpload };
}

async function handleFallbackUpload(id: string, onProgress?: (progress: number) => void) {
  // Fallback for browsers that don't support background sync
  const upload = await db.imageUploads.get(id);
  if (upload) {
    try {
      const { result } = await uploadData({
        data: upload.file,
        path: upload.path,
        options: {
          metadata: upload.metadata,
          onProgress: (progress: TransferProgressEvent) => {
            const percentage = (progress.transferredBytes / (progress.totalBytes || 1)) * 100;
            onProgress?.(percentage);
          }
        }
      });

      await result;
      await db.imageUploads.delete(id);
    } catch (error) {
      await db.imageUploads.update(id, {
        syncStatus: 'failed',
        syncError: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
} 