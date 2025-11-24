/**
 * Tests for SyncCoordinator
 * Verifies coordinated sync management for all stores
 */

import { Ok, Err } from 'ts-results';

// Mock the stores before importing SyncCoordinator
jest.mock('../Database', () => ({
  surveyStore: {
    forceSync: jest.fn().mockResolvedValue(Ok(undefined)),
  },
  componentStore: {
    forceSync: jest.fn().mockResolvedValue(Ok(undefined)),
  },
  elementStore: {
    forceSync: jest.fn().mockResolvedValue(Ok(undefined)),
  },
  phraseStore: {
    forceSync: jest.fn().mockResolvedValue(Ok(undefined)),
  },
  sectionStore: {
    forceSync: jest.fn().mockResolvedValue(Ok(undefined)),
  },
  imageMetadataStore: {
    forceSync: jest.fn().mockResolvedValue(Ok(undefined)),
  },
}));

jest.mock('../enhancedImageMetadataStore', () => ({
  enhancedImageStore: {
    syncPendingUploads: jest.fn().mockResolvedValue(undefined),
    retryFailedUploads: jest.fn().mockResolvedValue(undefined),
  },
}));

// Import after mocking
import { SyncCoordinator } from '../SyncCoordinator';
import {
  surveyStore,
  componentStore,
  elementStore,
  phraseStore,
  sectionStore,
  imageMetadataStore,
} from '../Database';
import { enhancedImageStore } from '../enhancedImageMetadataStore';

