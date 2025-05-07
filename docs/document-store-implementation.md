# Document Store Implementation Plan

## Overview

The document store will provide a robust system for managing markdown documents with version control, online-only operations, and S3 integration. This implementation will follow the project's offline-first architecture while maintaining strict online requirements for document operations.

## Architecture

### Storage Layer
- **Local Storage**: Dexie (IndexedDB) for temporary storage and version history
- **Remote Storage**: AWS S3 via Amplify
- **Folder Structure**: `/documents/{tenantId}/{documentId}` in S3

### Data Model

```typescript
interface Document {
  id: string;              // Unique identifier
  tenantId: string;        // Tenant isolation
  path: string;            // S3 path
  content: string;         // Document content
  version: number;         // Current version number
  metadata: {
    fileName: string;
    fileType: string;
    size: number;
    lastModified: string;
    version: number;
    checksum: string;      // For content validation
  };
  syncStatus: SyncStatus;  // Synced | Failed
  updatedAt: string;
  syncError?: string;      // Error message if sync fails
}

interface VersionHistory {
  version: number;
  timestamp: string;
  author: string;
  changeType: 'create' | 'update' | 'delete';
  metadata: Document['metadata'];
}

// Types for store operations
type CreateDocument = Omit<Document, 'id' | 'tenantId' | 'version' | 'syncStatus' | 'updatedAt'>;
type UpdateDocument = Partial<Document> & { id: string };
type UploadProgress = {
  progress: number;
  status: 'uploading' | 'completed' | 'failed';
  error?: string;
};
```

## Technical Implementation

### 1. Store Setup

```typescript
// app/home/clients/DocumentStore.ts
import { uploadData, remove, getUrl } from 'aws-amplify/storage';
import { Err, Ok, Result } from 'ts-results';
import { db } from './Dexie';
import { getCurrentTenantId } from '../utils/tenant-utils';
import { sanitizeFileName } from '../utils/file-utils';
import { validateMarkdown } from '../utils/markdown-utils';
import { rateLimiter } from '../utils/rate-limiter';

function createDocumentStore(db: Dexie) {
  const table = db.table<Document>('documents');
  const versionTable = db.table<VersionHistory>('documentVersions');
  const cache = new Map<string, { document: Document; timestamp: number }>();

  // Network status check with retry logic
  const isOnline = () => navigator.onLine;
  const withRetry = async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> => {
    let lastError: Error | undefined;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (!isTransientError(error)) throw error;
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
    throw lastError;
  };

  // Enhanced content validation
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

  // Cache management
  const getCachedDocument = (path: string): Document | undefined => {
    const cached = cache.get(path);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached.document;
    }
    cache.delete(path);
    return undefined;
  };

  return {
    // Enhanced create operation
    create: async (document: CreateDocument): Promise<Result<Document, Error>> => {
      if (!isOnline()) {
        return Err(new Error('Operation requires online connection'));
      }

      // Rate limiting
      if (!rateLimiter.checkLimit('create')) {
        return Err(new Error('Rate limit exceeded'));
      }

      const validation = validateContent(document.content, document.metadata.fileName);
      if (validation.err) return Err(validation.val);

      try {
        const tenantId = await getCurrentTenantId();
        const path = `documents/${tenantId}/${document.metadata.fileName}`;
        const version = await getNextVersion(path);

        // Upload to S3 with retry
        const uploadResult = await withRetry(async () => {
          const result = await uploadData({
            path,
            data: document.content,
            options: {
              contentType: 'text/markdown',
              metadata: {
                ...document.metadata,
                version: version.toString(),
                checksum: await calculateChecksum(document.content),
              },
            },
          }).result;
          return result;
        });

        if (!uploadResult) {
          return Err(new Error('Upload failed'));
        }

        // Create local record
        const doc: Document = {
          id: path,
          tenantId,
          path,
          content: document.content,
          version,
          metadata: document.metadata,
          syncStatus: 'Synced',
          updatedAt: new Date().toISOString(),
        };

        await table.add(doc);
        await versionTable.add({
          path,
          version,
          timestamp: doc.updatedAt,
          author: 'system', // TODO: Get from auth context
          changeType: 'create',
          metadata: doc.metadata,
        });

        // Update cache
        cache.set(path, { document: doc, timestamp: Date.now() });

        return Ok(doc);
      } catch (error) {
        return Err(error instanceof Error ? error : new Error('Unknown error'));
      }
    },

    // New operations
    update: async (document: UpdateDocument): Promise<Result<Document, Error>> => {
      // Implementation
    },

    delete: async (path: string): Promise<Result<void, Error>> => {
      // Implementation
    },

    list: async (prefix: string): Promise<Result<Document[], Error>> => {
      // Implementation
    },

    cleanup: async (): Promise<Result<void, Error>> => {
      // Implementation
    },
  };
}

export const documentStore = createDocumentStore(db);
```

