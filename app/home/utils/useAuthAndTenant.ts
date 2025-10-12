import { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import { getCurrentTenantId } from './tenant-utils';

// Custom hook for auth and tenant management
export const useAuthAndTenant = () => {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        await getCurrentUser();
        if (mounted) {
          setAuthReady(true);
          setAuthSuccess(true);
          const tid = await getCurrentTenantId();
          setTenantId(tid);
        }
      } catch (error) {
        if (mounted) {
          setAuthReady(true);
          setAuthSuccess(false);
        }
      }
    };

    const timeout = setTimeout(initialize, 200);
    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, []);

  return { tenantId, authReady, authSuccess };
};
