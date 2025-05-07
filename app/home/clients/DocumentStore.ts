import { uploadData } from 'aws-amplify/storage';
import { Err, Ok, Result } from 'ts-results';
import { db } from './Dexie';
import { getCurrentTenantId } from '../utils/tenant-utils';
import { sanitizeFileName } from '../utils/file-utils';
import { validateMarkdown } from '../utils/markdown-utils';
import { rateLimiter } from '../utils/rate-limiter';
import Dexie, { Table } from 'dexie';

export type SyncStatus = 'Synced' | 'Failed';

export interface VersionHistory {
  id: string;
  tenantId: string;
  path: string;
  version: number;
  timestamp: string;
  author: string;
  changeType: 'create' | 'update' | 'delete';
  metadata: {
    fileName: string;
    fileType: string;
    size: number;
    lastModified: string;
    version: number;
    checksum: string;
  };
  syncStatus: SyncStatus;
  updatedAt: string;
}

export interface Document {
  id: string;
  tenantId: string;
  path: string;
  content: string;
  version: number;
  metadata: {
    fileName: string;
    fileType: string;
    size: number;
    lastModified: string;
    version: number;
    checksum: string;
  };
  syncStatus: SyncStatus;
  updatedAt: string;
  syncError?: string;
}

export type CreateDocument = {
  path: string;
  content: string;
  metadata: {
    fileName: string;
    fileType: string;
    size: number;
    lastModified: string;
    version: number;
    checksum: string;
  };
};

type DocumentTable = Table<Document>;
type VersionTable = Table<VersionHistory>;

interface DocumentDB extends Omit<Dexie, 'table'> {
  table(name: 'documents'): DocumentTable;
  table(name: 'documentVersions'): VersionTable;
  table(name: string): DocumentTable | VersionTable;
}

function createDocumentStore(db: DocumentDB) {
  // Network status check
  const isOnline = () => navigator.onLine;

  // Content validation
  const validateContent = (content: string, fileName: string): Result<void, Error> => {
    if (!content) return Err(new Error('Content cannot be empty'));
    if (content.length > 10 * 1024 * 1024) return Err(new Error('Content too large'));
    
    const markdownValidation = validateMarkdown(content);
    if (markdownValidation.err) return Err(markdownValidation.val);
    
    const sanitizedFileName = sanitizeFileName(fileName);
    if (sanitizedFileName !== fileName) {
      return Err(new Error('Invalid file name'));
    }
    
    return Ok(undefined);
  };

  return {
    create: async (document: CreateDocument): Promise<Result<Document, Error>> => {
      try {
        if (!isOnline()) {
          return Err(new Error('Operation requires online connection'));
        }

        // Rate limiting
        if (!rateLimiter.checkLimit('create')) {
          return Err(new Error('Rate limit exceeded'));
        }

        const validation = validateContent(document.content, document.metadata.fileName);
        if (validation.err) return Err(validation.val);

        const tenantId = await getCurrentTenantId() || '';
        const documentId = document.metadata.fileName.replace(/\.md$/, '');
        const path = `documents/${tenantId}/${documentId}`;
        const id = `${path}#${tenantId}`;

        // Upload to S3
        const uploadResult = await uploadData({
          path,
          data: document.content,
          options: {
            contentType: 'text/markdown',
            metadata: {
              fileName: document.metadata.fileName,
              fileType: document.metadata.fileType,
              size: document.metadata.size.toString(),
              lastModified: document.metadata.lastModified,
              version: '1',
              checksum: document.metadata.checksum,
            },
          },
        }).result;

        if (!uploadResult) {
          return Err(new Error('Upload failed'));
        }

        // Create local record
        const doc: Document = {
          id,
          tenantId,
          path,
          content: document.content,
          version: 1,
          metadata: document.metadata,
          syncStatus: 'Synced',
          updatedAt: new Date().toISOString(),
        };

        const documentsTable = db.table('documents');
        await documentsTable.add(doc);

        // Create version history
        const versionHistory: VersionHistory = {
          id: `${path}#${tenantId}`,
          tenantId,
          path,
          version: 1,
          timestamp: new Date().toISOString(),
          author: 'system',
          changeType: 'create',
          metadata: document.metadata,
          syncStatus: 'Synced',
          updatedAt: new Date().toISOString(),
        };

        const versionsTable = db.table('documentVersions');
        await versionsTable.add(versionHistory);

        return Ok(doc);
      } catch (error) {
        console.error('[DocumentStore] create error:', error);
        return Err(error instanceof Error ? error : new Error('Unknown error'));
      }
    },
  };
}

export const documentStore = createDocumentStore(db as unknown as DocumentDB); 