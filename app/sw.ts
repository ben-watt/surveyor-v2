import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig, RuntimeCaching } from "serwist";
import { NetworkOnly, Serwist } from "serwist";
import { TransferProgressEvent, uploadData } from "aws-amplify/storage";
import { surveyStore, componentStore, elementStore, phraseStore, locationStore, sectionStore } from './app/clients/Database';
import { SyncStatus } from './app/clients/Dexie';

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

interface TableEntity {
  id: string;
  updatedAt: string;
  syncStatus: string;
  syncError?: string;
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
const IMAGE_SYNC_TAG = 'image-uploads';
const DATA_SYNC_TAG = 'data-sync';

self.addEventListener('sync', async (event) => {
  if (event.tag === IMAGE_SYNC_TAG) {
    event.waitUntil(syncImages());
  } else if (event.tag === DATA_SYNC_TAG) {
    event.waitUntil(syncData());
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

async function syncData() {
  const db = await openDB('Surveys', 1);
  const stores = {
    surveys: { store: surveyStore, table: 'surveys' },
    components: { store: componentStore, table: 'components' },
    elements: { store: elementStore, table: 'elements' },
    phrases: { store: phraseStore, table: 'phrases' },
    locations: { store: locationStore, table: 'locations' },
    sections: { store: sectionStore, table: 'sections' },
  };
  
  for (const [name, { store, table }] of Object.entries(stores)) {
    try {
      // Each store already has the syncWithServer method that handles both
      // pulling remote changes and pushing local changes
      const result = await store.syncWithServer();
      if (result.err) {
        console.error(`Failed to sync ${name}:`, result.val.message);
      } else {
        console.debug(`Successfully synced ${name}`);
      }
    } catch (error) {
      console.error(`Failed to sync ${name}:`, error);
    }
  }
}

function openDB(name: string, version: number) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

serwist.addEventListeners();