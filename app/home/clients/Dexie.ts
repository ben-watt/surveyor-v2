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
}

const getId = (id: string, tenantId: string) => tenantId + '#' + id;

function CreateDexieHooks<T extends TableEntity, TCreate extends { id: string }, TUpdate extends { id: string }>(
  db: Dexie,
  tableName: string,
  remoteHandlers: DexieRemoteHandlers<T, TCreate, TUpdate>
) : DexieStore<T, TCreate> {
  const table = db.table<T>(tableName);
  let syncInProgress = false;
  
  const sync = async () => {
    if (navigator.onLine && !syncInProgress) {
      const syncResult = await syncWithServer();
      if (syncResult.ok) {
        return Ok(undefined);
      }

      console.error("[sync] Error syncing with server", syncResult.val);
      return Err(new Error(syncResult.val.message));
    }

    return Err(new Error("Not online"));
  }

  const debounceSync = debounce(sync, 1000);

  const useList = (): [boolean, T[]] => {
    const [hydrated, setHydrated] = useState<boolean>(false);
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [authReady, setAuthReady] = useState(false);

    useEffect(() => {
      const checkAuth = async () => {
        try {
          const user = await getCurrentUser();
          if (user) {
            setAuthReady(true);
          }
        } catch (error) {
          setAuthReady(false);
        }
      };

      const timeout = setTimeout(() => {
        checkAuth();
      }, 200);

      return () => clearTimeout(timeout);
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
        const item = await table.get([getId(id, tenantId), tenantId]);
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
          const deleteResult = await remoteHandlers.delete(item.id);
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

      for (const remote of remoteData) {
        const tenantId = await getCurrentTenantId();
        const local = await table.get([remote.id, tenantId]);

        if(!local) {
          console.debug("[syncWithServer] Local item not found, creating...", remote);
          await table.add({ ...remote, syncStatus: SyncStatus.Queued });
          continue;
        }
        
        if(local?.syncStatus === SyncStatus.PendingDelete) {
          console.debug("[syncWithServer] Skipping pending delete", remote);
          continue;
        }

        if(new Date(remote.updatedAt) > new Date(local.updatedAt)) {
          console.debug("[syncWithServer] Found newer version on server, updating local version...", remote);
          await table.put({ ...remote, syncStatus: SyncStatus.Synced });
          continue;
        }
      }

      const tenantId = await getCurrentTenantId();
      const localRecords = await table.where('syncStatus')
        .equals(SyncStatus.Queued)
        .or('syncStatus')
        .equals(SyncStatus.Failed)
        .and(item => item.tenantId === tenantId)
        .toArray();

      for (const local of localRecords) {
        console.log("[syncWithServer] Processing local record", local);
        try {
            const exists = remoteData.find(r => r.id === local.id);
            if(exists) {
              console.log("[syncWithServer] Updating...", local);
              const updateResult = await remoteHandlers.update(local as unknown as TUpdate);
              if (updateResult instanceof Ok) {
                await table.put({ ...updateResult.val, syncStatus: SyncStatus.Synced });
              } else if ('syncStatus' in updateResult) {
                await table.put({ ...updateResult, syncStatus: SyncStatus.Synced });
              } else {
                await table.put({ 
                  ...local, 
                  syncStatus: SyncStatus.Failed, 
                  syncError: updateResult.val.message ?? "Failed to update item"
                });
              }
            } else {
              console.log("[syncWithServer] Creating...", local);
              const createResult = await remoteHandlers.create(local as unknown as TCreate);
              if (createResult instanceof Ok) {
                await table.put({ ...createResult.val, syncStatus: SyncStatus.Synced });
              } else if ('syncStatus' in createResult) {
                await table.put({ ...createResult, syncStatus: SyncStatus.Synced });
              } else {
                await table.put({ 
                  ...local, 
                  syncStatus: SyncStatus.Failed, 
                  syncError: createResult.val.message ?? "Failed to create item"
                });
              }
            }
          } catch(error: any) {
            console.log("[syncWithServer] Error...", error);
            await table.put({ ...local, syncStatus: SyncStatus.Failed, syncError: error.message });
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
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return null;

    const local = await table.get([getId(id, tenantId), tenantId]);
    if (!local || local.syncStatus === SyncStatus.PendingDelete) {
      console.error("[get] Item not found with id: " + id);
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
      const tenantId = await getCurrentTenantId();
      if (!tenantId) return;
      const local = await table.get([getId(id, tenantId), tenantId]);
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
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return;
    const local = await table.get([getId(id, tenantId), tenantId]);

    if (local) {
      await table.put({
        ...local,
        syncStatus: SyncStatus.PendingDelete,
        updatedAt: new Date().toISOString(),
      });
      
      // Trigger sync asynchronously if online
      sync();
    } else {
      console.error("[remove] Item not found", id, tenantId);
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
    const interval = setInterval(() => {
      if (navigator.onLine && !syncInProgress) {
        syncWithServer();
      }
    }, intervalMs);
    
    return () => clearInterval(interval);
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
    sync: debounceSync
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
  imageMetadata: '[id+tenantId], imagePath, updatedAt, syncStatus',
});


export { db, CreateDexieHooks, SyncStatus };