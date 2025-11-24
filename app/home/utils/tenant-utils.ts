import { getCurrentUser, fetchUserAttributes, updateUserAttributes } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import { Schema } from '@/amplify/data/resource';
import { useEffect, useState } from 'react';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { Router } from 'lucide-react';

// Define types for tenant management
export interface Tenant {
  name: string;
  description?: string;
  createdAt: string;
  createdBy: string;
}

export interface TenantUser {
  username: string;
  email: string;
  name?: string;
  addedAt: string;
}

// Client for GraphQL operations
const client = generateClient<Schema>();

// Add cache variable at the top level after imports
type PreferredTenantCache = { value: string | null; timestamp: number } | null;
type TenantsCache = { value: Tenant[]; timestamp: number } | null;
type UserAttributes = { [key: string]: string | undefined };

let preferredTenantCache: PreferredTenantCache = null;
let tenantsCache: TenantsCache = null;
let currentTenantCache: PreferredTenantCache = null;
const CACHE_DURATION = 30 * 1000; // 30 seconds for freshness check
let preferredTenantInFlight: Promise<string | null> | null = null;
let tenantsInFlight: Promise<Tenant[]> | null = null;
let currentTenantInFlight: Promise<string | null> | null = null;

function isCacheValid(cache: PreferredTenantCache | TenantsCache): boolean {
  return !!cache && Date.now() - cache.timestamp < CACHE_DURATION;
}

async function fetchAndCacheUserTenants(): Promise<Tenant[]> {
  try {
    const result = await client.models.Tenant.list();

    if (!result.data) {
      console.debug('[fetchAndCacheUserTenants] No tenant data returned');
      return tenantsCache?.value || [];
    }

    // If user is global-admin, return all tenants
    const isAdmin = await isGlobalAdmin();
    let tenants: Tenant[];

    if (isAdmin) {
      tenants = result.data.map((item) => ({
        name: item.name,
        description: item.description || undefined,
        createdAt: item.createdAt,
        createdBy: item.createdBy,
      }));
    } else {
      const userGroups = await getUserGroups();
      console.debug('[fetchAndCacheUserTenants] User groups:', userGroups);

      tenants = result.data
        .filter((item) => userGroups.includes(item.name))
        .map((item) => ({
          name: item.name,
          description: item.description || undefined,
          createdAt: item.createdAt,
          createdBy: item.createdBy,
        }));
    }

    // Cache the fresh data
    tenantsCache = { value: tenants, timestamp: Date.now() };
    console.debug(
      '[fetchAndCacheUserTenants] Updated tenants cache with',
      tenants.length,
      'tenants',
    );

    return tenants;
  } catch (error) {
    console.error('[fetchAndCacheUserTenants] Error fetching tenants:', error);
    // Return stale data if available
    if (tenantsCache?.value) {
      console.debug('[fetchAndCacheUserTenants] Returning stale cached data due to error');
      return tenantsCache.value;
    }
    throw error;
  } finally {
    tenantsInFlight = null;
  }
}

function derivePreferredTenant(attributes: UserAttributes): string | null {
  const preferred = attributes['custom:preferredTenant'];
  const userSub = attributes.sub;
  return !preferred || preferred === 'personal' ? userSub || null : preferred;
}

async function fetchAndCachePreferredTenant(): Promise<string | null> {
  try {
    const attributes = (await fetchUserAttributes()) as unknown as UserAttributes;
    const result = derivePreferredTenant(attributes);
    preferredTenantCache = { value: result, timestamp: Date.now() };
    console.debug('[getPreferredTenant] updated preferredTenantCache', preferredTenantCache);
    return result;
  } catch (error) {
    console.error('[getPreferredTenant] Error getting preferred tenant:', error);
    return null;
  } finally {
    preferredTenantInFlight = null;
  }
}

/**
 * Internal function to fetch and cache the current tenant ID
 */
async function fetchAndCacheCurrentTenant(): Promise<string | null> {
  try {
    const preferredTenant = await getPreferredTenant();

    if (preferredTenant) {
      currentTenantCache = { value: preferredTenant, timestamp: Date.now() };
      console.debug('[getCurrentTenantId] Cached current tenant:', preferredTenant);
      return preferredTenant;
    }

    // For new users, initialize personal tenant using their user ID
    console.debug('[getCurrentTenantId] No preferred tenant found, initializing personal tenant');
    const user = await getCurrentUser();

    if (user?.userId) {
      // Set personal tenant as default for new users
      await setPreferredTenant('personal');
      console.debug('[getCurrentTenantId] Personal tenant initialized for new user');
      currentTenantCache = { value: user.userId, timestamp: Date.now() };
      return user.userId;
    }

    currentTenantCache = { value: null, timestamp: Date.now() };
    return null;
  } catch (error) {
    console.error('Error getting current tenant ID:', error);
    return null;
  } finally {
    currentTenantInFlight = null;
  }
}

