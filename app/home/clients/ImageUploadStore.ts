import { uploadData, remove, list, getProperties, getUrl, copy,  } from 'aws-amplify/storage';
import { Err, Ok, Result } from 'ts-results';
import { db, ImageUpload, SyncStatus } from './Dexie';
import Dexie from 'dexie';
import { getCurrentTenantId } from '../utils/tenant-utils';
import { imageUploadStatusStore } from '../components/InputImage/imageUploadStatusStore';

// Types for the image upload store
export type UpdateImageUpload = Partial<ImageUpload> & { id: string };
export type CreateImageUpload = Omit<ImageUpload, "updatedAt" | "syncStatus" | "syncError" | "tenantId">;
export type UpdateMetadataImageUpload = Omit<CreateImageUpload, "path" | "file" | "href">;

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
                    table.delete([item.path, item.tenantId]);
                    console.debug("[ImageUploadStore] deleted", [item.path, item.tenantId]);
                }
            });
        });

        table.where('syncStatus').equals(SyncStatus.Archived).toArray().then(async items => {
            console.debug("[ImageUploadStore] sync archived", items);
            items.forEach(async (item: ImageUpload) => {
                console.debug("[ImageUploadStore] sync archived", item.path);
                const path = item.path.split("/");
                const fileName = path.pop();
                const folder = path.join("/");

                await copy({
                    source: {
                        path: item.path,
                    },
                    destination: {
                        path: `${folder}/archived/${fileName}`,
                    }
                })

                await remove({
                    path: item.path,
                })

                table.delete([item.path, item.tenantId]);
                console.debug("[ImageUploadStore] deleted", [item.path, item.tenantId]);
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

            if(!fullPath) {
                return Err(new Error("[ImageUploadStore] get: Full path is required"));
            }

            console.debug("[ImageUploadStore] get", fullPath);
            const tenantId = await getCurrentTenantId();
            const localImage = await table.get([fullPath, tenantId]);
            if(localImage) {
                console.debug("[ImageUploadStore] return local image", localImage);
                return Ok(localImage);
            }

            console.debug("[ImageUploadStore] get properties", fullPath);

            const response = await getProperties({
                path: fullPath,
            });

            console.debug("[ImageUploadStore] get response", response);

            const url = await getUrl({
                path: fullPath,
            });
            
            const image = await fetch(url.url.href)
            .then(x => x.blob());  

            const lastModified = response.lastModified ? response.lastModified.toISOString() : new Date().toISOString();
            return Ok({
                file: image,
                tenantId: tenantId || "",
                metadata: response.metadata,    
                path: fullPath,
                href: url.url.href,
                syncStatus: SyncStatus.Synced,
                id: fullPath,
                updatedAt: lastModified,
             });
        },
        create: async (data: CreateImageUpload) => {
            try {
                imageUploadStatusStore.setUploading(data.path, true);
                const tenantId = await getCurrentTenantId();
                await table.add({
                    id: data.path,
                    tenantId: tenantId || "",
                    path: data.path,
                    file: data.file,
                    href: data.href,
                    metadata: data.metadata,
                    updatedAt: new Date().toISOString(),
                    syncStatus: SyncStatus.Queued,
                })

                sync();
            }
            catch(error) {
                console.error("[ImageUploadStore] create", error);
                imageUploadStatusStore.setUploading(data.path, false);
                throw error;
            }
            finally {
                imageUploadStatusStore.setUploaded(data.path);
            }
        },
        archive: async (path: string) => {
            console.debug("[ImageUploadStore] archive", path);
            const tenantId = await getCurrentTenantId();
            await table.put({
                id: path,
                tenantId: tenantId || "",
                path: path,
                file: new Blob(),
                href: "",
                metadata: {},
                syncStatus: SyncStatus.Archived,
                updatedAt: new Date().toISOString(),
            });

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