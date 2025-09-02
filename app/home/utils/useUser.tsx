import { AuthUser, fetchUserAttributes, FetchUserAttributesOutput, getCurrentUser } from 'aws-amplify/auth';
import { useState, useEffect } from 'react';

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
    async function fetch() {
      try {
        const user = await getCurrentUser();
        setUser(user);
        setIsHydrated(true);
      } catch (err) {
        console.error("[useUserHook] error", err);
      }
    }

    fetch();
  }, []); 

  return [isHydrated, user];
}

export function useUserAttributes(): [boolean, FetchUserAttributesOutput | null] {
  const [user, setUser] = useState<FetchUserAttributesOutput | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    async function fetch() {
      try {
        console.log("[useUserAttributes] fetching user attributes");
        const user = await fetchUserAttributes();
        if(user) {
          setUser(user);
          setIsHydrated(true);
        }
      } catch (err) {
        console.error("[useUserAttributes] error", err);
      }
    }

    const timeout = setTimeout(() => {
      fetch();
    }, 200);

    return () => clearTimeout(timeout);
  }, []);

  return [isHydrated, user];
}

export default useAuth;