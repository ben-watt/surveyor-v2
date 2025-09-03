import { useEffect, useState } from 'react';
import {
  AuthUser,
  fetchUserAttributes,
  FetchUserAttributesOutput,
  getCurrentUser,
} from 'aws-amplify/auth';

export type OwnerLike = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
};

export type CurrentUserLike = {
  sub?: string | null;
};

export function getOwnerDisplayName(
  owner: OwnerLike | undefined | null,
  options?: { isUserHydrated?: boolean; currentUser?: CurrentUserLike | null }
): string {
  if (!owner) return 'Unknown';

  const ownerId = owner.id ?? undefined;
  const trimmedName = owner.name?.trim();
  if (trimmedName && trimmedName !== ownerId) {
    return trimmedName;
  }

  const email = owner.email?.trim();
  if (email) {
    const handle = email.split('@')[0] || email;
    return handle;
  }

  if (options?.isUserHydrated && options?.currentUser?.sub && ownerId && options.currentUser.sub === ownerId) {
    return 'You';
  }

  return 'Unknown';
}

// Module-level cache to avoid duplicate Cognito requests across components
let cachedCurrentUser: AuthUser | null = null;
let currentUserPromise: Promise<AuthUser> | null = null;

let cachedAttributes: FetchUserAttributesOutput | null = null;
let attributesPromise: Promise<FetchUserAttributesOutput> | null = null;

async function loadCurrentUserOnce(): Promise<AuthUser> {
  if (cachedCurrentUser) {
    console.log('useUser: Using cached user', { userId: cachedCurrentUser.userId });
    return cachedCurrentUser;
  }
  if (currentUserPromise) {
    console.log('useUser: Waiting for existing getCurrentUser promise');
    return currentUserPromise;
  }

  console.log('useUser: Calling getCurrentUser for the first time');
  currentUserPromise = getCurrentUser()
    .then(user => {
      console.log('useUser: getCurrentUser succeeded', { userId: user.userId, username: user.username });
      cachedCurrentUser = user;
      return user;
    })
    .catch(error => {
      console.error('useUser: getCurrentUser failed', { 
        error: error.message, 
        name: error.name,
        hostname: typeof window !== 'undefined' ? window.location.hostname : 'SSR'
      });
      throw error;
    })
    .finally(() => {
      currentUserPromise = null;
    });

  return currentUserPromise;
}

async function loadUserAttributesOnce(): Promise<FetchUserAttributesOutput> {
  if (cachedAttributes) return cachedAttributes;
  if (attributesPromise) return attributesPromise;

  attributesPromise = fetchUserAttributes()
    .then(attrs => {
      cachedAttributes = attrs;
      return attrs;
    })
    .finally(() => {
      attributesPromise = null;
    });

  return attributesPromise;
}

async function useAuth() {
  try {
    const { username, userId, signInDetails } = await getCurrentUser();
    console.log(`The username: ${username}`);
    console.log(`The userId: ${userId}`);
    console.log(`The signInDetails: ${signInDetails}`);
  } catch (err) {
    console.log(err);
  }
}

export function useUserHook(): [boolean, AuthUser | null] {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    let isMounted = true;
    console.log('useUserHook: Starting user load', { 
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'SSR' 
    });
    
    loadCurrentUserOnce()
      .then(u => {
        if (!isMounted) {
          console.log('useUserHook: Component unmounted, skipping state update');
          return;
        }
        console.log('useUserHook: Successfully loaded user', { userId: u.userId });
        setUser(u);
        setIsHydrated(true);
      })
      .catch(err => {
        if (!isMounted) return;
        console.error('useUserHook: Failed to load user', { 
          error: err.message, 
          name: err.name,
          hostname: typeof window !== 'undefined' ? window.location.hostname : 'SSR'
        });
        setIsHydrated(true); // Still mark as hydrated even if failed
      });

    return () => {
      isMounted = false;
    };
  }, []); 

  return [isHydrated, user];
}

export function useUserAttributes(): [boolean, FetchUserAttributesOutput | null] {
  const [user, setUser] = useState<FetchUserAttributesOutput | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;
    console.log('[useUserAttributes] fetching user attributes');
    loadUserAttributesOnce()
      .then(attrs => {
        if (!isMounted) return;
        if (attrs) {
          setUser(attrs);
          setIsHydrated(true);
        }
      })
      .catch(err => {
        console.error('[useUserAttributes] error', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return [isHydrated, user];
}

export default useAuth;