import { uploadData, remove, list, getProperties, getUrl } from 'aws-amplify/storage';
import Dexie from 'dexie';
import { imageUploadStore } from './ImageUploadStore';
import { SyncStatus, ImageUpload } from './Dexie';

// Mock AWS Amplify storage functions
jest.mock('aws-amplify/storage', () => ({
    uploadData: jest.fn(),
    remove: jest.fn(),
    list: jest.fn(),
    getProperties: jest.fn(),
    getUrl: jest.fn(),
}));

// Mock Dexie
const mockTable = {
    where: jest.fn().mockReturnThis(),
    equals: jest.fn().mockReturnThis(),
    toArray: jest.fn(),
    get: jest.fn(),
    add: jest.fn(),
    delete: jest.fn(),
};

jest.mock('dexie', () => ({
    default: jest.fn().mockImplementation(() => ({
        table: jest.fn().mockReturnValue(mockTable),
    })),
}));

describe('ImageUploadStore', () => {
    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('list', () => {
        it('should return empty array when no images exist', async () => {
            // Mock empty results
            (list as jest.Mock).mockResolvedValue({ items: [] });
            mockTable.toArray.mockResolvedValue([]);

            const result = await imageUploadStore.list('test-path');
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.val).toEqual([]);
            }
        });

        it('should combine local and remote images', async () => {
            // Mock remote images
            (list as jest.Mock).mockResolvedValue({
                items: [
                    { path: 'remote1.jpg' },
                    { path: 'remote2.jpg' }
                ]
            });

            // Mock local images
            mockTable.toArray.mockResolvedValue([
                { path: 'local1.jpg', file: new Blob(), syncStatus: SyncStatus.Queued }
            ]);

            const result = await imageUploadStore.list('test-path');
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.val).toHaveLength(3);
                expect(result.val).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({ fullPath: 'remote1.jpg', syncStatus: SyncStatus.Synced }),
                        expect.objectContaining({ fullPath: 'remote2.jpg', syncStatus: SyncStatus.Synced }),
                        expect.objectContaining({ fullPath: 'local1.jpg', syncStatus: SyncStatus.Queued })
                    ])
                );
            }
        });
    });

    describe('get', () => {
        it('should return local image when it exists', async () => {
            const mockLocalImage: ImageUpload = {
                id: 'test.jpg',
                path: 'test.jpg',
                file: new Blob(),
                syncStatus: SyncStatus.Queued,
                href: 'https://test.com/image.jpg',
                updatedAt: new Date().toISOString(),
                tenantId: 'test-tenant'
            };

            mockTable.get.mockResolvedValue(mockLocalImage);

            const result = await imageUploadStore.get('test.jpg');
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.val).toEqual(mockLocalImage);
            }
        });

        it('should fetch remote image when local does not exist', async () => {
            // Mock remote image properties
            (getProperties as jest.Mock).mockResolvedValue({
                lastModified: new Date(),
                metadata: { test: 'metadata' }
            });

            // Mock URL generation
            (getUrl as jest.Mock).mockResolvedValue({
                url: { href: 'https://test.com/image.jpg' }
            });

            // Mock fetch
            global.fetch = jest.fn().mockResolvedValue({
                blob: () => Promise.resolve(new Blob())
            });

            const result = await imageUploadStore.get('remote.jpg');
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.val).toEqual(
                    expect.objectContaining({
                        path: 'remote.jpg',
                        syncStatus: SyncStatus.Synced,
                        metadata: { test: 'metadata' }
                    })
                );
            }
        });
    });

    describe('create', () => {
        it('should create a new image upload', async () => {
            const mockImage = {
                id: 'test.jpg',
                path: 'test.jpg',
                file: new Blob(),
                metadata: { test: 'metadata' },
                href: 'https://test.com/image.jpg',
                tenantId: 'test-tenant'
            };

            await imageUploadStore.create(mockImage);

            expect(mockTable.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    path: mockImage.path,
                    file: mockImage.file,
                    metadata: mockImage.metadata,
                    href: mockImage.href,
                    syncStatus: SyncStatus.Queued
                })
            );
        });
    });

    describe('remove', () => {
        it('should remove local image when it exists', async () => {
            const mockLocalImage: ImageUpload = {
                id: 'test.jpg',
                path: 'test.jpg',
                file: new Blob(),
                syncStatus: SyncStatus.Queued,
                href: 'https://test.com/image.jpg',
                updatedAt: new Date().toISOString(),
                tenantId: 'test-tenant'
            };

            mockTable.get.mockResolvedValue(mockLocalImage);

            await imageUploadStore.remove('test.jpg');

            expect(mockTable.delete).toHaveBeenCalledWith('test.jpg');
        });

        it('should remove remote image when local does not exist', async () => {
            mockTable.get.mockResolvedValue(null);

            await imageUploadStore.remove('remote.jpg');

            expect(remove).toHaveBeenCalledWith({
                path: 'remote.jpg'
            });
        });
    });
}); 