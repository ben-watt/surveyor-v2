import { useState } from 'react';
import { documentStore } from '@/app/home/clients/DocumentStore';
import toast from 'react-hot-toast';
import type { DocumentContent } from '../utils/documentSerialization';
import { serializeDocument } from '../utils/documentSerialization';

/**
 * Custom hook to handle saving documents (create or update) with loading and error state.
 * @param id - Document ID
 * @param getDisplayName - Function to get the document display name
 * @param getMetadata - Function to get the document metadata (given document content)
 * @returns { save, isSaving, saveStatus }
 */
export function useDocumentSave({
  id,
  getDisplayName,
  getMetadata,
}: {
  id: string;
  getDisplayName?: () => Promise<string> | string;
  getMetadata?: (content: DocumentContent) => any;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'autosaved'>(
    'idle',
  );

  const save = async (content: DocumentContent, { auto = false }: { auto?: boolean } = {}) => {
    try {
      setIsSaving(true);
      setSaveStatus('saving');
      const existingDoc = await documentStore.get(id);
      const metadata = getMetadata ? getMetadata(content) : {};
      const templateId = metadata.templateId;
      const serializedContent = serializeDocument(content);
      if (existingDoc.ok) {
        const result = await documentStore.updateContent(id, serializedContent, templateId);
        if (!result.ok) throw new Error(result.val.message);
      } else {
        const displayName = getDisplayName
          ? typeof getDisplayName === 'function'
            ? await getDisplayName()
            : getDisplayName
          : 'Untitled Document';
        const result = await documentStore.create({
          id,
          displayName,
          content: serializedContent,
          metadata,
        });
        if (!result.ok) throw new Error(result.val.message);
      }
      setSaveStatus(auto ? 'autosaved' : 'saved');
      setTimeout(() => setSaveStatus('idle'), 10000);
      if (!auto) toast.success('Document saved successfully');
    } catch (error) {
      const defaultErrorMessage = 'Failed to save document';
      const message = error instanceof Error ? error.message : defaultErrorMessage;
      const isMissingTenant = message === 'No tenant ID found';
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 10000);
      if (isMissingTenant) {
        toast.error('Select a tenant to save documents');
      } else if (!auto) {
        toast.error(defaultErrorMessage);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return { save, isSaving, saveStatus };
}
