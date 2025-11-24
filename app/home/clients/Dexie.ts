import Dexie, { EntityTable } from 'dexie';
import { type Schema } from '@/amplify/data/resource';
import { BuildingSurveyFormData } from '../surveys/building-survey-reports/BuildingSurveyReportSchema';

import { Draft, produce } from 'immer';
import { Err, Ok, Result } from 'ts-results';
import { getErrorMessage } from '../utils/handleError';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, useEffect } from 'react';
import { debounce, DebouncedFunc } from 'lodash';
import { getCurrentTenantId } from '../utils/tenant-utils';
import { ImageMetadata } from './Database';
import { getCurrentUser } from 'aws-amplify/auth';
import { Mutex } from 'async-mutex';
import pLimit from 'p-limit';

// Create concurrency limiter for API calls (max 3 concurrent)
const createApiLimiter = () => pLimit(3);

/**
 * Determines if an error is retryable (transient network/server errors)
 */
const isRetryableError = (error: Error): boolean => {
  const message = error.message.toLowerCase();

  // Network errors
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('fetch') ||
    message.includes('connection') ||
    message.includes('econnrefused') ||
    message.includes('enotfound')
  ) {
    return true;
  }

  // Server errors (5xx)
  if (
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504') ||
    message.includes('internal server error') ||
    message.includes('service unavailable') ||
    message.includes('gateway timeout')
  ) {
    return true;
  }

  // Rate limiting
  if (message.includes('429') || message.includes('too many requests')) {
    return true;
  }

  // Auth errors should NOT be retried
  if (
    message.includes('401') ||
    message.includes('403') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('invalid token')
  ) {
    return false;
  }

  // Validation/client errors should NOT be retried
  if (message.includes('400') || message.includes('validation')) {
    return false;
  }

  // Default: don't retry unknown errors
  return false;
};

/**
 * Calculates exponential backoff delay with jitter
 * @param attempt - Current attempt number (0-based)
 * @param baseDelay - Base delay in ms (default 1000)
 * @param maxDelay - Maximum delay in ms (default 10000)
 */
const getBackoffDelay = (attempt: number, baseDelay = 1000, maxDelay = 10000): number => {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, maxDelay);
  // Add jitter (±10%) to prevent thundering herd
  const jitter = cappedDelay * 0.1 * (Math.random() * 2 - 1);
  return Math.round(cappedDelay + jitter);
};

/**
 * Delays execution for specified milliseconds
 */
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Checks if an error indicates the item already exists on the server.
 * This happens when trying to CREATE an item that already exists (ConditionalCheckFailedException).
 */
const isItemAlreadyExistsError = (error: unknown): boolean => {
  if (!error) return false;
  const errorStr = (JSON.stringify(error) || '').toLowerCase();
  const message = ((error as Error)?.message || '').toLowerCase();
  return (
    errorStr.includes('conditionalcheckfailedexception') ||
    message.includes('conditionalcheckfailedexception') ||
    message.includes('conditional request failed')
  );
};

/**
 * Gets the last sync time for a table/tenant combination from localStorage
 * @returns ISO timestamp string or null if never synced
 */
const getLastSyncTime = (tableName: string, tenantId: string): string | null => {
  try {
    const key = `lastSync_${tableName}_${tenantId}`;
    return localStorage.getItem(key);
  } catch {
    // localStorage may not be available in some environments
    return null;
  }
};

/**
 * Sets the last sync time for a table/tenant combination in localStorage
 */
const setLastSyncTime = (tableName: string, tenantId: string, timestamp: string): void => {
  try {
    const key = `lastSync_${tableName}_${tenantId}`;
    localStorage.setItem(key, timestamp);
  } catch {
    // localStorage may not be available in some environments
    console.warn(`[setLastSyncTime] Failed to save sync time for ${tableName}`);
  }
};

/**
 * Clears the last sync time for a table/tenant (forces full sync on next sync)
 */
const clearLastSyncTime = (tableName: string, tenantId: string): void => {
  try {
    const key = `lastSync_${tableName}_${tenantId}`;
    localStorage.removeItem(key);
  } catch {
    // localStorage may not be available
  }
};

