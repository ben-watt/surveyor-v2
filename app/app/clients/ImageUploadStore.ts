import { uploadData, remove, list, getProperties, getUrl } from 'aws-amplify/storage';
import { Ok, Result } from 'ts-results';
import { db, ImageUpload, SyncStatus } from './Dexie';
import Dexie from 'dexie';

// Types for the image upload store
export type UpdateImageUpload = Partial<ImageUpload> & { id: string };
export type CreateImageUpload = Omit<ImageUpload, "updatedAt" | "syncStatus" | "syncError">;

function createImageUploadStore(db: Dexie, name: string) {
    const table = db.table<ImageUpload>(name);

    const sync = async () => {
        console.debug("[ImageUploadStore] sync started");
        table.where('syncStatus').equals(SyncStatus.Queued).toArray().then(async items => {
            console.debug("[ImageUploadStore] sync", items);
            items.forEach(async (item: ImageUpload) => {
                const uploadTask = uploadData({
                    path: item.path,
                    data: item.file,
                    options: {
                        contentType: item.file.type,
                        metadata: item.metadata,
                    }
                })

                const result = await uploadTask.result
                console.debug("[ImageUploadStore] sync result", result);

                if(result) {
                    table.delete(item.path);
                    console.debug("[ImageUploadStore] deleted", result);
                }
            });
        });
    }

    return {
        list: async (path: string) => {

            const localImages = await table.where('path').equals(path).toArray();
            
            console.debug("[ImageUploadStore] local images", localImages);

            const response = await list({
                path: path,
                options: {
                    listAll: true,
                }
            });

            console.debug("[ImageUploadStore] remote images", response);

            const remoteResponse = response.items.map(item => {
                return {
                    fullPath: item.path,
                    syncStatus: SyncStatus.Synced,
                }
            });

            const localResponse = localImages.map(item => {
                return {
                    fullPath: item.path,
                    syncStatus: SyncStatus.Queued,
                }
            });

            return Ok(remoteResponse.concat(localResponse));
        },
        get: async (fullPath: string): Promise<Result<ImageUpload, Error>> => {
            
            const localImage = await table.get({ path: fullPath });
            if(localImage) {
                return Ok(localImage);
            }

            const response = await getProperties({
                path: fullPath,
            });

            const url = await getUrl({
                path: fullPath,
            });
            
            const image = await fetch(url.url.href)
            .then(x => x.blob());  

            const lastModified = response.lastModified ? response.lastModified.toISOString() : new Date().toISOString();
            return Ok({
                file: image,
                metadata: response.metadata,    
                path: fullPath,
                href: url.url.href,
                syncStatus: SyncStatus.Synced,
                id: fullPath,
                updatedAt: lastModified,
             });
        },
        create: async (data: CreateImageUpload) => {
            console.debug("[ImageUploadStore] create", data);
            table.add({
                id: data.path,
                path: data.path,
                file: data.file,
                href: data.href,
                metadata: data.metadata,
                updatedAt: new Date().toISOString(),
                syncStatus: SyncStatus.Queued,
            })

            sync();
        },
        remove: async (path: string) => {
            console.debug("[ImageUploadStore] remove", path);
            const localImage = await table.get(path);
            if (localImage) {
                console.debug("[ImageUploadStore] remove", localImage);
                table.delete(path);
            } else {
                console.debug("[ImageUploadStore] remove", path);
                await remove({
                    path: path,
                });
            }
        },
        sync: async () => {
            sync();
        },
        startPeriodicSync: (intervalMs: number = 60000) => {
            const interval = setInterval(sync, intervalMs);
            return () => clearInterval(interval);
        }
    }
}

export const imageUploadStore = createImageUploadStore(db, "imageUploads");