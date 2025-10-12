import { useCallback, useState } from 'react';
import { documentStore } from '@/app/home/clients/DocumentStore';

export interface Version {
  version?: number | null;
  sk?: string;
  // Add other fields as needed
  [key: string]: any;
}

/**
 * Fetches the version history for a document.
 * @param id The document ID
 * @returns An object containing the versions, loading state, and a fetch function
 */
export function useVersionHistory(id: string) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchVersions = useCallback(() => {
    setIsLoading(true);
    documentStore
      .listVersions(id)
      .then((result) => {
        if (result.ok) setVersions(result.val as Version[]);
        else setVersions([]);
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  return { versions, isLoading, fetchVersions };
}
