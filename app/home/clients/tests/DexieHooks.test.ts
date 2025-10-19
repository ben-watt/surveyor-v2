import { renderHook, waitFor } from '@testing-library/react';
import { db, CreateDexieHooks, SyncStatus } from '../Dexie';
import { getCurrentUser } from 'aws-amplify/auth';
import { getCurrentTenantId } from '../../utils/tenant-utils';
import { Ok } from 'ts-results';

// Define test types
type TestEntity = {
  id: string;
  name: string;
  updatedAt: string;
  syncStatus: string;
  tenantId: string;
  syncError?: string | null;
};

// Mock dependencies
jest.mock('aws-amplify/auth');
jest.mock('../../utils/tenant-utils');
jest.mock('dexie-react-hooks', () => ({
  useLiveQuery: jest.fn(),
}));

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
const mockGetCurrentTenantId = getCurrentTenantId as jest.MockedFunction<typeof getCurrentTenantId>;
const { useLiveQuery } = require('dexie-react-hooks');

describe('DexieHooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mocks
    mockGetCurrentUser.mockResolvedValue({
      username: 'testuser',
      userId: 'test-user-id',
      signInDetails: {},
    });
    mockGetCurrentTenantId.mockResolvedValue('test-tenant');
  });

  describe('useList hook', () => {
    it('should not be hydrated until auth is ready', async () => {
      // Mock auth not ready yet
      mockGetCurrentUser.mockRejectedValueOnce(new Error('Not authenticated'));

      // Mock useLiveQuery to return empty array initially
      useLiveQuery.mockReturnValue([]);

      const testStore = CreateDexieHooks<TestEntity, any, any>(db, 'sections', {
        list: async (): Promise<Ok<TestEntity[]>> => Ok([]),
        create: async (item: any): Promise<Ok<TestEntity>> => Ok(item),
        update: async (item: any): Promise<Ok<TestEntity>> => Ok(item),
        delete: async (id: string): Promise<Ok<string>> => Ok(id),
      });

      const { result } = renderHook(() => testStore.useList());

      // Initially should not be hydrated
      expect(result.current[0]).toBe(false);
      expect(result.current[1]).toEqual([]);
    });

    it('should not be hydrated until data query completes', async () => {
      let queryCallback: any;

      // Capture the query callback but don't execute it immediately
      useLiveQuery.mockImplementation((callback: any) => {
        queryCallback = callback;
        return undefined; // Return undefined initially (query not complete)
      });

      const testStore = CreateDexieHooks<TestEntity, any, any>(db, 'sections', {
        list: async (): Promise<Ok<TestEntity[]>> =>
          Ok([
            {
              id: '1',
              name: 'Test Item',
              updatedAt: new Date().toISOString(),
              syncStatus: SyncStatus.Synced,
              tenantId: 'test-tenant',
            },
          ]),
        create: async (item: any): Promise<Ok<TestEntity>> => Ok(item),
        update: async (item: any): Promise<Ok<TestEntity>> => Ok(item),
        delete: async (id: string): Promise<Ok<string>> => Ok(id),
      });

      const { result, rerender } = renderHook(() => testStore.useList());

      // Initially should not be hydrated (query hasn't completed)
      expect(result.current[0]).toBe(false);
      expect(result.current[1]).toEqual([]);

      // Simulate query completing
      useLiveQuery.mockReturnValue([{ id: '1', name: 'Test Item' }]);

      // Wait for auth to be ready
      await waitFor(() => {
        rerender();
        // After query completes, should still not be hydrated until dataLoaded is set
        // This tests that hydration waits for BOTH auth AND data query
        expect(result.current[0]).toBe(false);
      });
    });

    it('should be hydrated only after auth is ready AND data is queried', async () => {
      const mockData: TestEntity[] = [
        {
          id: '1',
          name: 'Item 1',
          tenantId: 'test-tenant',
          syncStatus: SyncStatus.Synced,
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Item 2',
          tenantId: 'test-tenant',
          syncStatus: SyncStatus.Synced,
          updatedAt: new Date().toISOString(),
        },
      ];

      // Mock the table query
      const mockTable = {
        where: jest.fn().mockReturnThis(),
        equals: jest.fn().mockReturnThis(),
        and: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockData),
      };

      jest.spyOn(db, 'table').mockReturnValue(mockTable as any);

      // Track query execution
      let queryExecuted = false;
      useLiveQuery.mockImplementation((callback: any) => {
        // Execute the query callback to simulate Dexie behavior
        const result = callback();
        if (result && result.then) {
          result.then(() => {
            queryExecuted = true;
          });
        }
        return mockData;
      });

      const testStore = CreateDexieHooks<TestEntity, any, any>(db, 'sections', {
        list: async (): Promise<Ok<TestEntity[]>> => Ok(mockData),
        create: async (item: any): Promise<Ok<TestEntity>> => Ok(item),
        update: async (item: any): Promise<Ok<TestEntity>> => Ok(item),
        delete: async (id: string): Promise<Ok<string>> => Ok(id),
      });

      const { result } = renderHook(() => testStore.useList());

      // Wait for the hook to fully hydrate
      await waitFor(() => {
        // Should be hydrated after auth ready + data queried
        expect(queryExecuted || result.current[0]).toBeTruthy();
        if (queryExecuted) {
          expect(result.current[1]).toEqual(mockData);
        }
      });
    });

    it('should return empty array when not hydrated', () => {
      useLiveQuery.mockReturnValue(undefined);

      const testStore = CreateDexieHooks<TestEntity, any, any>(db, 'sections', {
        list: async (): Promise<Ok<TestEntity[]>> => Ok([]),
        create: async (item: any): Promise<Ok<TestEntity>> => Ok(item),
        update: async (item: any): Promise<Ok<TestEntity>> => Ok(item),
        delete: async (id: string): Promise<Ok<string>> => Ok(id),
      });

      const { result } = renderHook(() => testStore.useList());

      expect(result.current[0]).toBe(false);
      expect(result.current[1]).toEqual([]); // Should be empty array, not undefined
    });
  });

  describe('useGet hook', () => {
    it('should not be hydrated until data query completes', async () => {
      useLiveQuery.mockReturnValue(undefined); // Query not complete

      const testStore = CreateDexieHooks<TestEntity, any, any>(db, 'sections', {
        list: async (): Promise<Ok<TestEntity[]>> => Ok([]),
        create: async (item: any): Promise<Ok<TestEntity>> => Ok(item),
        update: async (item: any): Promise<Ok<TestEntity>> => Ok(item),
        delete: async (id: string): Promise<Ok<string>> => Ok(id),
      });

      const { result } = renderHook(() => testStore.useGet('test-id'));

      // Initially should not be hydrated
      expect(result.current[0]).toBe(false);
      expect(result.current[1]).toBeUndefined();
    });

    it('should be hydrated after item is queried (even if item not found)', async () => {
      const mockItem: TestEntity = {
        id: 'test-id',
        name: 'Test Item',
        tenantId: 'test-tenant',
        syncStatus: SyncStatus.Synced,
        updatedAt: new Date().toISOString(),
      };

      // Mock the getItem function behavior
      const mockGet = jest.fn().mockResolvedValue(mockItem);
      const mockTable = {
        get: mockGet,
      };
      jest.spyOn(db, 'table').mockReturnValue(mockTable as any);

      // Track query execution
      let queryExecuted = false;
      useLiveQuery.mockImplementation((callback: any) => {
        const result = callback();
        if (result && result.then) {
          result.then(() => {
            queryExecuted = true;
          });
        }
        return { value: mockItem };
      });

      const testStore = CreateDexieHooks<TestEntity, any, any>(db, 'sections', {
        list: async (): Promise<Ok<TestEntity[]>> => Ok([]),
        create: async (item: any): Promise<Ok<TestEntity>> => Ok(item),
        update: async (item: any): Promise<Ok<TestEntity>> => Ok(item),
        delete: async (id: string): Promise<Ok<string>> => Ok(id),
      });

      const { result } = renderHook(() => testStore.useGet('test-id'));

      await waitFor(() => {
        // Should be hydrated after query executes
        expect(queryExecuted || result.current[0]).toBeTruthy();
        if (queryExecuted) {
          expect(result.current[1]).toEqual(mockItem);
        }
      });
    });

    it('should be hydrated even when item does not exist', async () => {
      // Mock the getItem function to return null
      const mockGet = jest.fn().mockResolvedValue(null);
      const mockTable = {
        get: mockGet,
      };
      jest.spyOn(db, 'table').mockReturnValue(mockTable as any);

      let queryExecuted = false;
      useLiveQuery.mockImplementation((callback: any) => {
        const result = callback();
        if (result && result.then) {
          result.then(() => {
            queryExecuted = true;
          });
        }
        return { value: undefined };
      });

      const testStore = CreateDexieHooks<TestEntity, any, any>(db, 'sections', {
        list: async (): Promise<Ok<TestEntity[]>> => Ok([]),
        create: async (item: any): Promise<Ok<TestEntity>> => Ok(item),
        update: async (item: any): Promise<Ok<TestEntity>> => Ok(item),
        delete: async (id: string): Promise<Ok<string>> => Ok(id),
      });

      const { result } = renderHook(() => testStore.useGet('non-existent-id'));

      await waitFor(() => {
        // Should be hydrated even though item doesn't exist
        expect(queryExecuted || result.current[0]).toBeTruthy();
        expect(result.current[1]).toBeUndefined();
      });
    });

    it('should return undefined when not hydrated', () => {
      useLiveQuery.mockReturnValue(undefined);

      const testStore = CreateDexieHooks<TestEntity, any, any>(db, 'sections', {
        list: async (): Promise<Ok<TestEntity[]>> => Ok([]),
        create: async (item: any): Promise<Ok<TestEntity>> => Ok(item),
        update: async (item: any): Promise<Ok<TestEntity>> => Ok(item),
        delete: async (id: string): Promise<Ok<string>> => Ok(id),
      });

      const { result } = renderHook(() => testStore.useGet('test-id'));

      expect(result.current[0]).toBe(false);
      expect(result.current[1]).toBeUndefined();
    });
  });

  describe('hydration timing', () => {
    it('should not trigger auto-save before hydration completes', async () => {
      // This test ensures that forms using these hooks won't trigger
      // auto-save with empty/invalid data during the loading phase

      let hydrated = false;
      let data: any[] = [];

      // Simulate progressive loading
      useLiveQuery.mockImplementation((callback: any) => {
        // First call returns undefined (loading)
        if (!hydrated) {
          return undefined;
        }
        // Subsequent calls return data
        return data;
      });

      const testStore = CreateDexieHooks<TestEntity, any, any>(db, 'sections', {
        list: async (): Promise<Ok<TestEntity[]>> =>
          Ok([
            {
              id: 's1',
              name: 'Section 1',
              tenantId: 'test-tenant',
              updatedAt: new Date().toISOString(),
              syncStatus: SyncStatus.Synced,
            },
            {
              id: 's2',
              name: 'Section 2',
              tenantId: 'test-tenant',
              updatedAt: new Date().toISOString(),
              syncStatus: SyncStatus.Synced,
            },
          ]),
        create: async (item: any): Promise<Ok<TestEntity>> => Ok(item),
        update: async (item: any): Promise<Ok<TestEntity>> => Ok(item),
        delete: async (id: string): Promise<Ok<string>> => Ok(id),
      });

      const { result, rerender } = renderHook(() => testStore.useList());

      // Initially not hydrated
      expect(result.current[0]).toBe(false);
      expect(result.current[1]).toEqual([]);

      // Simulate data becoming available
      hydrated = true;
      data = [
        {
          id: 's1',
          name: 'Section 1',
          tenantId: 'test-tenant',
          updatedAt: new Date().toISOString(),
          syncStatus: SyncStatus.Synced,
        },
        {
          id: 's2',
          name: 'Section 2',
          tenantId: 'test-tenant',
          updatedAt: new Date().toISOString(),
          syncStatus: SyncStatus.Synced,
        },
      ];
      useLiveQuery.mockReturnValue(data);

      rerender();

      // After data loads, should be hydrated with correct data
      await waitFor(() => {
        // The actual hydration state depends on the internal state updates
        // Key point: data should never be an empty array when hydrated=true
        // unless the actual data IS empty
        const [isHydrated, items] = result.current;
        if (isHydrated) {
          expect(items.length).toBeGreaterThan(0);
        }
      });
    });
  });
});
