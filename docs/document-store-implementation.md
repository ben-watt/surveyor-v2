# Document Store Implementation Plan

## Overview

The document store will provide a robust system for managing markdown documents with version control, online-only operations, and S3 integration. This implementation will follow the project's offline-first architecture while maintaining strict online requirements for document operations.

## Architecture

### Storage Layer
- **Remote Storage**: 
  - AWS S3 via Amplify for document content
  - DynamoDB via Amplify Data for document metadata, access control, and version history
- **Folder Structure**: `/documents/{tenantId}/{documentId}` in S3

### Data Model

```typescript
// DynamoDB Schema (via Amplify Data)
interface DynamoDocument {
  id: string;              // Unique identifier
  displayName: string;     // User-friendly display name
  fileName: string;        // Original file name (for storage)
  fileType: string;        // File type (e.g., 'markdown')
  size: number;            // File size in bytes
  version: number;         // Current version number
  lastModified: string;    // Last modified timestamp
  createdAt: string;       // Creation timestamp
  updatedAt: string;       // Last update timestamp
  tenantId: string;        // Tenant isolation
  owner: string;           // Document owner
  editors: string[];       // List of editor usernames
  viewers: string[];       // List of viewer usernames
  syncStatus: string;      // Synced | Failed
  syncError?: string;      // Error message if sync fails
  metadata: {
    checksum: string;      // Content checksum
    tags?: string[];       // Optional document tags
    description?: string;  // Optional document description
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
import { generateClient } from 'aws-amplify/data';
import { Err, Ok, Result } from 'ts-results';
import { getCurrentTenantId } from '../utils/tenant-utils';
import { sanitizeFileName } from '../utils/file-utils';
import { validateMarkdown } from '../utils/markdown-utils';
import { rateLimiter } from '../utils/rate-limiter';
import { type Schema } from '@/amplify/data/resource';

const dataClient = generateClient<Schema>();

function createDocumentStore() {
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
    create: async (document: CreateDocument): Promise<Result<DynamoDocument, Error>> => {
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
        const fileName = document.metadata.fileName;
        const displayName = fileName.replace(/\.md$/, '');
        const path = `documents/${tenantId}/${fileName}`;
        const version = 1;

        // Upload to S3
        const uploadResult = await uploadData({
          path,
          data: document.content,
          options: {
            contentType: 'text/markdown',
            metadata: {
              ...document.metadata,
              version: version.toString(),
              checksum: document.metadata.checksum,
            },
          },
        }).result;

        if (!uploadResult) {
          return Err(new Error('Upload failed'));
        }

        // Create DynamoDB record
        const dynamoDoc: DynamoDocument = {
          id: path,
          displayName,
          fileName,
          fileType: document.metadata.fileType,
          size: document.metadata.size,
          version,
          lastModified: document.metadata.lastModified,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tenantId,
          owner: 'system', // TODO: Get from auth context
          editors: [],     // TODO: Get from auth context or settings
          viewers: [],     // TODO: Get from auth context or settings
          syncStatus: 'Synced',
          metadata: {
            checksum: document.metadata.checksum,
          },
          versionHistory: [{
            version,
            timestamp: new Date().toISOString(),
            author: 'system', // TODO: Get from auth context
            changeType: 'create',
            metadata: document.metadata,
          }],
        };

        await dataClient.models.Documents.create(dynamoDoc);
        return Ok(dynamoDoc);
      } catch (error) {
        return Err(error instanceof Error ? error : new Error('Unknown error'));
      }
    },

    rename: async (
      documentId: string,
      newDisplayName: string
    ): Promise<Result<void, Error>> => {
      if (!isOnline()) {
        return Err(new Error('Operation requires online connection'));
      }

      try {
        // Validate new name
        if (!newDisplayName || newDisplayName.trim().length === 0) {
          return Err(new Error('Display name cannot be empty'));
        }

        // Get current document
        const doc = await dataClient.models.Documents.get({
          id: documentId,
          tenantId: await getCurrentTenantId(),
        });

        if (!doc) {
          return Err(new Error('Document not found'));
        }

        // Update display name
        await dataClient.models.Documents.update({
          id: documentId,
          tenantId: doc.tenantId,
          displayName: newDisplayName,
          updatedAt: new Date().toISOString(),
        });

        return Ok(undefined);
      } catch (error) {
        return Err(error instanceof Error ? error : new Error('Failed to rename document'));
      }
    },

    updateAccess: async (
      documentId: string,
      updates: {
        editors?: string[];
        viewers?: string[];
      }
    ): Promise<Result<void, Error>> => {
      // Implementation
    },

    getAccess: async (documentId: string): Promise<Result<{
      owner: string;
      editors: string[];
      viewers: string[];
    }, Error>> => {
      // Implementation
    },

    list: async (prefix: string): Promise<Result<DynamoDocument[], Error>> => {
      // Implementation
    },

    getVersionHistory: async (
      documentId: string,
      page: number = 1,
      pageSize: number = 10
    ): Promise<Result<DynamoDocument['versionHistory'], Error>> => {
      // Implementation
    },
  };
}

export const documentStore = createDocumentStore();
```

## Testing Implementation

### Unit Tests

```typescript
describe('DocumentStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
        expect(result.val.displayName).toBe('test');
        expect(result.val.fileName).toBe('test.md');
        expect(result.val.versionHistory).toHaveLength(1);
        expect(result.val.versionHistory[0].changeType).toBe('create');
      }
    });

    // ... existing tests ...
  });

  // ... existing test sections ...
});
```

## Dependencies

- AWS Amplify
- TypeScript
- ts-results (for Result type)
- AWS S3
- AWS DynamoDB (via Amplify Data)

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
   - DynamoDB tenant-based access control
   - Role-based access control (owner, editor, viewer)

## Success Criteria

1. **Functional Requirements**
   - All CRUD operations working
   - Version control functioning
   - Online-only operations enforced
   - Error handling working
   - DynamoDB metadata synchronization successful
   - Access control management working
   - Document renaming working correctly

2. **Non-Functional Requirements**
   - Performance within acceptable limits
   - Storage usage optimized
   - Error rates below threshold
   - Documentation complete
   - DynamoDB consistency maintained
   - Access control changes properly synchronized
   - Rename operations properly synchronized 