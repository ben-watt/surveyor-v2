import Dexie, { EntityTable } from 'dexie';
import { type Schema } from "@/amplify/data/resource";
import { BuildingSurveyFormData } from '../surveys/building-survey-reports/BuildingSurveyReportSchema';

import { Draft, produce } from "immer";
import { Err, Ok, Result } from 'ts-results';
import { getErrorMessage } from '../utils/handleError';
import { useLiveQuery } from "dexie-react-hooks";

type ReplaceFieldType<T, K extends keyof T, NewType> = Omit<T, K> & {
  [P in K]: NewType;
};

type OmitType<T, K extends keyof T> = Omit<T, K>;

export type Survey = ReplaceFieldType<Schema['Surveys']['type'], "content", BuildingSurveyFormData>;
export type UpdateSurvey = ReplaceFieldType<Schema['Surveys']['updateType'], "content", BuildingSurveyFormData>;
export type CreateSurvey = ReplaceFieldType<Schema['Surveys']['createType'], "content", BuildingSurveyFormData>;
export type DeleteSurvey = Schema['Surveys']['deleteType']

export type Component = Omit<Schema['Components']['type'], "element">;
export type Element = Omit<Schema['Elements']['type'], "components" | "section">;
export type Phrase = Schema['Phrases']['type'];
export type Location = Schema['Locations']['type'];
export type Section = Omit<Schema['Sections']['type'], "elements">;

export interface ImageUpload extends TableEntity {
  id: string;
  file: Blob;
  path: string;
  metadata?: Record<string, string>;
  updatedAt: string;
  syncStatus: string;
  syncError?: string;
}

type TableEntity = {
  id: string;
  updatedAt: string;
  syncStatus: string;
  syncError?: string;
}

enum SyncStatus {
  Synced = "synced",
  Draft = "draft",
  Queued = "queued",
  Failed = "failed",
  PendingDelete = "pending_delete",
}

// Add debounce utility
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

function CreateDexieHooks<T extends TableEntity, TCreate, TUpdate extends { id: string }>(
  db: Dexie,
  tableName: string,
  remoteHandlers: {
    list: () => Promise<T[] | Result<T[], Error>>;
    create: (data: TCreate) => Promise<T | Result<T, Error>>;
    update: (data: TUpdate) => Promise<T | Result<T, Error>>;
    delete: (id: string) => Promise<void | Result<void, Error>>;
    syncWithServer?: () => Promise<void>;  // Optional custom sync handler
  }
) {
  const table = db.table<T>(tableName);
  let syncInProgress = false;
  
  // Create a debounced version of syncWithServer
  const sync = debounce(async () => {
    if (navigator.onLine && !syncInProgress) {
      await syncWithServer();
    }
  }, 1000);

  const useList = (): [boolean, T[]] => {
    const data = useLiveQuery(
      async () => await table.where('syncStatus').notEqual(SyncStatus.PendingDelete).toArray(),
      []
    );
    return [data === undefined ? false : true, data ?? []];
  };

  const useGet = (id: string): [boolean, T | undefined] => {
    const result = useLiveQuery(
      async () => {
        const item = await table.get(id);
        return item && item.syncStatus !== SyncStatus.PendingDelete ? { value: item } : { value: undefined };
      },
      [id]
    );
    
    return [result !== undefined, result?.value];
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

      // Default sync implementation
      // Handle pending deletes first
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
              syncStatus: SyncStatus.Failed,
              syncError: deleteResult.val.message,
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error(`[syncWithServer] Failed to delete item ${item.id}:`, error);
          await table.put({
            ...item,
            syncStatus: SyncStatus.Failed,
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
        const local = await table.get(remote.id);
        if (!local || 
            (local.syncStatus !== SyncStatus.PendingDelete && 
             new Date(remote.updatedAt) > new Date(local.updatedAt))) {
          await table.put({ ...remote, syncStatus: SyncStatus.Synced });
        }
      }

      // Handle local changes
      const allLocal = await table.toArray();
      for (const local of allLocal) {
        if (local.syncStatus === SyncStatus.Queued || local.syncStatus === SyncStatus.Failed) {
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
      const local = await table.get(id);
      if (!local || local.syncStatus === SyncStatus.PendingDelete) {
      throw new Error("Item not found");
      }
    return local;
  };

  const add = async (data: Omit<TCreate, "syncStatus" | "createdAt" | "updatedAt">) => {
      await table.add({
        ...data,
        syncStatus: SyncStatus.Queued,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as unknown as T);
      
      // Trigger sync asynchronously if online
      sync();
  };

  const update = async (id: string, updateFn: (currentState: Draft<T>) => void) => {
      const local = await table.get(id);
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
      const local = await table.get(id);
    if (local) {
      // Mark for deletion instead of deleting immediately
      await table.put({
        ...local,
        syncStatus: SyncStatus.PendingDelete,
        updatedAt: new Date().toISOString(),
      });
      
      // Trigger sync asynchronously if online
      sync();
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
  const startPeriodicSync = (intervalMs: number = 30000) => {
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
    sync
  };
}

const db = new Dexie('Surveys') as Dexie & {
  surveys: EntityTable<Survey, "id">;
  components: EntityTable<Component, "id">;
  elements: EntityTable<Element, "id">;
  phrases: EntityTable<Phrase, "id">;
  locations: EntityTable<Location, "id">;
  sections: EntityTable<Section, "id">;
  imageUploads: EntityTable<ImageUpload, "id">;
};

db.version(1).stores({
  surveys: '&id, updatedAt, syncStatus',
  components: '&id, updatedAt, syncStatus',
  elements: '&id, updatedAt, syncStatus',
  phrases: '&id, updatedAt, syncStatus',
  locations: '&id, updatedAt, syncStatus',
  sections: '&id, updatedAt, syncStatus',
  imageUploads: '&id, path, updatedAt, syncStatus',
});


export { db, CreateDexieHooks, SyncStatus };