import { Result, Ok, Err } from 'ts-results';
import {
  surveyStore,
  componentStore,
  elementStore,
  phraseStore,
  sectionStore,
  imageMetadataStore,
} from './Database';
import { enhancedImageStore } from './enhancedImageMetadataStore';

/**
 * Delay between syncing each store to prevent API throttling
 */
const INTER_STORE_DELAY_MS = 100;

/**
 * Default periodic sync interval (5 minutes)
 */
const DEFAULT_PERIODIC_SYNC_INTERVAL_MS = 300000;

/**
 * Delay helper
 */
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * SyncCoordinator - Centralized sync management
 *
 * Provides:
 * - Promise deduplication for concurrent syncAll() calls
 * - Sequential store syncing with delays to prevent API throttling
 * - Single periodic sync interval for all stores
 * - Online/offline event handling
 */
class SyncCoordinator {
  private syncPromise: Promise<Result<void, Error>> | null = null;
  private periodicSyncInterval: ReturnType<typeof setInterval> | null = null;
  private isOnlineHandlerAttached = false;

  /**
   * All stores that need to be synced
   */
  private readonly stores = [
    { name: 'surveys', store: surveyStore },
    { name: 'components', store: componentStore },
    { name: 'elements', store: elementStore },
    { name: 'phrases', store: phraseStore },
    { name: 'sections', store: sectionStore },
    { name: 'imageMetadata', store: imageMetadataStore },
  ];

  /**
   * Sync all stores with promise deduplication
   * If a sync is already in progress, returns the existing promise
   */
  async syncAll(): Promise<Result<void, Error>> {
    // Deduplicate concurrent calls
    if (this.syncPromise) {
      console.debug('[SyncCoordinator] Sync already in progress, returning existing promise');
      return this.syncPromise;
    }

    if (!navigator.onLine) {
      console.debug('[SyncCoordinator] Skipping sync - offline');
      return Ok(undefined);
    }

    console.debug('[SyncCoordinator] Starting coordinated sync for all stores');
    this.syncPromise = this.performSync();

    try {
      return await this.syncPromise;
    } finally {
      this.syncPromise = null;
    }
  }

  /**
   * Perform the actual sync operation sequentially with delays
   */
  private async performSync(): Promise<Result<void, Error>> {
    const errors: string[] = [];
    const startTime = Date.now();

    for (let i = 0; i < this.stores.length; i++) {
      const { name, store } = this.stores[i];

      try {
        console.debug(`[SyncCoordinator] Syncing ${name}...`);
        const result = await store.forceSync();

        if (!result.ok) {
          console.error(`[SyncCoordinator] Failed to sync ${name}:`, result.val);
          errors.push(`${name}: ${result.val.message}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[SyncCoordinator] Error syncing ${name}:`, error);
        errors.push(`${name}: ${message}`);
      }

      // Add delay between stores (but not after the last one)
      if (i < this.stores.length - 1) {
        await delay(INTER_STORE_DELAY_MS);
      }
    }

    const duration = Date.now() - startTime;
    console.debug(`[SyncCoordinator] Sync completed in ${duration}ms`);

    if (errors.length > 0) {
      return Err(new Error(`Sync failed for: ${errors.join('; ')}`));
    }

    return Ok(undefined);
  }

  /**
   * Handle enhanced image store operations (uploads, retries)
   */
  async syncImageUploads(): Promise<void> {
    if (!navigator.onLine) {
      console.debug('[SyncCoordinator] Skipping image sync - offline');
      return;
    }

    try {
      await enhancedImageStore.syncPendingUploads();
      await enhancedImageStore.retryFailedUploads();
    } catch (error) {
      console.error('[SyncCoordinator] Error syncing image uploads:', error);
    }
  }

  /**
   * Start periodic sync with single coordinated interval
   * @param intervalMs - Sync interval in milliseconds (default 5 minutes)
   * @returns Cleanup function to stop periodic sync
   */
  startPeriodicSync(intervalMs: number = DEFAULT_PERIODIC_SYNC_INTERVAL_MS): () => void {
    // Clear any existing interval
    this.stopPeriodicSync();

    console.debug(`[SyncCoordinator] Starting periodic sync with ${intervalMs}ms interval`);

    this.periodicSyncInterval = setInterval(async () => {
      if (navigator.onLine && !this.syncPromise) {
        console.debug('[SyncCoordinator] Running periodic sync');
        await this.syncAll();
      }
    }, intervalMs);

    return () => this.stopPeriodicSync();
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync(): void {
    if (this.periodicSyncInterval) {
      clearInterval(this.periodicSyncInterval);
      this.periodicSyncInterval = null;
      console.debug('[SyncCoordinator] Stopped periodic sync');
    }
  }

  /**
   * Handle coming online - trigger immediate sync
   */
  handleOnline = async (): Promise<void> => {
    console.debug('[SyncCoordinator] Device came online, triggering sync');
    await this.syncAll();
    await this.syncImageUploads();
  };

  /**
   * Handle going offline - just log for now
   */
  handleOffline = (): void => {
    console.debug('[SyncCoordinator] Device went offline');
  };

  /**
   * Attach online/offline event handlers
   * @returns Cleanup function to remove handlers
   */
  attachNetworkHandlers(): () => void {
    if (this.isOnlineHandlerAttached) {
      console.debug('[SyncCoordinator] Network handlers already attached');
      return () => this.detachNetworkHandlers();
    }

    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    this.isOnlineHandlerAttached = true;

    console.debug('[SyncCoordinator] Network handlers attached');

    return () => this.detachNetworkHandlers();
  }

  /**
   * Detach online/offline event handlers
   */
  detachNetworkHandlers(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.isOnlineHandlerAttached = false;
    console.debug('[SyncCoordinator] Network handlers detached');
  }

  /**
   * Initialize the coordinator with periodic sync and network handlers
   * @param intervalMs - Periodic sync interval (default 5 minutes)
   * @returns Cleanup function
   */
  initialize(intervalMs: number = DEFAULT_PERIODIC_SYNC_INTERVAL_MS): () => void {
    console.debug('[SyncCoordinator] Initializing...');

    const cleanupPeriodic = this.startPeriodicSync(intervalMs);
    const cleanupNetwork = this.attachNetworkHandlers();

    return () => {
      cleanupPeriodic();
      cleanupNetwork();
      console.debug('[SyncCoordinator] Cleanup complete');
    };
  }

  /**
   * Check if a sync is currently in progress
   */
  isSyncing(): boolean {
    return this.syncPromise !== null;
  }
}

// Export singleton instance
export const syncCoordinator = new SyncCoordinator();

// Export class for testing
export { SyncCoordinator };

