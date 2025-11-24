import {
  getCurrentTenantId,
  clearTenantCaches,
  getPreferredTenant,
  setPreferredTenant,
} from '../tenant-utils';
import { getCurrentUser, fetchUserAttributes, updateUserAttributes } from 'aws-amplify/auth';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';

// Mock AWS Amplify auth
jest.mock('aws-amplify/auth', () => ({
  getCurrentUser: jest.fn(),
  fetchUserAttributes: jest.fn(),
  updateUserAttributes: jest.fn(),
}));

jest.mock('aws-amplify/auth/cognito', () => ({
  cognitoUserPoolsTokenProvider: {
    getTokens: jest.fn(),
  },
}));

jest.mock('aws-amplify/api', () => ({
  generateClient: jest.fn(() => ({
    models: {
      Tenant: {
        list: jest.fn().mockResolvedValue({ data: [] }),
      },
    },
    mutations: {},
  })),
}));

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
const mockFetchUserAttributes = fetchUserAttributes as jest.MockedFunction<
  typeof fetchUserAttributes
>;
const mockUpdateUserAttributes = updateUserAttributes as jest.MockedFunction<
  typeof updateUserAttributes
>;
const mockGetTokens = cognitoUserPoolsTokenProvider.getTokens as jest.MockedFunction<
  typeof cognitoUserPoolsTokenProvider.getTokens
>;