### 2. Version Control Implementation

```typescript
// Enhanced version control
const versionControl = {
  getVersion: async (path: string, version: number): Promise<Result<Document, Error>> => {
    try {
      const versionHistory = await versionTable
        .where(['path', 'version'])
        .equals([path, version])
        .first();

      if (!versionHistory) {
        return Err(new Error('Version not found'));
      }

      // Get content from S3
      const url = await getUrl({
        path: `${path}/v${version}`,
      });

      const response = await fetch(url.url.href);
      const content = await response.text();

      return Ok({
        id: path,
        tenantId: versionHistory.metadata.tenantId,
        path,
        content,
        version: versionHistory.version,
        metadata: versionHistory.metadata,
        syncStatus: 'Synced',
        updatedAt: versionHistory.timestamp,
      });
    } catch (error) {
      return Err(error instanceof Error ? error : new Error('Failed to retrieve version'));
    }
  },

  rollback: async (path: string, version: number): Promise<Result<Document, Error>> => {
    if (!isOnline()) {
      return Err(new Error('Rollback requires online connection'));
    }

    try {
      const targetVersion = await versionControl.getVersion(path, version);
      if (targetVersion.err) return targetVersion;

      const newVersion = await getNextVersion(path);
      const doc = targetVersion.val;

      // Upload rolled back version
      await uploadData({
        path,
        data: doc.content,
        options: {
          contentType: 'text/markdown',
          metadata: {
            ...doc.metadata,
            version: newVersion.toString(),
          },
        },
      });

      // Update local records
      await table.put({
        ...doc,
        version: newVersion,
        updatedAt: new Date().toISOString(),
      });

      await versionTable.add({
        path,
        version: newVersion,
        timestamp: new Date().toISOString(),
        author: 'system', // TODO: Get from auth context
        changeType: 'update',
        metadata: doc.metadata,
      });

      return Ok(doc);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error('Rollback failed'));
    }
  },

  // New methods
  pruneVersions: async (path: string, keepLast: number = 10): Promise<Result<void, Error>> => {
    try {
      const versions = await versionTable
        .where('path')
        .equals(path)
        .sortBy('version');

      if (versions.length <= keepLast) return Ok(undefined);

      const toDelete = versions.slice(0, versions.length - keepLast);
      for (const version of toDelete) {
        await remove({
          path: `${path}/v${version.version}`,
        });
        await versionTable.delete([path, version.version]);
      }

      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error('Failed to prune versions'));
    }
  },

  getVersionHistory: async (
    path: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<Result<VersionHistory[], Error>> => {
    try {
      const versions = await versionTable
        .where('path')
        .equals(path)
        .sortBy('version')
        .reverse()
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .toArray();

      return Ok(versions);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error('Failed to get version history'));
    }
  },
};
```

### 3. Error Handling Implementation

