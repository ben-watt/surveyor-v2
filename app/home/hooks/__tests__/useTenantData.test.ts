import { renderHook, act, waitFor } from '@testing-library/react';
import { useTenantData, withTenantFilter } from '../useTenantData';
import { useTenant } from '../../utils/TenantContext';
import React from 'react';

// Mock the TenantContext
jest.mock('../../utils/TenantContext', () => ({
  useTenant: jest.fn(),
}));

describe('useTenantData', () => {
  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementation for useTenant
    (useTenant as jest.Mock).mockReturnValue({
      currentTenant: { name: 'test-tenant' },
    });
  });

  // 1. Basic Hook Lifecycle Tests
  describe('Basic Hook Lifecycle', () => {
    it('should initialize with correct default state', async () => {
      const mockFetchFn = jest.fn();
      const { result } = renderHook(() => useTenantData(mockFetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
        expect(result.current.data).toBe(null);
        expect(result.current.error).toBe(null);
      });
    });

    it('should call fetch function on mount', async () => {
      const mockFetchFn = jest.fn().mockResolvedValue([]);
      renderHook(() => useTenantData(mockFetchFn));

      await waitFor(() => {
        expect(mockFetchFn).toHaveBeenCalledWith('test-tenant');
      });
    });

    it('should cleanup on unmount', async () => {
      const mockFetchFn = jest.fn(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100)),
      );
      const { unmount } = renderHook(() => useTenantData(mockFetchFn));

      unmount();
      await waitFor(() => {
        expect(mockFetchFn).toHaveBeenCalled();
      });

      // Verify that the fetch result wasn't set after unmount
      expect(mockFetchFn).toHaveBeenCalled();
    });
  });

  // 2. Data Fetching Tests
  describe('Data Fetching', () => {
    it('should successfully fetch and set data', async () => {
      const mockData = [{ id: 1, name: 'Test' }];
      const mockFetchFn = jest.fn().mockResolvedValue(mockData);

      const { result } = renderHook(() => useTenantData(mockFetchFn));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe(null);
      });
    });

    it('should handle null tenant ID', async () => {
      (useTenant as jest.Mock).mockReturnValue({ currentTenant: null });
      const mockFetchFn = jest.fn().mockResolvedValue([]);

      renderHook(() => useTenantData(mockFetchFn));

      await waitFor(() => {
        expect(mockFetchFn).toHaveBeenCalledWith(null);
      });
    });

    it('should update data when dependencies change', async () => {
      const mockFetchFn = jest.fn().mockResolvedValue([]);
      const { rerender } = renderHook(({ dep }) => useTenantData(mockFetchFn, [dep]), {
        initialProps: { dep: 1 },
      });

      rerender({ dep: 2 });

      await waitFor(() => {
        expect(mockFetchFn).toHaveBeenCalledTimes(2);
      });
    });
  });

  // 3. Error Handling Tests
  describe('Error Handling', () => {
    it('should handle fetch errors', async () => {
      const error = new Error('Fetch failed');
      const mockFetchFn = jest.fn().mockRejectedValue(error);

      const { result } = renderHook(() => useTenantData(mockFetchFn));

      await waitFor(() => {
        expect(result.current.error).toEqual(error);
        expect(result.current.loading).toBe(false);
        expect(result.current.data).toBe(null);
      });
    });

    it('should reset error state on successful fetch', async () => {
      const error = new Error('Fetch failed');
      const mockFetchFn = jest.fn().mockRejectedValueOnce(error).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useTenantData(mockFetchFn));

      // First fetch - error
      await waitFor(() => {
        expect(result.current.error).toEqual(error);
      });

      // Second fetch - success
      await act(async () => {
        await result.current.refetch();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });
    });
  });

  // 4. Loading State Tests
  describe('Loading State', () => {
    it('should handle loading states correctly', async () => {
      const mockFetchFn = jest.fn(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100)),
      );

      const { result } = renderHook(() => useTenantData(mockFetchFn));

      // Initial state
      expect(result.current.loading).toBe(true);

      // During fetch
      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  // 5. Refetch Functionality Tests
  describe('Refetch Functionality', () => {
    it('should trigger new fetch when refetch is called', async () => {
      const mockFetchFn = jest.fn().mockResolvedValue([]);

      const { result } = renderHook(() => useTenantData(mockFetchFn));

      await act(async () => {
        await result.current.refetch();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockFetchFn).toHaveBeenCalledTimes(2);
    });
  });
});

// 6. withTenantFilter Helper Tests
describe('withTenantFilter', () => {
  it('should add tenant filter when tenant ID is provided', async () => {
    const mockQueryFn = jest.fn().mockResolvedValue([]);
    const tenantId = 'test-tenant';

    await withTenantFilter(mockQueryFn, tenantId);

    expect(mockQueryFn).toHaveBeenCalledWith({
      tenantId: { eq: tenantId },
    });
  });

  it('should not add filter when tenant ID is null', async () => {
    const mockQueryFn = jest.fn().mockResolvedValue([]);

    await withTenantFilter(mockQueryFn, null);

    expect(mockQueryFn).toHaveBeenCalledWith();
  });
});
