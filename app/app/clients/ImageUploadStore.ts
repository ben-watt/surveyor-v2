import { uploadData, remove, list, getProperties, getUrl } from 'aws-amplify/storage';
import { Ok } from 'ts-results';
import { db, ImageUpload, SyncStatus } from './Dexie';
import Dexie from 'dexie';

// Types for the image upload store
export type UpdateImageUpload = Partial<ImageUpload> & { id: string };
export type CreateImageUpload = Omit<ImageUpload, "updatedAt" | "syncStatus" | "syncError">;

function createImageUploadStore(db: Dexie, name: string) {
    const table = db.table<ImageUpload>(name);

    const sync = async () => {
        table.where('syncStatus').equals(SyncStatus.Queued).toArray().then(async items => {
            items.forEach(async item => {
                const uploadTask = await uploadData({
                    path: item.path,
                    data: item.file,
                    options: {
                        contentType: item.file.type,
                        metadata: item.metadata,
                    }
                })

                const result = await uploadTask;

                if(result) {
                    table.delete(item.path);
                }
            });
        });
    }

    return {
        list: async (path: string) => {

            const localImages = await table.where('path').equals(path).toArray();
            const response = await list({
                path: path,
                options: {
                    listAll: true,
                }
            });

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
        get: async (fullPath: string) => {
            const response = await getProperties({
                path: fullPath,
            });

            const url = await getUrl({
                path: fullPath,
            });
            
            const image = await fetch(url.url.href)
            .then(x => x.blob());  

            return Ok({
                file: image,
                metadata: response.metadata,    
                path: fullPath,
                syncStatus: SyncStatus.Synced,
             });
        },
        create: async (data: CreateImageUpload) => {
            table.add({
                path: data.path,
                file: data.file,
                metadata: data.metadata,
                updatedAt: new Date().toISOString(),
                syncStatus: SyncStatus.Queued,
            })

            sync();
        },
        remove: async (path: string) => {
            const localImage = await table.get(path);
            if (localImage) {
                table.delete(path);
            } else {
                await remove({
                    path: path,
                });
            }
        },
        sync: async () => {
            sync();
        },
        startPeriodicSync: async () => {
            setInterval(sync, 10000);
        }
    }
}

export const imageUploadStore = createImageUploadStore(db, "imageUploads");