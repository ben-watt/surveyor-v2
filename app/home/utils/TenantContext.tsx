"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { listUserTenants, getPreferredTenant, setPreferredTenant, Tenant } from "../utils/tenant-utils";
import { useRouter } from "next/navigation";

interface TenantContextType {
  currentTenant: Tenant | null;
  tenants: Tenant[];
  loading: boolean;
  error: string | null;
  setCurrentTenant: (tenant: Tenant | null) => Promise<void>;
  refreshTenants: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [currentTenant, setCurrentTenantState] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Load tenants and set the current tenant
  const loadTenants = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all tenants the user has access to
      const userTenants = await listUserTenants();
      setTenants(userTenants);
      
      if (userTenants.length > 0) {
        // Try to get the preferred tenant from user attributes
        const preferredTenantName = await getPreferredTenant();
        
        if (preferredTenantName) {
          // Find the preferred tenant in the list
          const preferredTenant = userTenants.find(t => t.name === preferredTenantName);
          if (preferredTenant) {
            setCurrentTenantState(preferredTenant);
            return;
          }
        }
        
        // If no preferred tenant or it's not in the list, set to null
        setCurrentTenantState(null);
      } else {
        setCurrentTenantState(null);
      }
    } catch (err) {
      console.error("Error loading tenants:", err);
      setError("Failed to load tenants");
    } finally {
      setLoading(false);
    }
  };

  // Set the current tenant and save it as preferred
  const setCurrentTenant = async (tenant: Tenant | null) => {
    try {
      setCurrentTenantState(tenant);
      await setPreferredTenant(tenant ? tenant.name : "personal");
      router.push("/home");
    } catch (err) {
      console.error("Error setting preferred tenant:", err);
      setError("Failed to set preferred tenant");
    }
  };

  // Refresh the tenant list
  const refreshTenants = async () => {
    await loadTenants();
  };

  // Load tenants on initial render
  useEffect(() => {
    loadTenants();
  }, []);

  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        tenants,
        loading,
        error,
        setCurrentTenant,
        refreshTenants,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
} 