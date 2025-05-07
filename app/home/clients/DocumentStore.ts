import { uploadData, remove, getUrl } from 'aws-amplify/storage';
import { generateClient } from 'aws-amplify/data';
import { Err, Ok, Result } from 'ts-results';
import { getCurrentTenantId } from '../utils/tenant-utils';
import { sanitizeFileName } from '../utils/file-utils';
import { validateMarkdown } from '../utils/markdown-utils';
import { rateLimiter } from '../utils/rate-limiter';
import { type Schema } from '@/amplify/data/resource';
import { getCurrentUser } from 'aws-amplify/auth';

// Types for store operations
type CreateDocument = {
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

type UpdateDocument = Partial<DynamoDocument> & { id: string };

interface DynamoDocument {
  id: string;
  displayName: string;
  fileName: string;
  fileType: string;
  size: number;
  version: number;
  lastModified: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  owner: string;
  editors: string[];
  viewers: string[];
  syncStatus: string;
  syncError?: string;
  metadata: {
    checksum: string;
    tags?: string[];
    description?: string;
  };
  versionHistory: {
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
  }[];
}

function createDocumentStore() {
  // Initialize data client
  let _dataClient: ReturnType<typeof generateClient<Schema>> | null = null;
  const getDataClient = () => {
    if (!_dataClient) {
      _dataClient = generateClient<Schema>();
    }
    return _dataClient;
  };

  // Network status check
  const isOnline = () => navigator.onLine;

  // Content validation
  const validateContent = (content: string, fileName: string): Result<void, Error> => {
    if (!content) return Err(new Error('Content cannot be empty'));
    if (content.length > 10 * 1024 * 1024) return Err(new Error('Content too large'));
    
    const validationResult = validateMarkdown(content);
    if (!validationResult.ok) {
      return Err(new Error(`Invalid markdown: ${validationResult.val}`));
    }

    const sanitizedFileName = sanitizeFileName(fileName);
    if (sanitizedFileName !== fileName) {
      return Err(new Error('Invalid file name'));
    }
    
    return Ok(undefined);
  };

  // Create document
  const create = async (document: CreateDocument): Promise<Result<DynamoDocument, Error>> => {
    // Validate content first
    const validation = validateContent(document.content, document.metadata.fileName);
    if (!validation.ok) {
      return Err(validation.val);
    }

    if (!isOnline()) {
      return Err(new Error('Cannot create document while offline'));
    }

    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        return Err(new Error('No tenant ID found'));
      }

      const user = await getCurrentUser();
      const documentId = document.metadata.fileName.replace(/\.md$/, '');
      const path = `documents/${tenantId}/${documentId}`;

      // Upload to S3
      const uploadResult = await uploadData({
        key: path,
        data: document.content,
        options: {
          contentType: 'text/markdown',
          accessLevel: 'private',
        },
      });

      if (!uploadResult.result) {
        return Err(new Error('Failed to upload document content'));
      }

      // Create DynamoDB record
      const now = new Date().toISOString();
      const result = await getDataClient().models.Documents.create({
        id: documentId,
        displayName: documentId,
        fileName: document.metadata.fileName,
        fileType: document.metadata.fileType,
        size: document.metadata.size,
        version: document.metadata.version,
        lastModified: document.metadata.lastModified,
        createdAt: now,
        updatedAt: now,
        tenantId,
        owner: user.username,
        editors: [user.username],
        viewers: [user.username],
        syncStatus: 'Synced',
        metadata: {
          checksum: document.metadata.checksum,
        },
        versionHistory: [{
          version: document.metadata.version,
          timestamp: now,
          author: user.username,
          changeType: 'create',
          metadata: document.metadata,
        }],
      });

      if (!result.data) {
        return Err(new Error('Failed to create document record'));
      }

      return Ok(result.data as DynamoDocument);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error('Failed to create document'));
    }
  };

  // Update document
  const update = async (document: UpdateDocument): Promise<Result<DynamoDocument, Error>> => {
    if (!isOnline()) {
      return Err(new Error('Cannot update document while offline'));
    }

    try {
      const user = await getCurrentUser();
      const now = new Date().toISOString();
      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        return Err(new Error('No tenant ID found'));
      }

      const result = await getDataClient().models.Documents.update({
        ...document,
        tenantId,
        updatedAt: now,
      });

      if (!result.data) {
        return Err(new Error('Failed to update document record'));
      }

      return Ok(result.data as DynamoDocument);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error('Failed to update document'));
    }
  };

  // Delete document
  const remove = async (id: string): Promise<Result<void, Error>> => {
    if (!isOnline()) {
      return Err(new Error('Cannot delete document while offline'));
    }

    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        return Err(new Error('No tenant ID found'));
      }

      const path = `documents/${tenantId}/${id}`;

      // Delete from S3
      await remove(path);

      // Delete from DynamoDB
      await getDataClient().models.Documents.delete({ id, tenantId });

      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error('Failed to delete document'));
    }
  };

  // Get document
  const get = async (id: string): Promise<Result<DynamoDocument, Error>> => {
    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        return Err(new Error('No tenant ID found'));
      }

      const result = await getDataClient().models.Documents.get({ id, tenantId });
      
      if (!result.data) {
        return Err(new Error('Document not found'));
      }

      return Ok(result.data as DynamoDocument);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error('Failed to get document'));
    }
  };

  // List documents
  const list = async (): Promise<Result<DynamoDocument[], Error>> => {
    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        return Err(new Error('No tenant ID found'));
      }

      const result = await getDataClient().models.Documents.list({ tenantId });
      return Ok(result.data as DynamoDocument[]);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error('Failed to list documents'));
    }
  };

  // Get document content
  const getContent = async (id: string): Promise<Result<string, Error>> => {
    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        return Err(new Error('No tenant ID found'));
      }

      const path = `documents/${tenantId}/${id}`;
      const url = await getUrl({ key: path });
      const response = await fetch(url.url);
      const content = await response.text();
      return Ok(content);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error('Failed to get document content'));
    }
  };

  // Update document content
  const updateContent = async (id: string, content: string): Promise<Result<DynamoDocument, Error>> => {
    if (!isOnline()) {
      return Err(new Error('Cannot update document while offline'));
    }

    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        return Err(new Error('No tenant ID found'));
      }

      const user = await getCurrentUser();
      const path = `documents/${tenantId}/${id}`;
      const now = new Date().toISOString();

      // Upload to S3
      await uploadData({
        key: path,
        data: content,
        options: {
          contentType: 'text/markdown',
          accessLevel: 'private',
        },
      });

      // Update DynamoDB record
      const result = await getDataClient().models.Documents.get({ id, tenantId });
      if (!result.data) {
        return Err(new Error('Document not found'));
      }

      const doc = result.data as DynamoDocument;
      const updateResult = await getDataClient().models.Documents.update({
        id,
        tenantId,
        version: doc.version + 1,
        lastModified: now,
        updatedAt: now,
        versionHistory: [
          ...doc.versionHistory,
          {
            version: doc.version + 1,
            timestamp: now,
            author: user.username,
            changeType: 'update',
            metadata: {
              fileName: doc.fileName,
              fileType: doc.fileType,
              size: content.length,
              lastModified: now,
              version: doc.version + 1,
              checksum: '', // TODO: Calculate checksum
            },
          },
        ],
      });

      if (!updateResult.data) {
        return Err(new Error('Failed to update document record'));
      }

      return Ok(updateResult.data as DynamoDocument);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error('Failed to update document content'));
    }
  };

  // Rename document
  const rename = async (id: string, newName: string): Promise<Result<DynamoDocument, Error>> => {
    if (!isOnline()) {
      return Err(new Error('Cannot rename document while offline'));
    }

    if (!newName) {
      return Err(new Error('New name cannot be empty'));
    }

    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        return Err(new Error('No tenant ID found'));
      }

      const user = await getCurrentUser();
      const now = new Date().toISOString();

      const result = await getDataClient().models.Documents.get({ id, tenantId });
      if (!result.data) {
        return Err(new Error('Document not found'));
      }

      const doc = result.data as DynamoDocument;
      const updateResult = await getDataClient().models.Documents.update({
        id,
        tenantId,
        displayName: newName,
        updatedAt: now,
        versionHistory: [
          ...doc.versionHistory,
          {
            version: doc.version + 1,
            timestamp: now,
            author: user.username,
            changeType: 'update',
            metadata: {
              fileName: doc.fileName,
              fileType: doc.fileType,
              size: doc.size,
              lastModified: now,
              version: doc.version + 1,
              checksum: doc.metadata.checksum,
            },
          },
        ],
      });

      if (!updateResult.data) {
        return Err(new Error('Failed to update document record'));
      }

      return Ok(updateResult.data as DynamoDocument);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error('Failed to rename document'));
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
  };
}

export const documentStore = createDocumentStore(); 