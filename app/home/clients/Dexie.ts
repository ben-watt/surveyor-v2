import Dexie, { EntityTable } from 'dexie';
import { type Schema } from "@/amplify/data/resource";
import { BuildingSurveyFormData } from '../surveys/building-survey-reports/BuildingSurveyReportSchema';

import { Draft, produce } from "immer";
import { Err, Ok, Result } from 'ts-results';
import { getErrorMessage } from '../utils/handleError';
import { useLiveQuery } from "dexie-react-hooks";
import { useState, useEffect } from 'react';
import { debounce, DebouncedFunc } from 'lodash';
import { getCurrentTenantId } from '../utils/tenant-utils';
import { ImageMetadata } from './Database';
import { getCurrentUser } from 'aws-amplify/auth';

type ReplaceFieldType<T, K extends keyof T, NewType> = Omit<T, K> & {
  [P in K]: NewType;
};

export type Survey = ReplaceFieldType<Schema['Surveys']['type'], "content", BuildingSurveyFormData>;
export type UpdateSurvey = ReplaceFieldType<Schema['Surveys']['updateType'], "content", BuildingSurveyFormData>;
export type CreateSurvey = ReplaceFieldType<Schema['Surveys']['createType'], "content", BuildingSurveyFormData>;
export type DeleteSurvey = Schema['Surveys']['deleteType']

export type Component = Omit<Schema['Components']['type'], "element">;
export type Element = Omit<Schema['Elements']['type'], "components" | "section">;
export type Phrase = Schema['Phrases']['type'];
export type Section = Omit<Schema['Sections']['type'], "elements"> & TableEntity;

export interface ImageUpload {
  id: string;
  tenantId: string;
  path: string;
  file: Blob;
  metadata?: Record<string, string>;
  href: string;
  updatedAt: string;
  syncStatus: string;
  syncError?: string;
}

type TableEntity = {
  id: string;
  updatedAt: string;
  syncStatus: string;
  syncError?: string | undefined | null;
  tenantId: string;
}

enum SyncStatus {
  Synced = "synced",
  Draft = "draft",
  Queued = "queued",
  Failed = "failed",
  PendingDelete = "pending_delete",
  Archived = "archived",
}

export interface DexieRemoteHandlers<T, TCreate, TUpdate> {
  list: () => Promise<T[] | Result<T[], Error>>;
  create: (data: TCreate) => Promise<T | Result<T, Error>>;
  update: (data: TUpdate) => Promise<T | Result<T, Error>>;
  delete: (id: string) => Promise<void | Result<string, Error>>;
  syncWithServer?: () => Promise<void>;
}

export interface DexieStore<T, TCreate> {
  useList: () => [boolean, T[]];  
  useGet: (id: string) => [boolean, T | undefined];
  add: (data: Omit<TCreate, "syncStatus" | "createdAt" | "updatedAt" | "tenantId">) => Promise<void>;
  get: (id: string) => Promise<T | null>;
  update: (id: string, updateFn: (currentState: Draft<T>) => void) => Promise<void>;
  remove: (id: string) => Promise<void>;
  removeAll: (options: { options: boolean }) => Promise<void>;
  sync: DebouncedFunc<() => Promise<Result<void, Error>>>;
  startPeriodicSync: (intervalMs?: number) => () => void;
  forceSync: () => Promise<Result<void, Error>>;
}

