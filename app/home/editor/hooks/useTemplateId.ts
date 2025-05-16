import { useEffect, useState } from 'react';
import { documentStore } from '@/app/home/clients/DocumentStore';

/**
 * Fetches the templateId for a document, using the initial value if provided,
 * or fetching from the documentStore if not.
 * @param id The document ID
 * @param initialTemplateId The initial templateId, if available
 * @returns The resolved templateId, or undefined if not yet loaded
 */
export function useTemplateId(id: string, initialTemplateId?: string): string | undefined {
  const [templateId, setTemplateId] = useState<string | undefined>(initialTemplateId);

  useEffect(() => {
    if (!templateId && id) {
      documentStore.get(id).then(result => {
        if (result.ok && result.val?.templateId) {
          setTemplateId(result.val.templateId);
        }
      });
    }
  }, [id, templateId]);

  return templateId;
} 