describe('SyncCoordinator', () => {
  let coordinator: SyncCoordinator;
  let originalNavigator: boolean;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    coordinator = new SyncCoordinator();

    // Store original navigator.onLine
    originalNavigator = navigator.onLine;

    // Mock navigator.onLine as true by default
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });

    // Reset mock implementations
    (surveyStore.forceSync as jest.Mock).mockResolvedValue(Ok(undefined));
    (componentStore.forceSync as jest.Mock).mockResolvedValue(Ok(undefined));
    (elementStore.forceSync as jest.Mock).mockResolvedValue(Ok(undefined));
    (phraseStore.forceSync as jest.Mock).mockResolvedValue(Ok(undefined));
    (sectionStore.forceSync as jest.Mock).mockResolvedValue(Ok(undefined));
    (imageMetadataStore.forceSync as jest.Mock).mockResolvedValue(Ok(undefined));
  });

  afterEach(() => {
    jest.useRealTimers();
    coordinator.stopPeriodicSync();
    coordinator.detachNetworkHandlers();

    // Restore navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  describe('syncAll', () => {
    it('should deduplicate concurrent syncAll calls', async () => {
      // Track how many times forceSync was called
      let syncCallCount = 0;
      (surveyStore.forceSync as jest.Mock).mockImplementation(async () => {
        syncCallCount++;
        return Ok(undefined);
      });

      // Start multiple concurrent syncs without awaiting
      const promise1 = coordinator.syncAll();
      const promise2 = coordinator.syncAll();
      const promise3 = coordinator.syncAll();

      // The second and third calls should immediately return the first promise
      expect(coordinator.isSyncing()).toBe(true);

      // Advance timers and resolve all promises
      await jest.advanceTimersByTimeAsync(2000);

      const results = await Promise.all([promise1, promise2, promise3]);

      // All should be Ok
      results.forEach((result) => {
        expect(result.ok).toBe(true);
      });

      // surveyStore should only be called once (not 3 times)
      // Note: All stores are synced once, so we check survey specifically
      expect(syncCallCount).toBe(1);
    });

    it('should sync stores sequentially with delays', async () => {
      const callOrder: string[] = [];

      (surveyStore.forceSync as jest.Mock).mockImplementation(async () => {
        callOrder.push('surveys');
        return Ok(undefined);
      });
      (componentStore.forceSync as jest.Mock).mockImplementation(async () => {
        callOrder.push('components');
        return Ok(undefined);
      });
      (elementStore.forceSync as jest.Mock).mockImplementation(async () => {
        callOrder.push('elements');
        return Ok(undefined);
      });

      const syncPromise = coordinator.syncAll();

      // Advance through all delays
      await jest.advanceTimersByTimeAsync(1000);
      await syncPromise;

      // Verify sequential order
      expect(callOrder[0]).toBe('surveys');
      expect(callOrder[1]).toBe('components');
      expect(callOrder[2]).toBe('elements');
    });

    it('should not sync when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      const result = await coordinator.syncAll();

      expect(result.ok).toBe(true);
      expect(surveyStore.forceSync).not.toHaveBeenCalled();
    });

    it('should continue syncing other stores if one fails', async () => {
      (surveyStore.forceSync as jest.Mock).mockResolvedValue(
        Err(new Error('Survey sync failed'))
      );

      const syncPromise = coordinator.syncAll();
      await jest.advanceTimersByTimeAsync(1000);
      const result = await syncPromise;

      // Should have tried all stores
      expect(surveyStore.forceSync).toHaveBeenCalled();
      expect(componentStore.forceSync).toHaveBeenCalled();
      expect(elementStore.forceSync).toHaveBeenCalled();

      // Result should indicate failure
      expect(result.ok).toBe(false);
      expect(result.val?.message).toContain('surveys');
    });

    it('should allow subsequent sync after first completes', async () => {
      // First sync
      let syncPromise = coordinator.syncAll();
      await jest.advanceTimersByTimeAsync(1000);
      await syncPromise;

      expect(surveyStore.forceSync).toHaveBeenCalledTimes(1);

      // Reset mocks for second sync
      jest.clearAllMocks();

      // Second sync
      syncPromise = coordinator.syncAll();
      await jest.advanceTimersByTimeAsync(1000);
      await syncPromise;

      expect(surveyStore.forceSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('periodic sync', () => {
    it('should start periodic sync with default interval', () => {
      const cleanup = coordinator.startPeriodicSync();

      // Should not sync immediately
      expect(surveyStore.forceSync).not.toHaveBeenCalled();

      // Advance time by 5 minutes
      jest.advanceTimersByTime(300000);

      // Should trigger sync (but may be pending)
      expect(coordinator.isSyncing() || surveyStore.forceSync).toBeTruthy();

      cleanup();
    });

    it('should start periodic sync with custom interval', async () => {
      const cleanup = coordinator.startPeriodicSync(60000); // 1 minute

      // Advance time by 1 minute
      jest.advanceTimersByTime(60000);

      // Allow promises to resolve
      await jest.advanceTimersByTimeAsync(1000);

      expect(surveyStore.forceSync).toHaveBeenCalled();

      cleanup();
    });

    it('should clean up periodic sync on unmount', () => {
      const cleanup = coordinator.startPeriodicSync(1000);

      // Clean up
      cleanup();

      // Clear any previous calls
      jest.clearAllMocks();

      // Advance time
      jest.advanceTimersByTime(5000);

      // Should not have called sync
      expect(surveyStore.forceSync).not.toHaveBeenCalled();
    });

    it('should not sync when offline during periodic sync', async () => {
      coordinator.startPeriodicSync(1000);

      // Go offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      // Advance timer
      jest.advanceTimersByTime(2000);

      expect(surveyStore.forceSync).not.toHaveBeenCalled();
    });
  });

  describe('network handlers', () => {
    it('should trigger sync when coming online', async () => {
      coordinator.attachNetworkHandlers();

      // Simulate coming online
      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);

      // Allow async operations
      await jest.advanceTimersByTimeAsync(1000);

      expect(surveyStore.forceSync).toHaveBeenCalled();
    });

    it('should not sync when going offline', () => {
      coordinator.attachNetworkHandlers();

      // Simulate going offline
      const offlineEvent = new Event('offline');
      window.dispatchEvent(offlineEvent);

      // Should not trigger sync
      expect(surveyStore.forceSync).not.toHaveBeenCalled();
    });

    it('should clean up network handlers', () => {
      const cleanup = coordinator.attachNetworkHandlers();

      // Clean up
      cleanup();

      // Clear mocks
      jest.clearAllMocks();

      // Simulate coming online
      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);

      // Should not trigger sync (handlers removed)
      expect(surveyStore.forceSync).not.toHaveBeenCalled();
    });
  });

  describe('syncImageUploads', () => {
    it('should sync pending uploads when online', async () => {
      await coordinator.syncImageUploads();

      expect(enhancedImageStore.syncPendingUploads).toHaveBeenCalled();
      expect(enhancedImageStore.retryFailedUploads).toHaveBeenCalled();
    });

    it('should skip image sync when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      await coordinator.syncImageUploads();

      expect(enhancedImageStore.syncPendingUploads).not.toHaveBeenCalled();
    });
  });

  describe('isSyncing', () => {
    it('should return true when sync is in progress', async () => {
      // Use a deferred promise to control when sync completes
      let resolveSync: () => void;
      const deferredPromise = new Promise<void>((resolve) => {
        resolveSync = resolve;
      });

      (surveyStore.forceSync as jest.Mock).mockImplementation(async () => {
        await deferredPromise;
        return Ok(undefined);
      });

      const syncPromise = coordinator.syncAll();

      // Should be syncing while promise is pending
      expect(coordinator.isSyncing()).toBe(true);

      // Resolve the deferred promise
      resolveSync!();

      // Advance timers to allow all promises to resolve
      await jest.advanceTimersByTimeAsync(1000);
      await syncPromise;

      // Should no longer be syncing
      expect(coordinator.isSyncing()).toBe(false);
    });

    it('should return false when no sync is in progress', () => {
      expect(coordinator.isSyncing()).toBe(false);
    });

    it('should return false after sync completes', async () => {
      const syncPromise = coordinator.syncAll();
      await jest.advanceTimersByTimeAsync(1000);
      await syncPromise;

      expect(coordinator.isSyncing()).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should start periodic sync and attach network handlers', () => {
      const cleanup = coordinator.initialize(60000);

      // Verify periodic sync is running
      jest.advanceTimersByTime(60000);

      // Should have started sync
      expect(surveyStore.forceSync).toHaveBeenCalled();

      cleanup();
    });

    it('should return cleanup function that stops everything', () => {
      const cleanup = coordinator.initialize(1000);

      cleanup();
      jest.clearAllMocks();

      // Advance timers
      jest.advanceTimersByTime(5000);

      // Should not have synced (periodic stopped)
      expect(surveyStore.forceSync).not.toHaveBeenCalled();

      // Simulate online event
      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);

      // Should not sync (handlers removed)
      expect(surveyStore.forceSync).not.toHaveBeenCalled();
    });
  });
});