/**
 * Get the current tenant ID from user attributes
 * For new users without a preferred tenant, initializes personal tenant
 * Uses promise deduplication to prevent redundant async calls
 */
export async function getCurrentTenantId(): Promise<string | null> {
  // Return cached value if valid
  if (isCacheValid(currentTenantCache)) {
    console.debug('[getCurrentTenantId] Returning cached value:', currentTenantCache!.value);
    return currentTenantCache!.value;
  }

  // If there's an in-flight request, return that promise
  if (currentTenantInFlight) {
    console.debug('[getCurrentTenantId] Returning in-flight promise');
    return currentTenantInFlight;
  }

  // Start new fetch
  console.debug('[getCurrentTenantId] Fetching fresh tenant ID');
  currentTenantInFlight = fetchAndCacheCurrentTenant();
  return currentTenantInFlight;
}

/**
 * Hook to use tenant data in components
 * Returns the current tenant ID and loading state
 */
export function useTenantData() {
  const [currentTenant, setCurrentTenant] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<Tenant[]>([]);

  useEffect(() => {
    async function loadTenantData() {
      try {
        const currentTenantName = await getCurrentTenantId();
        setCurrentTenant(currentTenantName);

        const tenantsList = await listUserTenants();
        setTenants(tenantsList);
      } catch (error) {
        console.error('Error loading tenant data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadTenantData();
  }, []);

  const switchTenant = async (newTenantName: string) => {
    try {
      await setPreferredTenant(newTenantName);
      setCurrentTenant(newTenantName);
      return true;
    } catch (error) {
      console.error('Error switching tenant:', error);
      return false;
    }
  };

  return {
    currentTenant,
    loading,
    tenants,
    switchTenant,
  };
}

/**
 * Create a new tenant/group
 */
export async function createTenant(name: string, description?: string): Promise<Tenant> {
  try {
    // Validate tenant name format
    const validNameRegex = /^[a-z0-9-]+$/;
    if (!validNameRegex.test(name)) {
      throw new Error('Tenant name must contain only lowercase letters, numbers, and hyphens');
    }

    // Check if user has global-admin role
    const isAdmin = await isGlobalAdmin();
    if (!isAdmin) {
      throw new Error('Only global administrators can create tenants');
    }

    // Create the group in Cognito using the tenant name
    await client.mutations.tenantAdmin({
      action: 'createGroup',
      groupName: name,
      description: description || `Tenant group for ${name}`,
    });

    // Get current user
    const currentUser = await getCurrentUser();

    // Create tenant record in database using name as primary key
    const result = await client.models.Tenant.create({
      name,
      description,
      createdBy: currentUser.username,
      createdAt: new Date().toISOString(),
    });

    if (!result.data) {
      throw new Error('Failed to create tenant');
    }

    return {
      name: result.data.name,
      description: result.data.description || undefined,
      createdAt: result.data.createdAt,
      createdBy: result.data.createdBy,
    };
  } catch (error) {
    console.error('Error creating tenant:', error);
    throw error;
  }
}

export async function getUserGroups(): Promise<string[]> {
  const tokens = await cognitoUserPoolsTokenProvider.getTokens();
  console.debug('tokens', tokens);
  return (tokens?.accessToken?.payload['cognito:groups'] as string[]) || [];
}

/**
 * List all tenants the current user has access to
 * Uses stale-while-revalidate pattern for offline-first experience
 */
export async function listUserTenants(forceRefresh: boolean = false): Promise<Tenant[]> {
  console.debug(
    '[listUserTenants] Cache valid:',
    isCacheValid(tenantsCache),
    'Force refresh:',
    forceRefresh,
  );

  // If we have fresh cache and not forcing refresh, return immediately
  if (!forceRefresh && isCacheValid(tenantsCache)) {
    console.debug('[listUserTenants] Returning fresh cached data');
    return tenantsCache!.value;
  }

  // If we have stale data, return it immediately and fetch fresh data in background
  if (!forceRefresh && tenantsCache?.value) {
    console.debug('[listUserTenants] Returning stale data, fetching fresh in background');
    // Start background refresh without awaiting
    if (!tenantsInFlight) {
      tenantsInFlight = fetchAndCacheUserTenants();
    }
    return tenantsCache.value;
  }

  // No cached data or forced refresh - fetch fresh data
  if (tenantsInFlight) {
    console.debug('[listUserTenants] Using existing in-flight promise');
    return tenantsInFlight;
  }

  console.debug('[listUserTenants] Fetching fresh tenant data');
  tenantsInFlight = fetchAndCacheUserTenants();
  return tenantsInFlight;
}

/**
 * Add a user to a tenant
 */
export async function addUserToTenant(username: string, tenantName: string): Promise<void> {
  try {
    // Check if user has global-admin role
    const isAdmin = await isGlobalAdmin();
    if (!isAdmin) {
      throw new Error('Only global administrators can add users to tenants');
    }

    // Add user to the Cognito group directly using tenant name
    const result = await client.mutations.tenantAdmin({
      action: 'addUserToGroup',
      username,
      groupName: tenantName,
    });

    if (result.errors) {
      console.error('Error adding user to tenant:', result.errors);
      throw new Error(result.errors[0].message);
    }
  } catch (error) {
    console.error('Error adding user to tenant:', error);
    throw error;
  }
}

/**
 * Remove a user from a tenant
 */
export async function removeUserFromTenant(username: string, tenantName: string): Promise<void> {
  try {
    // Check if user has global-admin role
    const isAdmin = await isGlobalAdmin();
    if (!isAdmin) {
      throw new Error('Only global administrators can remove users from tenants');
    }

    // Remove user from the Cognito group directly using tenant name
    await client.mutations.tenantAdmin({
      action: 'removeUserFromGroup',
      username,
      groupName: tenantName,
    });
  } catch (error) {
    console.error('Error removing user from tenant:', error);
    throw error;
  }
}

/**
 * List users in a tenant
 */
export async function listTenantUsers(tenantName: string): Promise<TenantUser[]> {
  try {
    // List users in the Cognito group directly using tenant name
    const usersResult = await client.mutations.tenantAdmin({
      action: 'listUsersInGroup',
      groupName: tenantName,
    });

    const userResultJson = JSON.parse(usersResult.data as string) as any[];

    return userResultJson.map((user: any) => ({
      username: user.Username || '',
      email: user.Attributes?.find((attr: any) => attr.Name === 'email')?.Value || '',
      name: user.Attributes?.find((attr: any) => attr.Name === 'name')?.Value,
      addedAt: user.UserCreateDate || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error listing tenant users:', error);
    throw error;
  }
}

/**
 * Set user's preferred tenant
 */
export async function setPreferredTenant(tenantName: string): Promise<void> {
  try {
    await updateUserAttributes({
      userAttributes: {
        'custom:preferredTenant': tenantName,
      },
    });
    // Clear the cache when setting new preferred tenant
    preferredTenantCache = null;
    preferredTenantInFlight = null;
    currentTenantCache = null;
    currentTenantInFlight = null;
    console.debug(
      '[setPreferredTenant] Cleared tenant caches after setting to:',
      tenantName,
    );
  } catch (error) {
    console.error('Error setting preferred tenant:', error);
    throw error;
  }
}

/**
 * Clear all tenant-related caches
 * Call this when you want to force fresh data on next access
 */
export function clearTenantCaches(): void {
  preferredTenantCache = null;
  preferredTenantInFlight = null;
  tenantsCache = null;
  tenantsInFlight = null;
  currentTenantCache = null;
  currentTenantInFlight = null;
  console.debug('[clearTenantCaches] All tenant caches cleared');
}

export async function getPreferredTenant(): Promise<string | null> {
  console.debug('[getPreferredTenant] preferredTenantCache', preferredTenantCache);

  if (isCacheValid(preferredTenantCache)) {
    console.debug('[getPreferredTenant] fetching from cache', preferredTenantCache);
    return preferredTenantCache!.value;
  }

  if (preferredTenantInFlight) {
    console.debug('[getPreferredTenant] returning in-flight promise');
    return preferredTenantInFlight;
  }

  preferredTenantInFlight = fetchAndCachePreferredTenant();
  return preferredTenantInFlight;
}

/**
 * Check if the current user has the global-admin role
 */
export async function isGlobalAdmin(): Promise<boolean> {
  try {
    const groups = await getUserGroups();
    return groups.includes('global-admin');
  } catch (error) {
    console.error('Error checking global admin status:', error);
    return false;
  }
}

/**
 * Delete a tenant and its associated Cognito group
 */
export async function deleteTenant(tenantName: string): Promise<void> {
  try {
    // Check if user has global-admin role
    const isAdmin = await isGlobalAdmin();
    if (!isAdmin) {
      throw new Error('Only global administrators can delete tenants');
    }

    // Delete the Cognito group
    await client.mutations.tenantAdmin({
      action: 'deleteGroup',
      groupName: tenantName,
    });

    // Delete tenant record from database
    await client.models.Tenant.delete({ id: tenantName });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    throw error;
  }
}

/**
 * Ensures that a data object has the current tenant name
 */
export async function withTenantId<T>(data: T): Promise<T & { tenantId: string }> {
  const tenantName = await getCurrentTenantId();
  if (!tenantName) {
    throw new Error('No tenant selected. Please ensure a tenant is selected.');
  }
  return { ...data, tenantId: tenantName };
}

/**
 * Hook to get the current tenant ID
 * Returns the current tenant ID and loading state
 */
export function useCurrentTenantId(): [boolean, string | null] {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const fetchTenantId = async () => {
      const tenantId = await getCurrentTenantId();
      setTenantId(tenantId);
    };
    fetchTenantId();
    setIsHydrated(true);
  }, []);

  return [isHydrated, tenantId];
}
