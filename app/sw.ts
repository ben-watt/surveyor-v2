import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";
import { TransferProgressEvent, uploadData } from "aws-amplify/storage";

// This declares the value of `injectionPoint` to TypeScript.
// `injectionPoint` is the string that will be replaced by the
// actual precache manifest. By default, this string is set to
// `"self.__SW_MANIFEST"`.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

interface ImageUpload {
  id: string;
  file: Blob;
  path: string;
  metadata?: Record<string, string>;
  syncStatus: string;
  syncError?: string;
  progress?: number;
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

// Register background sync
const SYNC_TAG = 'image-uploads';

self.addEventListener('sync', async (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncImages());
  }
});

async function syncImages() {
  const db = await openDB('Surveys', 1);
  const tx = db.transaction('imageUploads', 'readwrite');
  const store = tx.objectStore('imageUploads');
  
  return new Promise<void>(async (resolve, reject) => {
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = async () => {
      const pendingUploads = request.result as ImageUpload[];
      
      for (const upload of pendingUploads) {
        try {
          const { result } = await uploadData({
            data: upload.file,
            path: upload.path,
            options: {
              metadata: upload.metadata,
              onProgress: async (progress: TransferProgressEvent) => {
                const percentage = (progress.transferredBytes / (progress.totalBytes || 1)) * 100;
                // Update progress in IndexedDB
                await new Promise<void>((resolve, reject) => {
                  const putRequest = store.put({
                    ...upload,
                    progress: percentage
                  });
                  putRequest.onerror = () => reject(putRequest.error);
                  putRequest.onsuccess = () => resolve();
                });
              }
            }
          });

          await result;

          // Remove from queue after successful upload
          await new Promise<void>((resolve, reject) => {
            const deleteRequest = store.delete(upload.id);
            deleteRequest.onerror = () => reject(deleteRequest.error);
            deleteRequest.onsuccess = () => resolve();
          });
        } catch (error) {
          console.error('Failed to upload image:', error);
          // Update status to failed
          const failedUpload = {
            ...upload,
            syncStatus: 'failed',
            syncError: error instanceof Error ? error.message : 'Unknown error'
          };
          
          await new Promise<void>((resolve, reject) => {
            const putRequest = store.put(failedUpload);
            putRequest.onerror = () => reject(putRequest.error);
            putRequest.onsuccess = () => resolve();
          });
        }
      }
      
      resolve();
    };
  });
}

function openDB(name: string, version: number) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

serwist.addEventListeners();