describe('tenant-utils caching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearTenantCaches();

    // Default mock setup
    mockGetTokens.mockResolvedValue({
      accessToken: {
        payload: {
          'cognito:groups': [],
        },
      },
    } as any);
  });

  describe('getCurrentTenantId caching', () => {
    it('should deduplicate concurrent calls', async () => {
      const tenantId = 'test-tenant-123';
      mockFetchUserAttributes.mockResolvedValue({
        sub: 'user-123',
        'custom:preferredTenant': tenantId,
      } as any);

      // Make 5 concurrent calls
      const promises = [
        getCurrentTenantId(),
        getCurrentTenantId(),
        getCurrentTenantId(),
        getCurrentTenantId(),
        getCurrentTenantId(),
      ];

      const results = await Promise.all(promises);

      // All should return the same value
      results.forEach((result) => {
        expect(result).toBe(tenantId);
      });

      // fetchUserAttributes should only be called once due to deduplication
      expect(mockFetchUserAttributes).toHaveBeenCalledTimes(1);
    });

    it('should return cached value within TTL', async () => {
      const tenantId = 'cached-tenant';
      mockFetchUserAttributes.mockResolvedValue({
        sub: 'user-123',
        'custom:preferredTenant': tenantId,
      } as any);

      // First call - populates cache
      const result1 = await getCurrentTenantId();
      expect(result1).toBe(tenantId);
      expect(mockFetchUserAttributes).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result2 = await getCurrentTenantId();
      expect(result2).toBe(tenantId);

      // Should not call fetchUserAttributes again
      expect(mockFetchUserAttributes).toHaveBeenCalledTimes(1);
    });

    it('should refresh after TTL expires', async () => {
      const tenantId1 = 'tenant-v1';
      const tenantId2 = 'tenant-v2';

      mockFetchUserAttributes.mockResolvedValueOnce({
        sub: 'user-123',
        'custom:preferredTenant': tenantId1,
      } as any);

      // First call
      const result1 = await getCurrentTenantId();
      expect(result1).toBe(tenantId1);
      expect(mockFetchUserAttributes).toHaveBeenCalledTimes(1);

      // Simulate TTL expiry by clearing cache
      clearTenantCaches();

      mockFetchUserAttributes.mockResolvedValueOnce({
        sub: 'user-123',
        'custom:preferredTenant': tenantId2,
      } as any);

      // Second call after cache clear
      const result2 = await getCurrentTenantId();
      expect(result2).toBe(tenantId2);
      expect(mockFetchUserAttributes).toHaveBeenCalledTimes(2);
    });

    it('should clear cache when clearTenantCaches is called', async () => {
      const tenantId = 'test-tenant';
      mockFetchUserAttributes.mockResolvedValue({
        sub: 'user-123',
        'custom:preferredTenant': tenantId,
      } as any);

      // Populate cache
      await getCurrentTenantId();
      expect(mockFetchUserAttributes).toHaveBeenCalledTimes(1);

      // Clear caches
      clearTenantCaches();

      // Next call should fetch fresh data
      await getCurrentTenantId();
      expect(mockFetchUserAttributes).toHaveBeenCalledTimes(2);
    });

    it('should clear current tenant cache when setPreferredTenant is called', async () => {
      const tenantId = 'original-tenant';
      mockFetchUserAttributes.mockResolvedValue({
        sub: 'user-123',
        'custom:preferredTenant': tenantId,
      } as any);
      mockUpdateUserAttributes.mockResolvedValue({} as any);

      // Populate cache
      const result1 = await getCurrentTenantId();
      expect(result1).toBe(tenantId);
      expect(mockFetchUserAttributes).toHaveBeenCalledTimes(1);

      // Change preferred tenant
      await setPreferredTenant('new-tenant');

      // Cache should be cleared, next call fetches fresh
      const newTenantId = 'new-tenant';
      mockFetchUserAttributes.mockResolvedValue({
        sub: 'user-123',
        'custom:preferredTenant': newTenantId,
      } as any);

      const result2 = await getCurrentTenantId();
      expect(result2).toBe(newTenantId);
      expect(mockFetchUserAttributes).toHaveBeenCalledTimes(2);
    });

    it('should initialize personal tenant for new users', async () => {
      // Clear cache to ensure fresh state
      clearTenantCaches();

      // New user without preferred tenant - returns null for preferredTenant
      mockFetchUserAttributes.mockResolvedValueOnce({
        sub: undefined,
        'custom:preferredTenant': undefined,
      } as any);
      mockGetCurrentUser.mockResolvedValue({
        userId: 'new-user-id',
        username: 'newuser',
        signInDetails: {},
      });
      mockUpdateUserAttributes.mockResolvedValue({} as any);

      const result = await getCurrentTenantId();

      expect(result).toBe('new-user-id');
      expect(mockUpdateUserAttributes).toHaveBeenCalledWith({
        userAttributes: {
          'custom:preferredTenant': 'personal',
        },
      });
    });

    it('should handle errors gracefully and return null', async () => {
      // Clear cache to ensure fresh state
      clearTenantCaches();

      // Mock to reject on first call - both fetchUserAttributes and getCurrentUser
      mockFetchUserAttributes.mockRejectedValueOnce(new Error('Auth error'));
      mockGetCurrentUser.mockRejectedValueOnce(new Error('User not authenticated'));

      const result = await getCurrentTenantId();

      // Should return null on error
      expect(result).toBeNull();
    });
  });

  describe('getPreferredTenant caching', () => {
    it('should deduplicate concurrent calls', async () => {
      const tenantId = 'preferred-tenant';
      mockFetchUserAttributes.mockResolvedValue({
        sub: 'user-123',
        'custom:preferredTenant': tenantId,
      } as any);

      // Make concurrent calls
      const promises = [
        getPreferredTenant(),
        getPreferredTenant(),
        getPreferredTenant(),
      ];

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result).toBe(tenantId);
      });

      // Should only call once
      expect(mockFetchUserAttributes).toHaveBeenCalledTimes(1);
    });

    it('should return user sub when preferredTenant is personal', async () => {
      mockFetchUserAttributes.mockResolvedValue({
        sub: 'user-sub-123',
        'custom:preferredTenant': 'personal',
      } as any);

      const result = await getPreferredTenant();

      expect(result).toBe('user-sub-123');
    });

    it('should return user sub when no preferred tenant set', async () => {
      mockFetchUserAttributes.mockResolvedValue({
        sub: 'user-sub-456',
      } as any);

      const result = await getPreferredTenant();

      expect(result).toBe('user-sub-456');
    });
  });
});

