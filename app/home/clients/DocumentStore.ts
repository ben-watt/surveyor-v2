import { uploadData, remove as removeStorage, getUrl } from 'aws-amplify/storage';
import { Err, Ok, Result } from 'ts-results';
import { getCurrentTenantId } from '../utils/tenant-utils';
import { sanitizeFileName } from '../utils/file-utils';
import { validateMarkdown } from '../utils/markdown-utils';
import { getCurrentUser } from 'aws-amplify/auth';
import client from './AmplifyDataClient';
import { Schema } from '@/amplify/data/resource';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const CreateDocumentSchema = z.object({
  id: z.string().optional(),
  displayName: z.string().optional(),
  content: z.string().max(10 * 1024 * 1024),
  metadata: z.object({
    fileName: z.string(),
    fileType: z.string(),
    size: z.number(),
    lastModified: z.string(),
  }),
  templateId: z.string().optional(),
});

type CreateDocument = z.infer<typeof CreateDocumentSchema>;

/**
 * DocumentRecord type for single-table design
 */
export type DocumentRecord = Schema['DocumentRecord']['type'];

function createDocumentStore() {
  // Network status check

  const isOnline = () => navigator.onLine;

  /**
   * Create a new document (writes #LATEST and v0)
   */
  const create = async (document: CreateDocument): Promise<Result<DocumentRecord, Error>> => {
    const validation = CreateDocumentSchema.safeParse(document);
    if (!validation.success) return Err(new Error(validation.error.message));

    if (!isOnline()) return Err(new Error('Cannot create document while offline'));
    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) return Err(new Error('No tenant ID found'));
      const user = await getCurrentUser();
      const documentId = document.id ?? uuidv4();
      const pk = `${tenantId}#${documentId}`;
      const now = new Date().toISOString();
      // Use .json extension if fileType is application/json, otherwise use .html
      // For initial version, use v0 suffix for consistency with update handler
      const fileExtension = document.metadata.fileType === 'application/json' ? '.json' : '.html';
      const path = `documents/${tenantId}/${documentId}/v0${fileExtension}`;
      // Upload to S3
      // map to content type
      const fileType = document.metadata.fileType;

      const contentType =
        fileType === 'application/json'
          ? 'application/json'
          : fileType === 'markdown'
            ? 'text/markdown'
            : 'text/html';
      const uploadResult = await uploadData({
        path,
        data: document.content,
        options: { contentType },
      });
      if (!uploadResult.result) return Err(new Error('Failed to upload document content'));
      // Write v0 version
      await client.models.DocumentRecord.create({
        pk,
        sk: 'v0',
        type: 'Version',
        version: 0,
        author: user.username,
        createdAt: now,
        changeType: 'create',
        path,
        fileSize: document.metadata.size,
        fileType: document.metadata.fileType,
        fileName: document.metadata.fileName,
        tenantId,
        editors: [],
        viewers: [],
      });
      // Write #LATEST
      const latest = await client.models.DocumentRecord.create({
        pk,
        sk: '#LATEST',
        type: 'Document',
        id: documentId,
        displayName: document.displayName || documentId,
        fileName: document.metadata.fileName,
        fileType: document.metadata.fileType,
        size: document.metadata.size,
        currentVersion: 0,
        lastModified: document.metadata.lastModified,
        createdAt: now,
        updatedAt: now,
        tenantId,
        editors: [],
        viewers: [],
        templateId: document.templateId,
      });
      if (!latest.data) return Err(new Error('Failed to create document metadata'));
      return Ok(latest.data);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error('Failed to create document'));
    }
  };

  /**
   * Update document: creates new version, updates #LATEST, prunes to 10 versions
   */
  const update = async (
    id: string,
    content: string,
    templateId?: string,
    changeType: string = 'update',
  ): Promise<Result<DocumentRecord, Error>> => {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return Err(new Error('No tenant ID found'));
    const pk = `${tenantId}#${id}`;

    if (!isOnline()) return Err(new Error('Cannot update document while offline'));

    try {
      // Update the #LATEST record with the new templateId if provided
      if (templateId) {
        await client.models.DocumentRecord.update({
          pk,
          sk: '#LATEST',
          templateId,
        });
      }
      const mutationRes = await client.mutations.updateDocumentWithVersioning({
        pk,
        content,
        changeType,
      });
      if (mutationRes.errors)
        return Err(new Error(mutationRes.errors.map((e) => e.message).join(', ')));
      if (!mutationRes.data) return Err(new Error('Failed to update document metadata'));
      return Ok(mutationRes.data as DocumentRecord);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error('Failed to update document'));
    }
  };

  /**
   * Get latest document metadata
   */
  const get = async (id: string): Promise<Result<DocumentRecord, Error>> => {
    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) return Err(new Error('No tenant ID found'));
      const pk = `${tenantId}#${id}`;
      const result = await client.models.DocumentRecord.get({ pk, sk: '#LATEST' });
      if (!result.data) return Err(new Error('Document not found'));
      return Ok(result.data as DocumentRecord);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error('Failed to get document'));
    }
  };

  /**
   * List all documents
   */
  const list = async (): Promise<Result<DocumentRecord[], Error>> => {
    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) return Err(new Error('No tenant ID found'));
      const result = await client.models.DocumentRecord.listDocumentRecordByTenantIdAndSk({
        tenantId,
        sk: { eq: '#LATEST' },
      });
      return Ok(result.data as DocumentRecord[]);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error('Failed to list documents'));
    }
  };

  /**
   * Remove all records for a document (all versions and metadata)
   */
  const remove = async (id: string): Promise<Result<void, Error>> => {
    if (!isOnline()) return Err(new Error('Cannot delete document while offline'));

    const tenantId = await getCurrentTenantId();
    if (!tenantId) return Err(new Error('No tenant ID found'));
    const pk = `${tenantId}#${id}`;

    try {
      // List all items for pk
      const itemsRes = await client.models.DocumentRecord.list({ pk });
      const items = itemsRes.data as DocumentRecord[];

      console.log('[remove] items', items);
      // Delete from S3 and DynamoDB
      for (const item of items) {
        if (item.path) await removeStorage({ path: item.path });
        await client.models.DocumentRecord.delete({ pk, sk: item.sk });
      }
      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error('Failed to delete document'));
    }
  };

  /**
   * Get document content (latest)
   */
  const getContent = async (id: string): Promise<Result<string, Error>> => {
    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) return Err(new Error('No tenant ID found'));
      const pk = `${tenantId}#${id}`;
      const latestRes = await client.models.DocumentRecord.get({ pk, sk: '#LATEST' });
      if (!latestRes.data) return Err(new Error('Document not found'));
      const latest = latestRes.data as DocumentRecord;
      const versionSk = `v${latest.currentVersion ?? 0}`;
      const versionRes = await client.models.DocumentRecord.get({ pk, sk: versionSk });
      if (!versionRes.data) return Err(new Error('Version not found'));
      if (!versionRes.data.path) return Err(new Error('Version path not found'));

      const url = await getUrl({ path: versionRes.data.path });
      const content = await fetch(url.url);
      return Ok(await content.text());
    } catch (error) {
      return Err(error instanceof Error ? error : new Error('Failed to get document content'));
    }
  };

  /**
   * Update document content (creates new version)
   */
  const updateContent = async (
    id: string,
    content: string,
    templateId?: string,
  ): Promise<Result<DocumentRecord, Error>> => {
    return update(id, content, templateId, 'update');
  };

  /**
   * Rename document (updates displayName on #LATEST)
   */
  const rename = async (id: string, newName: string): Promise<Result<DocumentRecord, Error>> => {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return Err(new Error('No tenant ID found'));
    const pk = `${tenantId}#${id}`;

    if (!isOnline()) return Err(new Error('Cannot rename document while offline'));
    if (!newName) return Err(new Error('New name cannot be empty'));
    try {
      const updated = await client.models.DocumentRecord.update({
        pk,
        sk: '#LATEST',
        displayName: newName,
      });
      if (!updated.data) return Err(new Error('Failed to update document metadata'));
      return Ok(updated.data as DocumentRecord);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error('Failed to rename document'));
    }
  };

  /**
   * List all versions for a document (sk starts with 'v')
   */
  const listVersions = async (id: string): Promise<Result<DocumentRecord[], Error>> => {
    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) return Err(new Error('No tenant ID found'));
      const pk = `${tenantId}#${id}`;
      // List all items for pk where sk starts with 'v'
      const itemsRes = await client.models.DocumentRecord.list({ pk });
      const items = (itemsRes.data as DocumentRecord[]).filter(
        (item) => typeof item.sk === 'string' && item.sk.startsWith('v'),
      );
      // Sort by version ascending (v0, v1, ...)
      items.sort((a, b) => {
        const va = parseInt((a.sk as string).slice(1), 10);
        const vb = parseInt((b.sk as string).slice(1), 10);
        return va - vb;
      });
      return Ok(items);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error('Failed to list versions'));
    }
  };

  /**
   * Get content for a specific version
   */
  const getVersionContent = async (id: string, version: number): Promise<Result<string, Error>> => {
    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) return Err(new Error('No tenant ID found'));
      const pk = `${tenantId}#${id}`;
      const sk = `v${version}`;
      const versionRes = await client.models.DocumentRecord.get({ pk, sk });
      if (!versionRes.data) return Err(new Error('Version not found'));
      if (!versionRes.data.path) return Err(new Error('Version path not found'));
      const url = await getUrl({ path: versionRes.data.path });
      const content = await fetch(url.url);
      return Ok(await content.text());
    } catch (error) {
      return Err(error instanceof Error ? error : new Error('Failed to get version content'));
    }
  };

  return {
    create,
    update,
    remove,
    get,
    list,
    getContent,
    updateContent,
    rename,
    listVersions,
    getVersionContent,
  };
}

export const documentStore = createDocumentStore();
