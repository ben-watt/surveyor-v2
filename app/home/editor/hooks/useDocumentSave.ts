import { useState } from 'react';
import { documentStore } from '@/app/home/clients/DocumentStore';
import toast from 'react-hot-toast';

/**
 * Custom hook to handle saving documents (create or update) with loading and error state.
 * @param id - Document ID
 * @param getDisplayName - Function to get the document display name
 * @param getMetadata - Function to get the document metadata (given content)
 * @returns { save, isSaving, saveStatus }
 */
export function useDocumentSave({
  id,
  getDisplayName,
  getMetadata,
}: {
  id: string;
  getDisplayName?: () => Promise<string> | string;
  getMetadata?: (content: string) => any;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'autosaved'>('idle');

  const save = async (content: string, { auto = false }: { auto?: boolean } = {}) => {
    try {
      setIsSaving(true);
      setSaveStatus('saving');
      const existingDoc = await documentStore.get(id);
      if (existingDoc.ok) {
        const result = await documentStore.updateContent(id, content);
        if (!result.ok) throw new Error(result.val.message);
      } else {
        const displayName = getDisplayName
          ? typeof getDisplayName === 'function'
            ? await getDisplayName()
            : getDisplayName
          : 'Untitled Document';
        const metadata = getMetadata ? getMetadata(content) : {};
        const result = await documentStore.create({
          id,
          displayName,
          content,
          metadata,
        });
        if (!result.ok) throw new Error(result.val.message);
      }
      setSaveStatus(auto ? 'autosaved' : 'saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
      if (!auto) toast.success('Document saved successfully');
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      if (!auto) toast.error('Failed to save document');
    } finally {
      setIsSaving(false);
    }
  };

  return { save, isSaving, saveStatus };
} 