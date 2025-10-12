import { useState, useEffect } from 'react';
import { uploadData, getUrl } from 'aws-amplify/storage';
import toast from 'react-hot-toast';
import { useCurrentTenantId } from '@/app/home/utils/tenant-utils';
import { useUserHook } from '@/app/home/utils/useUser';

interface UseDocumentStorageProps {
  documentId: string;
  getDocumentPath: (docId: string, userId: string, tenantId: string) => string;
}

// Create a dynamo db table for the documents and metadata
// id, tenantId, userId, documentId, content, metadata

export const useDocumentStorage = ({ documentId, getDocumentPath }: UseDocumentStorageProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState<string | null>(null);

  const [isUserHydrated, user] = useUserHook();
  const [isTenantHydrated, tenantId] = useCurrentTenantId();

  useEffect(() => {
    if (isUserHydrated && isTenantHydrated && user?.userId && tenantId) {
      loadDocument();
    }
  }, [isUserHydrated, isTenantHydrated, user?.userId, tenantId]);

  const loadDocument = async () => {
    if (!user?.userId || !tenantId) {
      return null;
    }

    try {
      setIsLoading(true);
      const path = getDocumentPath(documentId, user.userId, tenantId);
      const url = await getUrl({ path });

      const response = await fetch(url.url);
      if (!response.ok) {
        if (response.status === 404) {
          setContent(null);
          return null;
        }
        throw new Error(`Failed to load document: ${response.statusText}`);
      }

      const loadedContent = await response.text();
      setContent(loadedContent);
      return loadedContent;
    } catch (error) {
      console.error('Failed to load document:', error);
      setContent(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (newContent: string, metadata: Record<string, string> = {}) => {
    if (!tenantId) {
      toast.error('No tenant ID available');
      return;
    }
    if (!user?.userId) {
      toast.error('No user ID available');
      return;
    }

    try {
      setIsSaving(true);
      const path = getDocumentPath(documentId, user.userId, tenantId);

      await uploadData({
        path,
        data: newContent,
        options: {
          contentType: 'text/html',
          metadata: {
            id: documentId,
          },
        },
      });

      setContent(newContent);
      toast.success('Document saved successfully');
    } catch (error) {
      console.error('Failed to save document:', error);
      toast.error('Failed to save document');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    content,
    isSaving,
    isLoading: isLoading || !isUserHydrated || !isTenantHydrated,
    loadDocument,
    handleSave,
  };
};
