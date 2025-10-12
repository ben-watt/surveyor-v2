'use client';

import { signOut } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation';

export default function Logout() {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        await signOut();
        router.push('/login');
      }}
      className="bg-white px-2 text-black"
    >
      Sign out
    </button>
  );
}
