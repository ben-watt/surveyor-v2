import { getCurrentUser, fetchUserAttributes, updateUserAttributes } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import { Schema } from '@/amplify/data/resource';
import { useEffect, useState } from 'react';

// Define types for tenant management
export interface Tenant {
  id: string;
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
 * Hook to use tenant data in components
 * Returns the current tenant ID and loading state
 */
export function useTenantData() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<Tenant[]>([]);

  useEffect(() => {
    async function loadTenantData() {
      try {
        // Get current tenant ID
        const currentTenantId = await getCurrentTenantId();
        setTenantId(currentTenantId);
        
        // Get list of available tenants
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
  
  // Function to switch tenant
  const switchTenant = async (newTenantId: string) => {
    try {
      await setPreferredTenant(newTenantId);
      setTenantId(newTenantId);
      return true;
    } catch (error) {
      console.error('Error switching tenant:', error);
      return false;
    }
  };
  
  return {
    tenantId,
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
    // Create the group in Cognito using the tenant admin function
    await client.mutations.tenantAdmin({
      action: 'createGroup',
      groupName: name,
      description: description || `Tenant group for ${name}`
    });
    
    // Get current user
    const currentUser = await getCurrentUser();
    
    // Create tenant record in database
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
      id: result.data.id,
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

/**
 * List all tenants the current user has access to
 */
export async function listUserTenants(): Promise<Tenant[]> {
  try {
    // Get all tenants
    const result = await client.models.Tenant.list();
    
    if (!result.data) {
      return [];
    }
    
    return result.data.map(item => ({
      id: item.id,
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
export async function addUserToTenant(username: string, tenantId: string): Promise<void> {
  try {
    // Get tenant details
    const tenantResult = await client.models.Tenant.get({ id: tenantId });
    
    if (!tenantResult.data) {
      throw new Error(`Tenant with ID ${tenantId} not found`);
    }
    
    // Add user to the Cognito group
    const result = await client.mutations.tenantAdmin({
      action: 'addUserToGroup',
      username,
      groupName: tenantResult.data.name
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
export async function removeUserFromTenant(username: string, tenantId: string): Promise<void> {
  try {
    // Get tenant details
    const tenantResult = await client.models.Tenant.get({ id: tenantId });
    
    if (!tenantResult.data) {
      throw new Error(`Tenant with ID ${tenantId} not found`);
    }
    
    // Remove user from the Cognito group
    await client.mutations.tenantAdmin({
      action: 'removeUserFromGroup',
      username,
      groupName: tenantResult.data.name
    });
  } catch (error) {
    console.error('Error removing user from tenant:', error);
    throw error;
  }
}

/**
 * List users in a tenant
 */
export async function listTenantUsers(tenantId: string): Promise<TenantUser[]> {
  try {
    // Get tenant details
    const tenantResult = await client.models.Tenant.get({ id: tenantId });
    
    if (!tenantResult.data) {
      throw new Error(`Tenant with ID ${tenantId} not found`);
    }
    
    // List users in the Cognito group
    const usersResult = await client.mutations.tenantAdmin({
      action: 'listUsersInGroup',
      groupName: tenantResult.data.name
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
export async function setPreferredTenant(tenantId: string): Promise<void> {
  try {
    await updateUserAttributes({
      userAttributes: {
        'custom:preferredTenant': tenantId
      }
    });
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
    const attributes = await fetchUserAttributes();
    return attributes['custom:preferredTenant'] || null;
  } catch (error) {
    console.error('Error getting preferred tenant:', error);
    return null;
  }
} 