function CreateDexieHooks<T extends TableEntity, TCreate extends { id: string }, TUpdate extends { id: string }>(
  db: Dexie,
  tableName: string,
  remoteHandlers: DexieRemoteHandlers<T, TCreate, TUpdate>
) : DexieStore<T, TCreate> {
  const table = db.table<T>(tableName);
  let syncInProgress = false;

  const getId = (id: string, tenantId: string) => id + '#' + tenantId;
  const getOriginalId = (compositeId: string) => compositeId.split('#')[0];
  const getItem = async (id: string) => {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return null;
    
    // Try composite key first, then fallback to original id only if it belongs to same tenant
    const compositeResult = await table.get([getId(id, tenantId), tenantId]);
    if (compositeResult) {
      return compositeResult;
    }
    
    // Fallback: get by original id but verify tenant ownership
    const fallbackResult = await table.get([id, tenantId]);
    if (fallbackResult && fallbackResult.tenantId === tenantId) {
      return fallbackResult;
    }
    
    return null;
  }
  
  const sync = async () => {
    if (!navigator.onLine) {
      return Err(new Error("Not online"));
    }
    
    if (syncInProgress) {
      return Err(new Error("Sync already in progress"));
    }

    const syncResult = await syncWithServer();
    if (syncResult.ok) {
      return Ok(undefined);
    }

    console.error("[sync] Error syncing with server", syncResult.val);
    return Err(new Error(syncResult.val.message));
  }

  const debounceSync = debounce(sync, 1000);

  const useList = (): [boolean, T[]] => {
    const [hydrated, setHydrated] = useState<boolean>(false);
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [authReady, setAuthReady] = useState(false);

    useEffect(() => {
      let mounted = true;
      
      const checkAuth = async () => {
        try {
          const user = await getCurrentUser();
          if (mounted && user) {
            setAuthReady(true);
          }
        } catch (error) {
          if (mounted) {
            setAuthReady(false);
          }
        }
      };

      const timeout = setTimeout(() => {
        checkAuth();
      }, 200);

      return () => {
        mounted = false;
        clearTimeout(timeout);
      };
    }, []);

    useEffect(() => {
      if (authReady) {
        getCurrentTenantId().then(setTenantId);
      }
    }, [authReady]);

    const data = useLiveQuery(
      async () => {
        if (!authReady || !tenantId) return [];
        console.debug("[useList] Getting data", tenantId, authReady);
        const items = await table
          .where('syncStatus')
          .notEqual(SyncStatus.PendingDelete)
          .filter(item => item.tenantId === tenantId)
          .toArray();
        setHydrated(true);
        return items;
      },
      [tenantId, authReady]
    );

    return [hydrated && authReady && tenantId !== null, data ?? []];
  };

  const useGet = (id: string): [boolean, T | undefined] => {
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [authReady, setAuthReady] = useState(false);

    // Check auth state
    useEffect(() => {
      let mounted = true;

      const checkAuth = async () => {
        try {
          await getCurrentUser();
          if (mounted) {
            setAuthReady(true);
          }
        } catch (error) {
          if (mounted) {
            setAuthReady(true); // Still set to true as auth might be ready but no user
          }
        }
      };

      checkAuth();

      return () => {
        mounted = false;
      };
    }, []);

    // Get tenant ID
    useEffect(() => {
      if (authReady) {
        getCurrentTenantId().then(setTenantId);
      }
    }, [authReady]);

    const result = useLiveQuery(
      async () => {
        if (!authReady || !tenantId) return { value: undefined };
        const item = await getItem(id);
        return item && 
               item.syncStatus !== SyncStatus.PendingDelete && 
               item.tenantId === tenantId 
          ? { value: item } 
          : { value: undefined };
      },
      [id, tenantId, authReady]
    );
    
    return [result !== undefined && authReady && tenantId !== null, result?.value];
  };

  const syncWithServer = async (): Promise<Result<void, Error>> => {
    if (syncInProgress) return Ok(undefined);
    
    syncInProgress = true;
    console.debug("[syncWithServer] Syncing with server");

    try {
      // Use custom sync handler if provided
      if (remoteHandlers.syncWithServer) {
        await remoteHandlers.syncWithServer();
        return Ok(undefined);
      }

      const pendingDeletes = await table
        .where('syncStatus')
        .equals(SyncStatus.PendingDelete)
        .toArray();

      for (const item of pendingDeletes) {
        try {
          const originalId = getOriginalId(item.id);
          const deleteResult = await remoteHandlers.delete(originalId);
          if (deleteResult instanceof Ok || deleteResult === undefined) {
            await table.delete(item.id);
          } else {
            await table.put({
              ...item,
              syncStatus: SyncStatus.PendingDelete,
              syncError: deleteResult.val.message,
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error(`[syncWithServer] Failed to delete item ${item.id}:`, error);
          await table.put({
            ...item,
            syncStatus: SyncStatus.PendingDelete,
            syncError: error instanceof Error ? error.message : "Failed to delete item",
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // Then sync with remote
      const remoteDataResult = await remoteHandlers.list();

      let remoteData: T[];
      if (remoteDataResult instanceof Ok) {
        remoteData = remoteDataResult.val;
      } else if (Array.isArray(remoteDataResult)) {
        remoteData = remoteDataResult;
      } else {
        return Err(new Error("Failed to get remote data"));
      }

      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        return Err(new Error("No tenant ID available"));
      }

      // Process remote data - mark existing items as synced
      for (const remote of remoteData) {
        const local = await getItem(remote.id);

        if(!local) {
          console.debug("[syncWithServer] Local item not found, creating as synced...", remote);
          const compositeId = getId(remote.id, tenantId);
          await table.put({ ...remote, id: compositeId, syncStatus: SyncStatus.Synced });
          continue;
        }
        
        if(local?.syncStatus === SyncStatus.PendingDelete) {
          console.debug("[syncWithServer] Skipping pending delete", remote);
          continue;
        }

        if(new Date(remote.updatedAt) > new Date(local.updatedAt)) {
          console.debug("[syncWithServer] Found newer version on server, updating local version...", remote);
          const compositeId = getId(remote.id, tenantId);
          await table.put({ ...remote, id: compositeId, syncStatus: SyncStatus.Synced });
          continue;
        }
      }

      // Process local queued/failed items
      const localRecords = await table.where('syncStatus')
        .equals(SyncStatus.Queued)
        .or('syncStatus')
        .equals(SyncStatus.Failed)
        .and(item => item.tenantId === tenantId)
        .toArray();

      for (const local of localRecords) {
        console.log("[syncWithServer] Processing local record", local);
        try {
            const originalId = getOriginalId(local.id);
            const exists = remoteData.find(r => r.id === originalId);
            
            if(exists) {
              console.log("[syncWithServer] Updating...", local);
              const updateData = { ...local, id: originalId } as unknown as TUpdate;
              const updateResult = await remoteHandlers.update(updateData);
              if (updateResult instanceof Ok) {
                const compositeId = getId(updateResult.val.id, tenantId);
                await table.put({ ...updateResult.val, id: compositeId, syncStatus: SyncStatus.Synced });
              } else if (updateResult instanceof Err) {
                await table.put({ 
                  ...local, 
                  syncStatus: SyncStatus.Failed, 
                  syncError: updateResult.val.message ?? "Failed to update item"
                });
              } else {
                // Handle direct result (not wrapped in Result)
                const compositeId = getId(updateResult.id, tenantId);
                await table.put({ ...updateResult, id: compositeId, syncStatus: SyncStatus.Synced });
              }
            } else {
              console.log("[syncWithServer] Creating...", local);
              const createData = { ...local, id: originalId } as unknown as TCreate;
              const createResult = await remoteHandlers.create(createData);
              if (createResult instanceof Ok) {
                const compositeId = getId(createResult.val.id, tenantId);
                await table.put({ ...createResult.val, id: compositeId, syncStatus: SyncStatus.Synced });
              } else if (createResult instanceof Err) {
                await table.put({ 
                  ...local, 
                  syncStatus: SyncStatus.Failed, 
                  syncError: createResult.val.message ?? "Failed to create item"
                });
              } else {
                // Handle direct result (not wrapped in Result)
                const compositeId = getId(createResult.id, tenantId);
                await table.put({ ...createResult, id: compositeId, syncStatus: SyncStatus.Synced });
              }
            }
          } catch(error: any) {
            console.log("[syncWithServer] Error...", error);
            const errorMessage = error.message || error.toString() || "Unknown error";
            await table.put({ 
              ...local, 
              syncStatus: SyncStatus.Failed, 
              syncError: errorMessage 
            });
          }
      }

      console.debug("[syncWithServer] Synced with server successfully"); 
      return Ok(undefined);
    } catch (error: any) {
      console.error("[syncWithServer] Error syncing with server", error);
      return Err(new Error(getErrorMessage(error)));
    } finally {
      syncInProgress = false;
    }
  };

  const get = async (id: string) => {
    const local = await getItem(id);
    if (!local || local.syncStatus === SyncStatus.PendingDelete) {
      console.debug("[get] Item not found with id: " + id);
      return null;
    }

    return local;
  };

  const add = async (data: Omit<TCreate, "syncStatus" | "createdAt" | "updatedAt" | "tenantId">) => {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) return;
      await table.add({
        ...data,
        id: getId(data.id, tenantId),
        syncStatus: SyncStatus.Queued,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tenantId: tenantId
      } as unknown as T);
      
      // Trigger sync asynchronously if online
      sync();
  };

  const update = async (id: string, updateFn: (currentState: Draft<T>) => void) => {
      const local = await getItem(id);
      if (!local) {
        throw new Error("Item not found");
      }

      if (local.syncStatus === SyncStatus.PendingDelete) {
        throw new Error("Cannot update a deleted item");
      }

      const data = produce(local, updateFn);
      await table.put({
        ...data,
        syncStatus: SyncStatus.Queued,
        updatedAt: new Date().toISOString(),
      });

      // Trigger sync asynchronously if online
      sync();
  };

  const remove = async (id: string) => {
    const local = await getItem(id);

    if (local) {
      await table.put({
        ...local,
        syncStatus: SyncStatus.PendingDelete,
        updatedAt: new Date().toISOString(),
      });
      
      // Trigger sync asynchronously if online
      sync();
    } else {
      console.error("[remove] Item not found", id);
    }
  };

  const removeAll = async ({ options: deleteRemote = true }: { options: boolean }) => {
      const all = await table.toArray();
      if (deleteRemote) {
        // Mark all items for deletion
        for (const item of all) {
          await table.put({
            ...item,
            syncStatus: SyncStatus.PendingDelete,
            updatedAt: new Date().toISOString(),
          });
        }
        sync();
      } else {
        // Just clear the table locally
        await table.clear();
    }
  };

  // Add periodic sync function that can be called from layout
  const startPeriodicSync = (intervalMs: number = 300000) => {
    const interval = setInterval(async () => {
      if (navigator.onLine && !syncInProgress) {
        try {
          await syncWithServer();
          
          // Retry failed items after a successful sync
          const tenantId = await getCurrentTenantId();
          if (tenantId) {
            const failedItems = await table.where('syncStatus')
              .equals(SyncStatus.Failed)
              .and(item => item.tenantId === tenantId)
              .toArray();
            
            if (failedItems.length > 0) {
              console.debug(`[startPeriodicSync] Retrying ${failedItems.length} failed items`);
              // Reset failed items to queued for retry (but limit retries)
              for (const item of failedItems) {
                const retryCount = parseInt(item.syncError?.match(/retry:(\d+)/)?.[1] || '0');
                if (retryCount < 3) {
                  await table.put({
                    ...item,
                    syncStatus: SyncStatus.Queued,
                    syncError: `retry:${retryCount + 1}`,
                    updatedAt: new Date().toISOString(),
                  });
                } else {
                  console.warn(`[startPeriodicSync] Item ${item.id} has exceeded retry limit`);
                }
              }
            }
          }
        } catch (error) {
          console.error("[startPeriodicSync] Error during periodic sync:", error);
        }
      }
    }, intervalMs);
    
    return () => clearInterval(interval);
  };

  const forceSync = async (): Promise<Result<void, Error>> => {
    console.debug("[forceSync] Starting forced sync");
    
    // Reset all queued and failed items to try again
    const tenantId = await getCurrentTenantId();
    if (tenantId) {
      const stuckItems = await table.where('syncStatus')
        .equals(SyncStatus.Queued)
        .or('syncStatus')
        .equals(SyncStatus.Failed)
        .and(item => item.tenantId === tenantId)
        .toArray();
      
      for (const item of stuckItems) {
        await table.put({
          ...item,
          syncStatus: SyncStatus.Queued,
          syncError: undefined,
          updatedAt: new Date().toISOString(),
        });
      }
      
      console.debug(`[forceSync] Reset ${stuckItems.length} stuck items`);
    }
    
    return await syncWithServer();
  };

  return {
    useList,
    useGet,
    add,
    get,
    update,
    remove,
    removeAll,
    startPeriodicSync,
    sync: debounceSync,
    forceSync
  };
}

const db = new Dexie('Surveys') as Dexie & {
  surveys: EntityTable<Survey, "id", "tenantId">;
  components: EntityTable<Component, "id", "tenantId">;
  elements: EntityTable<Element, "id", "tenantId">;
  phrases: EntityTable<Phrase, "id", "tenantId">;
  sections: EntityTable<Section, "id", "tenantId">;
  imageUploads: EntityTable<ImageUpload, "id", "tenantId">;
  imageMetadata: EntityTable<ImageMetadata, "id", "tenantId">;
};

db.version(1).stores({
  surveys: '[id+tenantId], updatedAt, syncStatus',
  components: '[id+tenantId], updatedAt, syncStatus',
  elements: '[id+tenantId], updatedAt, syncStatus',
  phrases: '[id+tenantId], updatedAt, syncStatus',
  sections: '[id+tenantId], updatedAt, syncStatus',
  imageUploads: '[id+tenantId], path, updatedAt, syncStatus',
  imageMetadata: '[id+tenantId], imagePath, updatedAt, syncStatus'
});

export { db, CreateDexieHooks, SyncStatus };