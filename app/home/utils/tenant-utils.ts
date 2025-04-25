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
let preferredTenantCache: { value: string | null; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Get the current tenant ID from user attributes
 * Returns null if no preferred tenant is set
 */
export async function getCurrentTenantId(): Promise<string | null> {
  try {
    return await getPreferredTenant();
  } catch (error) {
    console.error('Error getting current tenant ID:', error);
    return null;
  }
}

/**
 * Get the current tenant name from user attributes
 * Returns null if no preferred tenant is set
 */
export async function getCurrentTenantName(): Promise<string | null> {
  try {
    return await getPreferredTenant();
  } catch (error) {
    console.error('Error getting current tenant name:', error);
    return null;
  }
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
        const currentTenantName = await getCurrentTenantName();
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
      description: description || `Tenant group for ${name}`
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
      createdBy: result.data.createdBy
    };
  } catch (error) {
    console.error('Error creating tenant:', error);
    throw error;
  }
}

export async function getUserGroups(): Promise<string[]> {
  const tokens = await cognitoUserPoolsTokenProvider.getTokens();
  console.debug("tokens", tokens);
  return tokens?.accessToken?.payload['cognito:groups'] as string[] || [];
}


/**
 * List all tenants the current user has access to
 */
export async function listUserTenants(): Promise<Tenant[]> {
  try {
    const result = await client.models.Tenant.list();
    
    if (!result.data) {
      return [];
    }
    
    // If user is global-admin, return all tenants
    const isAdmin = await isGlobalAdmin();
    if (isAdmin) {
      return result.data.map(item => ({
        name: item.name,
        description: item.description || undefined,
        createdAt: item.createdAt,
        createdBy: item.createdBy
      }));
    }    

    const userGroups = await getUserGroups();

    return result.data
      .filter(item => userGroups.includes(item.name))
      .map(item => ({
        name: item.name,
        description: item.description || undefined,
        createdAt: item.createdAt,
        createdBy: item.createdBy
      }));
  } catch (error) {
    console.error('Error listing tenants:', error);
    throw error;
  }
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
      groupName: tenantName
    });

    if(result.errors) {
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
      groupName: tenantName
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
      groupName: tenantName
    });

    const userResultJson = JSON.parse(usersResult.data as string) as any[];
    
    return userResultJson.map((user: any) => ({
      username: user.Username || '',
      email: user.Attributes?.find((attr: any) => attr.Name === 'email')?.Value || '',
      name: user.Attributes?.find((attr: any) => attr.Name === 'name')?.Value,
      addedAt: user.UserCreateDate || new Date().toISOString()
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
        'custom:preferredTenant': tenantName
      }
    });
    // Clear the cache when setting new preferred tenant
    preferredTenantCache = null;
  } catch (error) {
    console.error('Error setting preferred tenant:', error);
    throw error;
  }
}

/**
 * Get user's preferred tenant
 */
export async function getPreferredTenant(): Promise<string | null> {
  try {

    console.debug("[getPreferredTenant] preferredTenantCache", preferredTenantCache);

    if (preferredTenantCache && Date.now() - preferredTenantCache.timestamp < CACHE_DURATION) {
      console.debug("[getPreferredTenant] fetching from cache", preferredTenantCache);
      return preferredTenantCache.value;
    }

    const attributes = await fetchUserAttributes();
    const preferredTenant = attributes['custom:preferredTenant'];
    let result: string | null;
    
    // If no preferred tenant is set, use the user's sub as their personal tenant
    if (!preferredTenant) {
      result = attributes.sub || null;
    }
    // If preferred tenant is explicitly set to "personal", use the user's sub
    else if (preferredTenant === 'personal') {
      result = attributes.sub || null;
    }
    else {
      result = preferredTenant;
    }

    // Update cache
    preferredTenantCache = {
      value: result,
      timestamp: Date.now()
    };

    console.debug("[getPreferredTenant] preferredTenantCache", preferredTenantCache);
    
    return result;
  } catch (error) {
    console.error("[getPreferredTenant] Error getting preferred tenant:", error);
    return null;
  }
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
      groupName: tenantName
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
  const tenantName = await getCurrentTenantName();
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