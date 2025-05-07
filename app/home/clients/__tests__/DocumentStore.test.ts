import { documentStore } from '../DocumentStore';
import { db } from '../Dexie';
import { Err, Ok } from 'ts-results';

// Mock getCurrentTenantId
jest.mock('../../utils/tenant-utils', () => ({
  getCurrentTenantId: jest.fn().mockResolvedValue('test-tenant'),
}));

// Mock AWS Amplify Storage
jest.mock('aws-amplify/storage', () => ({
  uploadData: jest.fn().mockImplementation(() => ({
    result: Promise.resolve(true)
  })),
}));

// Mock Dexie
jest.mock('../Dexie', () => {
  const mockDb = {
    table: jest.fn().mockReturnValue({
      add: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
    }),
  };
  return { db: mockDb };
});

describe('DocumentStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create document when online', async () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', { 
        configurable: true,
        value: true 
      });

      const doc = {
        path: 'test', // This will be used to construct the final path
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
      
      if (result.err) {
        console.error('Create document failed:', result.val);
      }
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.val.version).toBe(1);
        expect(result.val.syncStatus).toBe('Synced');
        expect(result.val.id).toBe('documents/test-tenant/test#test-tenant');
        expect(result.val.path).toBe('documents/test-tenant/test');
        expect(db.table).toHaveBeenCalledTimes(2); // Once for documents, once for versions
      }
    });

    it('should fail when offline', async () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', { 
        configurable: true,
        value: false 
      });

      const doc = {
        path: 'test',
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
      expect(result.err).toBe(true);
      if (result.err) {
        expect(result.val.message).toContain('online connection');
      }
      expect(db.table).not.toHaveBeenCalled();
    });

    it('should validate markdown content', async () => {
      Object.defineProperty(navigator, 'onLine', { 
        configurable: true,
        value: true 
      });

      const doc = {
        path: 'test',
        content: '', // Empty content
        metadata: {
          fileName: 'test.md',
          fileType: 'markdown',
          size: 0,
          lastModified: new Date().toISOString(),
          version: 1,
          checksum: 'abc123',
        },
      };

      const result = await documentStore.create(doc);
      expect(result.err).toBe(true);
      if (result.err) {
        expect(result.val.message).toContain('empty');
      }
      expect(db.table).not.toHaveBeenCalled();
    });

    it('should sanitize file names', async () => {
      Object.defineProperty(navigator, 'onLine', { 
        configurable: true,
        value: true 
      });

      const doc = {
        path: 'test file',
        content: '# Test',
        metadata: {
          fileName: 'test file.md', // Invalid file name
          fileType: 'markdown',
          size: 6,
          lastModified: new Date().toISOString(),
          version: 1,
          checksum: 'abc123',
        },
      };

      const result = await documentStore.create(doc);
      expect(result.err).toBe(true);
      if (result.err) {
        expect(result.val.message).toContain('Invalid file name');
      }
      expect(db.table).not.toHaveBeenCalled();
    });
  });
}); 