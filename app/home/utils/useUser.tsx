import { fetchUserAttributes, FetchUserAttributesOutput, getCurrentUser } from 'aws-amplify/auth';
import { useState, useEffect } from 'react';

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