type ReplaceFieldType<T, K extends keyof T, NewType> = Omit<T, K> & {
  [P in K]: NewType;
};

export type Survey = ReplaceFieldType<Schema['Surveys']['type'], 'content', BuildingSurveyFormData>;
export type UpdateSurvey = ReplaceFieldType<
  Schema['Surveys']['updateType'],
  'content',
  BuildingSurveyFormData
>;
export type CreateSurvey = ReplaceFieldType<
  Schema['Surveys']['createType'],
  'content',
  BuildingSurveyFormData
>;
export type DeleteSurvey = Schema['Surveys']['deleteType'];

export type Component = Omit<Schema['Components']['type'], 'element'>;
export type Element = Omit<Schema['Elements']['type'], 'components' | 'section'>;
export type Phrase = Schema['Phrases']['type'];
export type Section = Omit<Schema['Sections']['type'], 'elements'> & TableEntity;

// Template type for survey report templates
export type Template = {
  id: string;
  name: string;
  description: string;
  category: 'level2' | 'level3' | 'summary' | 'custom';
  content: string; // Handlebars template string
  version: number;
  createdBy: string;
  tags: string[];
  metadata?: {
    usageCount?: number;
    lastUsed?: string;
  };
} & TableEntity;

type TableEntity = {
  id: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: string;
  syncError?: string | undefined | null;
  tenantId: string;
};

export enum SyncStatus {
  Synced = 'synced',
  Draft = 'draft', // Used in other components
  Queued = 'queued',
  Failed = 'failed',
  PendingDelete = 'pending_delete',
  Archived = 'archived', // Used in ImageUploadStore
}

export interface DexieRemoteHandlers<T, TCreate, TUpdate> {
  /**
   * List records from remote. Supports optional `since` timestamp for delta sync.
   * When `since` is provided, should only return records updated after that timestamp.
   */
  list: (options?: { since?: string }) => Promise<T[] | Result<T[], Error>>;
  create: (data: TCreate) => Promise<T | Result<T, Error>>;
  update: (data: TUpdate) => Promise<T | Result<T, Error>>;
  delete: (id: string) => Promise<void | Result<string, Error>>;
  syncWithServer?: () => Promise<void>;
}

export interface DexieStore<T, TCreate> {
  useList: () => [boolean, T[]];
  useGet: (id: string) => [boolean, T | undefined];
  add: (
    data: Omit<TCreate, 'syncStatus' | 'createdAt' | 'updatedAt' | 'tenantId'>,
  ) => Promise<void>;
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

// Custom hook for auth and tenant management with retry logic
const useAuthAndTenant = () => {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 8;

    const initialize = async () => {
      try {
        // Wait for auth tokens with retry logic
        await getCurrentUser();
        console.debug('[useAuthAndTenant] Auth successful');

        if (mounted) {
          setAuthReady(true);
          setAuthSuccess(true);

          // Get tenant ID with fallback for new users
          const tid = await getCurrentTenantId();
          console.debug('[useAuthAndTenant] Tenant ID:', tid);

          if (!tid) {
            // For new users, set personal tenant as default
            console.debug('[useAuthAndTenant] No tenant found, initializing personal tenant');
            const user = await getCurrentUser();
            if (user?.userId) {
              setTenantId(user.userId);
            }
          } else {
            setTenantId(tid);
          }
        }
      } catch (error) {
        console.debug(
          `[useAuthAndTenant] Auth attempt ${retryCount + 1}/${maxRetries} failed:`,
          error,
        );

        if (mounted) {
          retryCount++;

          if (retryCount < maxRetries) {
            // Retry with exponential backoff
            const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 8000);
            setTimeout(initialize, delay);
          } else {
            // Max retries reached - mark as ready but failed
            console.error('[useAuthAndTenant] Auth initialization failed after all retries');
            setAuthReady(true);
            setAuthSuccess(false);
          }
        }
      }
    };

    // Start with a small delay to allow auth to settle
    const timeout = setTimeout(initialize, 500);

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, []);

  return { tenantId, authReady, authSuccess };
};

function CreateDexieHooks<
  T extends TableEntity,
  TCreate extends { id: string },
  TUpdate extends { id: string },
