import { documentStore } from '../DocumentStore';
import { uploadData, remove, getUrl } from 'aws-amplify/storage';
import { generateClient } from 'aws-amplify/data';
import { getCurrentTenantId } from '../../utils/tenant-utils';
import { getCurrentUser } from 'aws-amplify/auth';
import { validateMarkdown } from '../../utils/markdown-utils';
import { sanitizeFileName } from '../../utils/file-utils';
import { Ok } from 'ts-results';

// Mock dependencies
jest.mock('aws-amplify/storage', () => ({
  uploadData: jest.fn(),
  remove: jest.fn(),
  getUrl: jest.fn(),
}));

jest.mock('aws-amplify/data', () => ({
  generateClient: jest.fn(),
}));

jest.mock('../../utils/tenant-utils', () => ({
  getCurrentTenantId: jest.fn(),
}));

jest.mock('aws-amplify/auth', () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock('../../utils/markdown-utils', () => ({
  validateMarkdown: jest.fn(),
}));

jest.mock('../../utils/file-utils', () => ({
  sanitizeFileName: jest.fn(),
}));

// Mock the AmplifyDataClient
jest.mock('../AmplifyDataClient', () => ({
  __esModule: true,
  default: {
    models: {
      Documents: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        get: jest.fn(),
        list: jest.fn(),
      },
    },
  },
}));

// Import the mocked client
import client from '../AmplifyDataClient';

describe('DocumentStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (generateClient as jest.Mock).mockReturnValue({
      models: {
        DocumentRecord: client.models.DocumentRecord,
      },
    });
    (getCurrentTenantId as jest.Mock).mockResolvedValue('test-tenant');
    (getCurrentUser as jest.Mock).mockResolvedValue({ username: 'test-user' });
    (uploadData as jest.Mock).mockResolvedValue({ result: true });
    (remove as jest.Mock).mockResolvedValue(undefined);
    (getUrl as jest.Mock).mockResolvedValue({ url: 'https://test-url.com' });
    (validateMarkdown as jest.Mock).mockReturnValue(Ok(undefined));
    (sanitizeFileName as jest.Mock).mockImplementation((name) => name);
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  describe('create', () => {
    it('should create a document when online', async () => {
      const mockDocument = {
        content: '# Test Document\n\nThis is a test document.',
        metadata: {
          fileName: 'test.md',
          fileType: 'markdown',
          size: 100,
          lastModified: '2024-01-01T00:00:00Z',
          version: 1,
          checksum: 'test-checksum',
        },
      };

      const mockCreatedDoc = {
        id: 'test',
        displayName: 'test',
        fileName: 'test.md',
        fileType: 'markdown',
        size: 100,
        version: 1,
        lastModified: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        tenantId: 'test-tenant',
        owner: 'test-user',
        editors: ['test-user'],
        viewers: ['test-user'],
        syncStatus: 'Synced',
        metadata: {
          checksum: 'test-checksum',
        },
        versionHistory: [{
          version: 1,
          timestamp: '2024-01-01T00:00:00Z',
          author: 'test-user',
          changeType: 'create',
          metadata: {
            fileName: 'test.md',
            fileType: 'markdown',
            size: 100,
            lastModified: '2024-01-01T00:00:00Z',
            version: 1,
            checksum: 'test-checksum',
          },
        }],
      };

      // Mock the create method to return the expected structure
      (client.models.DocumentRecord.create as jest.Mock).mockResolvedValue({ data: mockCreatedDoc, errors: null });

      const result = await documentStore.create(mockDocument);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.val).toEqual(mockCreatedDoc);
      }

      expect(uploadData).toHaveBeenCalledWith({
        path: 'documents/test-tenant/test',
        data: mockDocument.content,
        options: {
          contentType: 'text/markdown',
        },
      });
    });

    it('should fail when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });

      const mockDocument = {
        content: '# Test Document\n\nThis is a test document.',
        metadata: {
          fileName: 'test.md',
          fileType: 'markdown',
          size: 100,
          lastModified: '2024-01-01T00:00:00Z',
          version: 1,
          checksum: 'test-checksum',
        },
      };

      const result = await documentStore.create(mockDocument);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.val.message).toBe('Cannot create document while offline');
      }

      expect(uploadData).not.toHaveBeenCalled();
    });
  });
}); 