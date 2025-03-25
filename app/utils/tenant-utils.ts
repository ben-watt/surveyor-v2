import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import client from "../app/clients/AmplifyDataClient";
import { Tenant } from "../app/utils/tenant-utils";

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
    
    // If user is global-admin, return all tenants
    const isAdmin = await isGlobalAdmin();
    if (isAdmin) {
      return result.data.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || undefined,
        createdAt: item.createdAt,
        createdBy: item.createdBy
      }));
    }
    
    // Otherwise, only return tenants the user has access to
    const tokens = await cognitoUserPoolsTokenProvider.getTokens();

    console.log("tokens", tokens);
    console.log("where is this messgae")

    const userGroups = Array.isArray(tokens?.accessToken?.payload?.['cognito:groups']) 
      ? tokens.accessToken.payload['cognito:groups'] 
      : []; 
    const userTenantIds = userGroups;
    
    return result.data
      .filter(item => userTenantIds.includes(item.id))
      .map(item => ({
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
 * Check if the current user has the global-admin role
 */
export async function isGlobalAdmin(): Promise<boolean> {
  try {
    const tokens = await cognitoUserPoolsTokenProvider.getTokens();
    const groups = Array.isArray(tokens?.accessToken?.payload?.['cognito:groups'])
      ? tokens.accessToken.payload['cognito:groups']
      : [];
    return groups.includes('global-admin');
  } catch (error) {
    console.error('Error checking global admin status:', error);
    return false;
  }
} 