>(
  db: Dexie,
  tableName: string,
  remoteHandlers: DexieRemoteHandlers<T, TCreate, TUpdate>,
): DexieStore<T, TCreate> {
  const table = db.table<T>(tableName);
  const syncMutex = new Mutex();

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
      console.debug('[sync] Skipping sync - not online');
      return Err(new Error('Not online'));
    }

    console.debug(`[sync] Starting sync for ${tableName}`);
    const syncResult = await syncWithServer();
    if (syncResult.ok) {
      console.debug(`[sync] Sync completed successfully for ${tableName}`);
      return Ok(undefined);
    }

    console.error(`[sync] Error syncing ${tableName} with server:`, syncResult.val);
    return Err(new Error(syncResult.val.message));
  };

  const debounceSync = debounce(sync, 1000);

  const useList = (): [boolean, T[]] => {
    const { tenantId, authReady, authSuccess } = useAuthAndTenant();
    const [dataLoaded, setDataLoaded] = useState(false);
    const [initialSyncTriggered, setInitialSyncTriggered] = useState(false);

    // Separate effect for initial sync - runs once when auth is ready
    useEffect(() => {
      if (!authReady || !authSuccess || !tenantId || initialSyncTriggered) {
        return;
      }

      // Check if we have any local data using count() for efficiency
      const checkAndSync = async () => {
        try {
          const count = await table.where('tenantId').equals(tenantId).count();

          if (count === 0 && navigator.onLine) {
            setInitialSyncTriggered(true);
            console.debug(`[useList] No local data for ${tableName}, triggering initial sync`);
            syncWithServer().catch((err) =>
              console.error(`[useList] Initial sync failed for ${tableName}:`, err)
            );
          } else {
            // Mark as triggered even if we have data (no need to sync)
            setInitialSyncTriggered(true);
          }
        } catch (err) {
          console.error(`[useList] Error checking local data count for ${tableName}:`, err);
          setInitialSyncTriggered(true); // Prevent retry loops
        }
      };

      checkAndSync();
    }, [authReady, authSuccess, tenantId, initialSyncTriggered]);

    // Live query just fetches data - no side effects
    const data = useLiveQuery(async () => {
      if (!authReady || !authSuccess || !tenantId) {
        return [];
      }
      console.debug('[useList] Getting data', tenantId, authReady);
      const items = await table
        .where('tenantId')
        .equals(tenantId)
        .and((item) => item.syncStatus !== SyncStatus.PendingDelete)
        .toArray();

      // Mark data as loaded once we've queried the database
      setDataLoaded(true);

      return items;
    }, [tenantId, authReady, authSuccess]);

    // Only return hydrated=true when auth is successful AND data has been queried
    return [authReady && authSuccess && tenantId !== null && dataLoaded, data ?? []];
  };

  const useGet = (id: string): [boolean, T | undefined] => {
    const { tenantId, authReady, authSuccess } = useAuthAndTenant();
    const [dataQueried, setDataQueried] = useState(false);

    const result = useLiveQuery(async () => {
      if (!authReady || !authSuccess || !tenantId) return { value: undefined };
      const item = await getItem(id);

      // Mark as queried once we've attempted to get the item
      setDataQueried(true);

      return item && item.syncStatus !== SyncStatus.PendingDelete && item.tenantId === tenantId
        ? { value: item }
        : { value: undefined };
    }, [id, tenantId, authReady, authSuccess]);

    // Only return hydrated=true when auth is successful AND data has been queried
    return [authReady && authSuccess && tenantId !== null && dataQueried, result?.value];
  };

  const syncWithServer = async (): Promise<Result<void, Error>> => {
    // If already syncing, skip (non-blocking check to maintain original behavior)
    if (syncMutex.isLocked()) {
      console.debug(`[syncWithServer] Sync already in progress for ${tableName}, skipping`);
      return Ok(undefined);
    }

    // Use mutex to ensure only one sync runs at a time
    return await syncMutex.runExclusive(async () => {
      console.debug(`[syncWithServer] Starting sync for ${tableName}`);

      try {
        // Resolve tenant early; needed for all phases (deletes, merges, pushes)
        const tenantId = await getCurrentTenantId();
        if (!tenantId) {
          return Err(new Error('No tenant ID available'));
        }

        // Use custom sync handler if provided
        if (remoteHandlers.syncWithServer) {
          await remoteHandlers.syncWithServer();
          return Ok(undefined);
        }

        // Use compound index [tenantId+syncStatus] for efficient query
        const pendingDeletes = await table
          .where('[tenantId+syncStatus]')
          .equals([tenantId, SyncStatus.PendingDelete])
          .toArray();

        // Process deletes with concurrency control
        const deleteSuccessIds: string[] = [];
        const deleteFailedItems: T[] = [];
        const apiLimiter = createApiLimiter();

        // Process deletes concurrently with limit
        const deletePromises = pendingDeletes.map((item) =>
          apiLimiter(async () => {
            try {
              const deleteResult = await remoteHandlers.delete(item.id);
              if (deleteResult instanceof Ok || deleteResult === undefined) {
                deleteSuccessIds.push(item.id);
                console.debug(`[syncWithServer] Deleted item ${item.id} from ${tableName}`);
              } else {
                deleteFailedItems.push({
                  ...item,
                  syncStatus: SyncStatus.PendingDelete,
                  syncError: deleteResult.val.message,
                  updatedAt: new Date().toISOString(),
                } as T);
              }
            } catch (error) {
              console.error(`[syncWithServer] Failed to delete item ${item.id}:`, error);
              deleteFailedItems.push({
                ...item,
                syncStatus: SyncStatus.PendingDelete,
                syncError: error instanceof Error ? error.message : 'Failed to delete item',
                updatedAt: new Date().toISOString(),
              } as T);
            }
          }),
        );

        await Promise.allSettled(deletePromises);

        // Apply delete results atomically in a transaction
        if (deleteSuccessIds.length > 0 || deleteFailedItems.length > 0) {
          await db.transaction('rw', table, async () => {
            if (deleteSuccessIds.length > 0) {
              await table.bulkDelete(deleteSuccessIds);
            }
            if (deleteFailedItems.length > 0) {
              await table.bulkPut(deleteFailedItems);
            }
          });
        }

        // Get last sync time for delta sync
        const lastSyncTime = getLastSyncTime(tableName, tenantId);
        const syncStartTime = new Date().toISOString();

        // Fetch remote data - use delta sync if we have a lastSyncTime
        const remoteDataResult = await remoteHandlers.list(
          lastSyncTime ? { since: lastSyncTime } : undefined
        );

        let remoteData: T[];
        if (remoteDataResult instanceof Ok) {
          remoteData = remoteDataResult.val;
        } else if (Array.isArray(remoteDataResult)) {
          remoteData = remoteDataResult;
        } else {
          return Err(new Error('Failed to get remote data'));
        }

        const isDeltaSync = !!lastSyncTime;
        if (isDeltaSync) {
          console.debug(
            `[syncWithServer] Delta sync for ${tableName}: fetched ${remoteData.length} updated records since ${lastSyncTime}`
          );
        } else {
          console.debug(
            `[syncWithServer] Full sync for ${tableName}: fetched ${remoteData.length} total records`
          );
        }

        // tenantId already resolved above

        // Collect items to merge from remote - process in batch for efficiency
        const itemsToMerge: T[] = [];

        for (const remote of remoteData) {
          // Only process records for current tenant
          if ((remote as any).tenantId && (remote as any).tenantId !== tenantId) {
            continue;
          }
          const local = await getItem(remote.id);

          if (!local) {
            console.debug(`[syncWithServer] New item from server ${remote.id} in ${tableName}`);
            itemsToMerge.push({ ...remote, tenantId, syncStatus: SyncStatus.Synced } as T);
            continue;
          }

          if (local?.syncStatus === SyncStatus.PendingDelete) {
            console.debug('[syncWithServer] Skipping pending delete', remote);
            continue;
          }

          if (new Date(remote.updatedAt) > new Date(local.updatedAt)) {
            console.debug(
              `[syncWithServer] Updating ${remote.id} in ${tableName} with newer server version`,
            );
            itemsToMerge.push({ ...remote, tenantId, syncStatus: SyncStatus.Synced } as T);
            continue;
          }
        }

        // Apply remote data merge atomically in a transaction
        if (itemsToMerge.length > 0) {
          await db.transaction('rw', table, async () => {
            await table.bulkPut(itemsToMerge);
          });
          console.debug(`[syncWithServer] Merged ${itemsToMerge.length} items from server`);
        }

        // Process local queued/failed items using compound index
        const localRecords = await table
          .where('[tenantId+syncStatus]')
          .anyOf([
            [tenantId, SyncStatus.Queued],
            [tenantId, SyncStatus.Failed],
          ])
          .toArray();

        // Collect results for batch update
        const localUpdateResults: T[] = [];
        const localApiLimiter = createApiLimiter();

        /**
         * Marks a local record as successfully synced
         */
        const markSynced = (serverResult: T) => {
          localUpdateResults.push({
            ...serverResult,
            tenantId,
            syncStatus: SyncStatus.Synced,
          } as T);
        };

        /**
         * Marks a local record as failed to sync
         */
        const markFailed = (local: T, errorMessage: string) => {
          localUpdateResults.push({
            ...local,
            syncStatus: SyncStatus.Failed,
            syncError: errorMessage,
          } as T);
        };

        /**
         * Attempts to update an existing item on the server.
         * Returns the result or null if a non-retryable error occurred.
         */
        const tryUpdate = async (local: T): Promise<Result<T, Error>> => {
          return normalizeResult(
            await remoteHandlers.update({ ...local } as unknown as TUpdate)
          );
        };

        /**
         * Attempts to create a new item on the server.
         * Returns the result or null if a non-retryable error occurred.
         */
        const tryCreate = async (local: T): Promise<Result<T, Error>> => {
          return normalizeResult(
            await remoteHandlers.create({ ...local } as unknown as TCreate)
          );
        };

        /**
         * Process a local record: sync it to the server using create or update.
         * Uses create-first strategy for new items with automatic fallback to update
         * if the item already exists (handles delta sync edge cases).
         */
        const processLocalRecord = async (local: T) => {
          // Determine if item likely exists on server:
          // - If item was previously synced (createdAt !== updatedAt suggests edits happened)
          // - If item is in remoteData (from delta or full sync)
          const inRemoteData = remoteData.some((r) => r.id === local.id);
          const wasLikelyEdited = local.createdAt !== local.updatedAt;
          const likelyExists = inRemoteData || wasLikelyEdited;

          const operation = likelyExists ? 'update' : 'create';
          console.debug(`[syncWithServer] ${operation} ${local.id} in ${tableName}`);

          try {
            let result: Result<T, Error>;

            if (likelyExists) {
              // Try update first for items that likely exist
              result = await tryUpdate(local);
            } else {
              // Try create first for new items
              result = await tryCreate(local);

              // If create fails due to item already existing, retry as update
              if (!result.ok && isItemAlreadyExistsError(result.val)) {
                console.debug(`[syncWithServer] Item ${local.id} already exists, retrying as update`);
                result = await tryUpdate(local);
              }
            }

            if (result.ok) {
              markSynced(result.val);
            } else {
              markFailed(local, result.val.message ?? `Failed to ${operation} item`);
            }
          } catch (error: unknown) {
            console.debug(`[syncWithServer] Error syncing ${local.id}:`, error);

            // If create threw an exception for item already exists, retry as update
            if (isItemAlreadyExistsError(error)) {
              console.debug(`[syncWithServer] Item ${local.id} already exists (exception), retrying as update`);
              try {
                const updateResult = await tryUpdate(local);
                if (updateResult.ok) {
                  markSynced(updateResult.val);
                  return;
                }
                markFailed(local, updateResult.val.message ?? 'Failed to update item');
                return;
              } catch (updateError: unknown) {
                console.debug(`[syncWithServer] Update retry for ${local.id} also failed:`, updateError);
                markFailed(local, (updateError as Error).message || 'Update retry failed');
                return;
              }
            }

            markFailed(local, (error as Error).message || String(error) || 'Unknown error');
          }
        };

        // Process local records concurrently with limit
        const localPromises = localRecords.map((local) =>
          localApiLimiter(async () => {
            console.debug(`[syncWithServer] Processing local record ${local.id}`);
            await processLocalRecord(local);
          }),
        );

        await Promise.allSettled(localPromises);

        // Apply local record updates atomically in a transaction
        if (localUpdateResults.length > 0) {
          await db.transaction('rw', table, async () => {
            await table.bulkPut(localUpdateResults);
          });
          console.debug(`[syncWithServer] Updated ${localUpdateResults.length} local records`);
        }

        // Update last sync time on successful sync
        setLastSyncTime(tableName, tenantId, syncStartTime);

        console.debug(
          `[syncWithServer] Successfully synced ${tableName} - Processed ${localRecords.length} local items and ${remoteData.length} remote items`,
        );
        return Ok(undefined);
      } catch (error: any) {
        console.error(`[syncWithServer] Error syncing ${tableName}:`, error);
        return Err(new Error(getErrorMessage(error)));
      }
    });
  };

  const get = async (id: string) => {
    const local = await getItem(id);
    if (!local || local.syncStatus === SyncStatus.PendingDelete) {
      console.debug('[get] Item not found with id: ' + id);
      return null;
    }

    return local;
  };

  const add = async (
    data: Omit<TCreate, 'syncStatus' | 'createdAt' | 'updatedAt' | 'tenantId'>,
  ) => {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return;
    await table.add({
      ...data,
      syncStatus: SyncStatus.Queued,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tenantId: tenantId,
    } as unknown as T);

    // Trigger sync asynchronously if online
    debounceSync();
  };

  const update = async (id: string, updateFn: (currentState: Draft<T>) => void) => {
    const local = await getItem(id);
    if (!local) {
      throw new Error('Item not found');
    }

    if (local.syncStatus === SyncStatus.PendingDelete) {
      throw new Error('Cannot update a deleted item');
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
      console.debug('[remove] Item removed', id);
    } else {
      console.error('[remove] Item not found', id);
    }
  };

  const removeAll = async (deleteRemote: boolean = true) => {
    if (deleteRemote) {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) return;

      // Mark all items for deletion using bulk operation
      const items = await table.where('tenantId').equals(tenantId).toArray();
      const updates = items.map((item) => ({
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
      if (navigator.onLine && !syncMutex.isLocked()) {
        try {
          await syncWithServer();
        } catch (error) {
          console.error('[startPeriodicSync] Error during periodic sync:', error);
        }
      }
    }, intervalMs);

    return () => clearInterval(interval);
  };

  /**
   * Sync with retry and exponential backoff for transient errors
   * @param maxRetries - Maximum number of retry attempts (default 3)
   */
  const syncWithRetry = async (maxRetries = 3): Promise<Result<void, Error>> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const result = await syncWithServer();

      if (result.ok) {
        if (attempt > 0) {
          console.debug(`[syncWithRetry] Sync succeeded on attempt ${attempt + 1} for ${tableName}`);
        }
        return result;
      }

      lastError = result.val;

      // Don't retry non-retryable errors
      if (!isRetryableError(lastError)) {
        console.debug(`[syncWithRetry] Non-retryable error for ${tableName}:`, lastError.message);
        return result;
      }

      // Don't delay after last attempt
      if (attempt < maxRetries) {
        const backoffMs = getBackoffDelay(attempt);
        console.debug(
          `[syncWithRetry] Retrying ${tableName} in ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries})`,
        );
        await delay(backoffMs);
      }
    }

    console.error(`[syncWithRetry] All ${maxRetries + 1} attempts failed for ${tableName}`);
    return Err(lastError || new Error('Sync failed after all retries'));
  };

  const forceSync = async (): Promise<Result<void, Error>> => {
    console.debug(`[forceSync] Starting forced sync for ${tableName}`);

    // Reset all failed items to try again
    const tenantId = await getCurrentTenantId();
    if (tenantId) {
      // Use compound index for efficient query
      const failedItems = await table
        .where('[tenantId+syncStatus]')
        .equals([tenantId, SyncStatus.Failed])
        .toArray();

      if (failedItems.length > 0) {
        const updates = failedItems.map((item) => ({
          ...item,
          syncStatus: SyncStatus.Queued,
          syncError: undefined,
          updatedAt: new Date().toISOString(),
        }));

        await table.bulkPut(updates);
        console.debug(`[forceSync] Reset ${failedItems.length} failed items in ${tableName}`);
      }
    }

    // Use retry with backoff for force sync
    return await syncWithRetry();
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
    forceSync,
  };
}

