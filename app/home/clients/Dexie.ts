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

type TableEntity = {
  id: string;
  updatedAt: string;
  syncStatus: string;
  syncError?: string | undefined | null;
  tenantId: string;
}

export enum SyncStatus {
  Synced = "synced",
  Draft = "draft", // Used in other components
  Queued = "queued",
  Failed = "failed",
  PendingDelete = "pending_delete",
  Archived = "archived", // Used in ImageUploadStore
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
  removeAll: (deleteRemote?: boolean) => Promise<void>;
  sync: DebouncedFunc<() => Promise<Result<void, Error>>>;
  startPeriodicSync: (intervalMs?: number) => () => void;
  forceSync: () => Promise<Result<void, Error>>;
}

// Helper to normalize Result types
const normalizeResult = <T>(result: T | Result<T, Error>): Result<T, Error> => {
  if (result instanceof Ok || result instanceof Err) {
    return result as Result<T, Error>;
  }
  return Ok(result);
};

// Custom hook for auth and tenant management
const useAuthAndTenant = () => {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  
  useEffect(() => {
    let mounted = true;
    
    const initialize = async () => {
      try {
        await getCurrentUser();
        if (mounted) {
          setAuthReady(true);
          setAuthSuccess(true);
          const tid = await getCurrentTenantId();
          setTenantId(tid);
        }
      } catch (error) {
        if (mounted) {
          setAuthReady(true);
          setAuthSuccess(false);
        }
      }
    };
    
    const timeout = setTimeout(initialize, 200);
    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, []);
  
  return { tenantId, authReady, authSuccess };
};

function CreateDexieHooks<T extends TableEntity, TCreate extends { id: string }, TUpdate extends { id: string }>(
  db: Dexie,
  tableName: string,
  remoteHandlers: DexieRemoteHandlers<T, TCreate, TUpdate>
) : DexieStore<T, TCreate> {
  const table = db.table<T>(tableName);
  let syncInProgress = false;

  const getItem = async (id: string) => {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return null;

    const result = await table.get(id);
    if (result && result.tenantId === tenantId) {
      return result;
    }

    return null;
  };
  
  const sync = async () => {
    if (!navigator.onLine) {
      console.debug("[sync] Skipping sync - not online");
      return Err(new Error("Not online"));
    }

    console.debug(`[sync] Starting sync for ${tableName}`);
    const syncResult = await syncWithServer();
    if (syncResult.ok) {
      console.debug(`[sync] Sync completed successfully for ${tableName}`);
      return Ok(undefined);
    }

    console.error(`[sync] Error syncing ${tableName} with server:`, syncResult.val);
    return Err(new Error(syncResult.val.message));
  }

  const debounceSync = debounce(sync, 1000);

  const useList = (): [boolean, T[]] => {
    const { tenantId, authReady, authSuccess } = useAuthAndTenant();
    const [initialSyncTriggered, setInitialSyncTriggered] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);

    const data = useLiveQuery(
      async () => {
        if (!authReady || !authSuccess || !tenantId) {
          return [];
        }
        console.debug("[useList] Getting data", tenantId, authReady);
        const items = await table
          .where('tenantId')
          .equals(tenantId)
          .and(item => item.syncStatus !== SyncStatus.PendingDelete)
          .toArray();
        
        // Mark data as loaded once we've queried the database
        setDataLoaded(true);
        
        // Trigger initial sync if no data and online
        if (!initialSyncTriggered && items.length === 0 && navigator.onLine) {
          setInitialSyncTriggered(true);
          console.debug("[useList] No local data found, triggering initial sync");
          syncWithServer().catch(err => 
            console.error("[useList] Initial sync failed:", err)
          );
        }
        
        return items;
      },
      [tenantId, authReady, authSuccess]
    );

    // Only return hydrated=true when auth is successful AND data has been queried
    return [authReady && authSuccess && tenantId !== null && dataLoaded, data ?? []];
  };

  const useGet = (id: string): [boolean, T | undefined] => {
    const { tenantId, authReady, authSuccess } = useAuthAndTenant();
    const [dataQueried, setDataQueried] = useState(false);

    const result = useLiveQuery(
      async () => {
        if (!authReady || !authSuccess || !tenantId) return { value: undefined };
        const item = await getItem(id);
        
        // Mark as queried once we've attempted to get the item
        setDataQueried(true);
        
        return item && 
               item.syncStatus !== SyncStatus.PendingDelete && 
               item.tenantId === tenantId 
          ? { value: item } 
          : { value: undefined };
      },
      [id, tenantId, authReady, authSuccess]
    );
    
    // Only return hydrated=true when auth is successful AND data has been queried
    return [authReady && authSuccess && tenantId !== null && dataQueried, result?.value];
  };

  const syncWithServer = async (): Promise<Result<void, Error>> => {
    if (syncInProgress) return Ok(undefined);
    
    syncInProgress = true;
    console.debug(`[syncWithServer] Starting sync for ${tableName}`);

    try {
      // Resolve tenant early; needed for all phases (deletes, merges, pushes)
      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        return Err(new Error("No tenant ID available"));
      }

      // Use custom sync handler if provided
      if (remoteHandlers.syncWithServer) {
        await remoteHandlers.syncWithServer();
        return Ok(undefined);
      }

      const pendingDeletes = await table
        .where('syncStatus')
        .equals(SyncStatus.PendingDelete)
        .and(item => item.tenantId === tenantId)
        .toArray();

      for (const item of pendingDeletes) {
        try {
          const deleteResult = await remoteHandlers.delete(item.id);
          if (deleteResult instanceof Ok || deleteResult === undefined) {
            await table.delete(item.id);
            console.debug(`[syncWithServer] Deleted item ${item.id} from ${tableName}`);
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

      // tenantId already resolved above

      // Process remote data - mark existing items as synced
      for (const remote of remoteData) {
        // Only process records for current tenant
        if ((remote as any).tenantId && (remote as any).tenantId !== tenantId) {
          continue;
        }
        const local = await getItem(remote.id);

        if(!local) {
          console.debug(`[syncWithServer] New item from server ${remote.id} in ${tableName}`);
          await table.put({ ...remote, tenantId, syncStatus: SyncStatus.Synced });
          continue;
        }
        
        if(local?.syncStatus === SyncStatus.PendingDelete) {
          console.debug("[syncWithServer] Skipping pending delete", remote);
          continue;
        }

        if(new Date(remote.updatedAt) > new Date(local.updatedAt)) {
          console.debug(`[syncWithServer] Updating ${remote.id} in ${tableName} with newer server version`);
          await table.put({ ...remote, tenantId, syncStatus: SyncStatus.Synced });
          continue;
        }
      }

      // Helper to process local records
      const processLocalRecord = async (local: T, exists: boolean) => {
        try {
          const operation = exists ? "Updating" : "Creating";
          console.log(`[syncWithServer] ${operation}...`, local);
          
          const result = exists 
            ? await remoteHandlers.update({ ...local } as unknown as TUpdate)
            : await remoteHandlers.create({ ...local } as unknown as TCreate);
          
          const normalized = normalizeResult(result);
          if (normalized.ok) {
            await table.put({ ...normalized.val, tenantId, syncStatus: SyncStatus.Synced });
          } else {
            await table.put({ 
              ...local, 
              syncStatus: SyncStatus.Failed, 
              syncError: normalized.val.message ?? `Failed to ${exists ? 'update' : 'create'} item`
            });
          }
        } catch(error: any) {
          console.log("[syncWithServer] Error...", error);
          await table.put({ 
            ...local, 
            syncStatus: SyncStatus.Failed, 
            syncError: error.message || error.toString() || "Unknown error"
          });
        }
      };

      // Process local queued/failed items
      const localRecords = await table.where('syncStatus')
        .equals(SyncStatus.Queued)
        .or('syncStatus')
        .equals(SyncStatus.Failed)
        .and(item => item.tenantId === tenantId)
        .toArray();

      for (const local of localRecords) {
        console.log("[syncWithServer] Processing local record", local);
        const exists = remoteData.find(r => r.id === local.id);
        await processLocalRecord(local, !!exists);
      }

      console.debug(`[syncWithServer] Successfully synced ${tableName} - Processed ${localRecords.length} local items and ${remoteData.length} remote items`); 
      return Ok(undefined);
    } catch (error: any) {
      console.error(`[syncWithServer] Error syncing ${tableName}:`, error);
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
        syncStatus: SyncStatus.Queued,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tenantId: tenantId
      } as unknown as T);
      
      // Trigger sync asynchronously if online
      debounceSync();
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
      debounceSync();
  };

  const remove = async (id: string) => {
    const local = await getItem(id);

    if (local) {
      await table.put({
        ...local,
        syncStatus: SyncStatus.PendingDelete,
        updatedAt: new Date().toISOString(),
      });
      
      debounceSync();
      console.debug("[remove] Item removed", id);
    } else {
      console.error("[remove] Item not found", id);
    }
  };

  const removeAll = async (deleteRemote: boolean = true) => {
      if (deleteRemote) {
        const tenantId = await getCurrentTenantId();
        if (!tenantId) return;
        
        // Mark all items for deletion using bulk operation
        const items = await table.where('tenantId').equals(tenantId).toArray();
        const updates = items.map(item => ({
          ...item,
          syncStatus: SyncStatus.PendingDelete,
          updatedAt: new Date().toISOString(),
        }));
        
        await table.bulkPut(updates);
        debounceSync();
      } else {
        // Just clear the table locally
        await table.clear();
    }
  };

  // Periodic sync function - simplified as syncWithServer already handles retries
  const startPeriodicSync = (intervalMs: number = 300000) => {
    const interval = setInterval(async () => {
      if (navigator.onLine && !syncInProgress) {
        try {
          await syncWithServer();
        } catch (error) {
          console.error("[startPeriodicSync] Error during periodic sync:", error);
        }
      }
    }, intervalMs);
    
    return () => clearInterval(interval);
  };

  const forceSync = async (): Promise<Result<void, Error>> => {
    console.debug(`[forceSync] Starting forced sync for ${tableName}`);
    
    // Reset all failed items to try again
    const tenantId = await getCurrentTenantId();
    if (tenantId) {
      const failedItems = await table.where('syncStatus')
        .equals(SyncStatus.Failed)
        .and(item => item.tenantId === tenantId)
        .toArray();
      
      if (failedItems.length > 0) {
        const updates = failedItems.map(item => ({
          ...item,
          syncStatus: SyncStatus.Queued,
          syncError: undefined,
          updatedAt: new Date().toISOString(),
        }));
        
        await table.bulkPut(updates);
        console.debug(`[forceSync] Reset ${failedItems.length} failed items in ${tableName}`);
      }
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
  imageMetadata: EntityTable<ImageMetadata, "id", "tenantId">;
};

// Version 2: Initial schema (kept for upgrade path)
db.version(2).stores({
  surveys: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  components: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  elements: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  phrases: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  sections: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  imageUploads: 'id, tenantId, path, updatedAt, syncStatus, [tenantId+updatedAt]',
  imageMetadata: 'id, tenantId, imagePath, updatedAt, syncStatus, [tenantId+updatedAt]'
});

db.version(21)
.upgrade(async tx => {
  console.log("[Dexie] Upgrading phrases...");
  return tx.table<Phrase, "id", "tenantId">('phrases').toCollection().modify((phrase) => {
    delete (phrase as any)["associatedMaterialIds"];
    delete (phrase as any)["associatedElementIds"];
  });

});

// Add indexes for new imageMetadata fields
db.version(22).stores({
  surveys: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  components: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  elements: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  phrases: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  sections: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  imageUploads: 'id, tenantId, path, updatedAt, syncStatus, [tenantId+updatedAt]',
  imageMetadata: 'id, tenantId, imagePath, uploadStatus, isArchived, updatedAt, syncStatus, [tenantId+updatedAt], [tenantId+uploadStatus], [tenantId+isArchived]'
});

// Version 23: Remove imageUploads table (migrated to imageMetadata)
db.version(23).stores({
  surveys: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  components: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  elements: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  phrases: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  sections: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  imageMetadata: 'id, tenantId, imagePath, uploadStatus, isArchived, updatedAt, syncStatus, [tenantId+updatedAt], [tenantId+uploadStatus], [tenantId+isArchived]'
  // imageUploads table removed in v23
});

export { db, CreateDexieHooks };