```typescript
// Enhanced error handling
enum DocumentErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  S3_ERROR = 'S3_ERROR',
  VERSION_ERROR = 'VERSION_ERROR',
  CONTENT_ERROR = 'CONTENT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CLEANUP_ERROR = 'CLEANUP_ERROR',
}

class DocumentError extends Error {
  constructor(
    public type: DocumentErrorType,
    message: string,
    public originalError?: Error,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'DocumentError';
  }
}

const errorHandling = {
  handleS3Error: (error: any): DocumentError => {
    if (error.name === 'StorageError') {
      return new DocumentError(
        DocumentErrorType.S3_ERROR,
        `S3 operation failed: ${error.message}`,
        error
      );
    }
    return new DocumentError(
      DocumentErrorType.S3_ERROR,
      'Unknown S3 error',
      error
    );
  },

  handleVersionError: (error: any): DocumentError => {
    return new DocumentError(
      DocumentErrorType.VERSION_ERROR,
      `Version operation failed: ${error.message}`,
      error
    );
  },

  handleValidationError: (error: any): DocumentError => {
    return new DocumentError(
      DocumentErrorType.VALIDATION_ERROR,
      `Validation failed: ${error.message}`,
      error,
      false
    );
  },

  handleRateLimitError: (error: any): DocumentError => {
    return new DocumentError(
      DocumentErrorType.RATE_LIMIT_ERROR,
      'Rate limit exceeded',
      error,
      true
    );
  },

  isTransientError: (error: any): boolean => {
    if (error instanceof DocumentError) {
      return error.retryable;
    }
    return error.name === 'NetworkError' || error.name === 'StorageError';
  },
};
```

### 4. Upload Progress Implementation

```typescript
// Enhanced upload progress
const uploadProgress = {
  track: async (
    path: string,
    content: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<Result<Document, Error>> => {
    try {
      const uploadTask = uploadData({
        path,
        data: content,
        options: {
          contentType: 'text/markdown',
        },
      });

      uploadTask.on('progress', (progress) => {
        onProgress?.({
          progress: progress.loaded / progress.total,
          status: 'uploading',
        });
      });

      const result = await uploadTask.result;
      onProgress?.({ progress: 1, status: 'completed' });

      return Ok(/* ... */);
    } catch (error) {
      onProgress?.({
        progress: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Upload failed',
      });
      return Err(error instanceof Error ? error : new Error('Upload failed'));
    }
  },

  // New methods
  cancel: async (path: string): Promise<void> => {
    // Implementation
  },

  resume: async (path: string): Promise<Result<Document, Error>> => {
    // Implementation
  },

  cleanup: async (path: string): Promise<void> => {
    // Implementation
  },
};
```

## Testing Implementation

### Unit Tests

```typitten
// Enhanced test suite
describe('DocumentStore', () => {
  beforeEach(async () => {
    await db.documents.clear();
    await db.documentVersions.clear();
  });

  describe('create', () => {
    it('should create document when online', async () => {
      const doc = {
        content: '# Test',
        metadata: {
          fileName: 'test.md',
          fileType: 'markdown',
          size: 6,
          lastModified: new Date().toISOString(),
          version: 1,
          checksum: 'abc123',
        },
      };

      const result = await documentStore.create(doc);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.val.version).toBe(1);
        expect(result.val.syncStatus).toBe('Synced');
      }
    });

    it('should fail when offline', async () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', { value: false });

      const result = await documentStore.create(/* ... */);
      expect(result.err).toBe(true);
      if (result.err) {
        expect(result.val.message).toContain('online connection');
      }
    });
  });

  describe('validation', () => {
    it('should validate markdown content', async () => {
      // Implementation
    });

    it('should sanitize file names', async () => {
      // Implementation
    });
  });

  describe('version control', () => {
    it('should prune old versions', async () => {
      // Implementation
    });

    it('should paginate version history', async () => {
      // Implementation
    });
  });

  describe('error handling', () => {
    it('should handle transient errors with retry', async () => {
      // Implementation
    });

    it('should handle rate limiting', async () => {
      // Implementation
    });
  });
});
```

## Dependencies

- AWS Amplify
- Dexie.js
- TypeScript
- ts-results (for Result type)
- AWS S3

## Security Considerations

1. **Data Protection**
   - Content encryption
   - Secure transmission
   - Access control
   - Audit logging

2. **Tenant Isolation**
   - Strict path separation
   - Access validation
   - Data segregation

## Success Criteria

1. **Functional Requirements**
   - All CRUD operations working
   - Version control functioning
   - Online-only operations enforced
   - Error handling working

2. **Non-Functional Requirements**
   - Performance within acceptable limits
   - Storage usage optimized
   - Error rates below threshold
   - Documentation complete 