const db = new Dexie('Surveys') as Dexie & {
  surveys: EntityTable<Survey, 'id', 'tenantId'>;
  components: EntityTable<Component, 'id', 'tenantId'>;
  elements: EntityTable<Element, 'id', 'tenantId'>;
  phrases: EntityTable<Phrase, 'id', 'tenantId'>;
  sections: EntityTable<Section, 'id', 'tenantId'>;
  imageMetadata: EntityTable<ImageMetadata, 'id', 'tenantId'>;
  templates: EntityTable<Template, 'id', 'tenantId'>;
};

// Version 2: Initial schema (kept for upgrade path)
db.version(2).stores({
  surveys: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  components: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  elements: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  phrases: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  sections: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  imageUploads: 'id, tenantId, path, updatedAt, syncStatus, [tenantId+updatedAt]',
  imageMetadata: 'id, tenantId, imagePath, updatedAt, syncStatus, [tenantId+updatedAt]',
});

db.version(21).upgrade(async (tx) => {
  console.log('[Dexie] Upgrading phrases...');
  return tx
    .table<Phrase, 'id', 'tenantId'>('phrases')
    .toCollection()
    .modify((phrase) => {
      delete (phrase as any)['associatedMaterialIds'];
      delete (phrase as any)['associatedElementIds'];
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
  imageMetadata:
    'id, tenantId, imagePath, uploadStatus, isArchived, updatedAt, syncStatus, [tenantId+updatedAt], [tenantId+uploadStatus], [tenantId+isArchived]',
});

// Version 23: Remove imageUploads table (migrated to imageMetadata)
db.version(23).stores({
  surveys: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  components: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  elements: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  phrases: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  sections: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  imageMetadata:
    'id, tenantId, imagePath, uploadStatus, isArchived, updatedAt, syncStatus, [tenantId+updatedAt], [tenantId+uploadStatus], [tenantId+isArchived]',
  // imageUploads table removed in v23
});

// Version 24: Add isDeleted soft-delete flag and indexes
db.version(24).stores({
  surveys: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  components: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  elements: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  phrases: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  sections: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  imageMetadata:
    'id, tenantId, imagePath, uploadStatus, isArchived, isDeleted, updatedAt, syncStatus, [tenantId+updatedAt], [tenantId+uploadStatus], [tenantId+isArchived], [tenantId+isDeleted]',
});

// Version 25: Add templates table for report templates
db.version(25).stores({
  surveys: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  components: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  elements: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  phrases: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  sections: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt]',
  imageMetadata:
    'id, tenantId, imagePath, uploadStatus, isArchived, isDeleted, updatedAt, syncStatus, [tenantId+updatedAt], [tenantId+uploadStatus], [tenantId+isArchived], [tenantId+isDeleted]',
  templates: 'id, tenantId, category, updatedAt, syncStatus, [tenantId+updatedAt], [tenantId+category]',
});

// Version 26: Add compound index [tenantId+syncStatus] for efficient sync queries
db.version(26).stores({
  surveys: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt], [tenantId+syncStatus]',
  components: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt], [tenantId+syncStatus]',
  elements: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt], [tenantId+syncStatus]',
  phrases: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt], [tenantId+syncStatus]',
  sections: 'id, tenantId, updatedAt, syncStatus, [tenantId+updatedAt], [tenantId+syncStatus]',
  imageMetadata:
    'id, tenantId, imagePath, uploadStatus, isArchived, isDeleted, updatedAt, syncStatus, [tenantId+updatedAt], [tenantId+uploadStatus], [tenantId+isArchived], [tenantId+isDeleted], [tenantId+syncStatus]',
  templates: 'id, tenantId, category, updatedAt, syncStatus, [tenantId+updatedAt], [tenantId+category], [tenantId+syncStatus]',
});

export { db, CreateDexieHooks };
