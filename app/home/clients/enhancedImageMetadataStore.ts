import { uploadData, getUrl } from 'aws-amplify/storage';
import { Err, Ok, Result } from 'ts-results';
import { db, SyncStatus } from './Dexie';
import { imageMetadataStore, ImageMetadata } from './Database';
import {
  generateThumbnail,
  getImageDimensions,
  fileToArrayBuffer,
  arrayBufferToFile
} from '../utils/imageResizer';
import { getCurrentTenantId } from '../utils/tenant-utils';

export interface UploadImageOptions {
  id?: string;
  caption?: string;
  notes?: string;
  onProgress?: (progress: number) => void;
}

/**
 * Enhanced image metadata store with upload, thumbnail generation, and archive management
 */
class EnhancedImageMetadataStore {
  private uploadQueue = new Map<string, AbortController>();

  /**
   * Upload an image with automatic thumbnail generation
   */
  async uploadImage(
    file: File,
    path: string,
    options: UploadImageOptions = {}
  ): Promise<Result<string, Error>> {
    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        return Err(new Error('No tenant ID available for upload'));
      }

      const id = options.id || crypto.randomUUID();

      // Generate thumbnail immediately for instant preview
      const [thumbnailDataUrl, dimensions, fileBuffer] = await Promise.all([
        generateThumbnail(file),
        getImageDimensions(file),
        fileToArrayBuffer(file)
      ]);

      // Create metadata entry with pending upload status
      const metadata: ImageMetadata = {
        id,
        imagePath: path,
        thumbnailDataUrl, // Available immediately offline
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        width: dimensions.width,
        height: dimensions.height,
        isArchived: false,
        uploadStatus: 'pending',
        caption: options.caption,
        notes: options.notes,
        // Store file data for offline support
        localFileData: fileBuffer,
        localFileType: file.type,
        localFileName: file.name,
        tenantId,
        syncStatus: SyncStatus.Queued,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add to local store immediately
      await db.table<ImageMetadata>('imageMetadata').add(metadata);

      // Start upload in background
      this.startBackgroundUpload(id, file, path, options.onProgress);

      return Ok(id);
    } catch (error) {
      console.error('Failed to upload image:', error);
      return Err(error as Error);
    }
  }

  /**
   * Start background upload to S3
   */
  private async startBackgroundUpload(
    id: string,
    file: File,
    path: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const abortController = new AbortController();
    this.uploadQueue.set(id, abortController);

    try {
      const uploadTask = uploadData({
        path,
        data: file,
        options: {
          contentType: file.type,
          onProgress: (event) => {
            if (event.totalBytes) {
              const progress = Math.round((event.transferredBytes / event.totalBytes) * 100);
              onProgress?.(progress);

              // Update progress in local store
              db.table<ImageMetadata>('imageMetadata').update(id, {
                uploadProgress: progress
              } as any);
            }
          }
        }
      });

      await uploadTask.result;

      // Mark as uploaded
      await db.table<ImageMetadata>('imageMetadata').update(id, {
        uploadStatus: 'uploaded',
        uploadProgress: 100,
        syncStatus: SyncStatus.Queued, // Queue for sync to DynamoDB
        // Clear local file data after successful upload
        localFileData: undefined,
        localFileType: undefined,
        localFileName: undefined
      });

      // Trigger sync with DynamoDB
      imageMetadataStore.sync();

    } catch (error) {
      if ((error as any)?.name === 'AbortError') {
        console.log('Upload cancelled for', id);
      } else {
        console.error('Upload failed for', id, error);
        await db.table<ImageMetadata>('imageMetadata').update(id, {
          uploadStatus: 'failed',
          syncError: (error as Error).message
        } as any);
      }
    } finally {
      this.uploadQueue.delete(id);
    }
  }

  /**
   * Cancel an ongoing upload
   */
  cancelUpload(id: string): void {
    const controller = this.uploadQueue.get(id);
    if (controller) {
      controller.abort();
      this.uploadQueue.delete(id);
    }
  }

  /**
   * Archive an image (soft delete)
   */
  async archiveImage(id: string): Promise<Result<void, Error>> {
    try {
      await db.table<ImageMetadata>('imageMetadata').update(id, {
        isArchived: true,
        updatedAt: new Date().toISOString(),
        syncStatus: SyncStatus.Queued
      });

      // Trigger sync
      imageMetadataStore.sync();

      return Ok(undefined);
    } catch (error) {
      return Err(error as Error);
    }
  }

  /**
   * Unarchive an image
   */
  async unarchiveImage(id: string): Promise<Result<void, Error>> {
    try {
      await db.table<ImageMetadata>('imageMetadata').update(id, {
        isArchived: false,
        updatedAt: new Date().toISOString(),
        syncStatus: SyncStatus.Queued
      });

      // Trigger sync
      imageMetadataStore.sync();

      return Ok(undefined);
    } catch (error) {
      return Err(error as Error);
    }
  }

  /**
   * Get full resolution image URL from S3
   */
  async getFullImageUrl(imagePath: string): Promise<Result<string, Error>> {
    try {
      const result = await getUrl({ path: imagePath });
      return Ok(result.url.href);
    } catch (error) {
      return Err(error as Error);
    }
  }

  /**
   * Get all non-archived images for current tenant
   */
  async getActiveImages(): Promise<Result<ImageMetadata[], Error>> {
    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        return Err(new Error('No tenant ID available'));
      }

      const images = await db.table<ImageMetadata>('imageMetadata')
        .where('tenantId')
        .equals(tenantId)
        .and(item => !item.isArchived && item.syncStatus !== SyncStatus.PendingDelete)
        .toArray();

      return Ok(images);
    } catch (error) {
      return Err(error as Error);
    }
  }

  /**
   * Get all archived images for current tenant
   */
  async getArchivedImages(): Promise<Result<ImageMetadata[], Error>> {
    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        return Err(new Error('No tenant ID available'));
      }

      const images = await db.table<ImageMetadata>('imageMetadata')
        .where('tenantId')
        .equals(tenantId)
        .and(item => item.isArchived === true && item.syncStatus !== SyncStatus.PendingDelete)
        .toArray();

      return Ok(images);
    } catch (error) {
      return Err(error as Error);
    }
  }

  /**
   * Retry failed uploads
   */
  async retryFailedUploads(): Promise<void> {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return;

    const failedUploads = await db.table<ImageMetadata>('imageMetadata')
      .where('uploadStatus')
      .equals('failed')
      .and(item => item.tenantId === tenantId)
      .toArray();

    for (const upload of failedUploads) {
      if (upload.localFileData && upload.localFileType && upload.localFileName) {
        const file = arrayBufferToFile(
          upload.localFileData,
          upload.localFileName,
          upload.localFileType
        );

        await this.startBackgroundUpload(upload.id, file, upload.imagePath);
      }
    }
  }

  /**
   * Custom sync handler for offline support
   */
  async syncPendingUploads(): Promise<void> {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return;

    // Handle pending uploads when back online
    const pendingUploads = await db.table<ImageMetadata>('imageMetadata')
      .where('uploadStatus')
      .equals('pending')
      .and(item => item.tenantId === tenantId && !!item.localFileData)
      .toArray();

    for (const item of pendingUploads) {
      if (!item.localFileData || !item.localFileType || !item.localFileName) continue;

      try {
        // Reconstruct file from stored data
        const file = arrayBufferToFile(
          item.localFileData,
          item.localFileName,
          item.localFileType
        );

        // Resume upload
        await this.startBackgroundUpload(item.id, file, item.imagePath);
      } catch (error) {
        console.error('Failed to resume upload for', item.id, error);
      }
    }
  }

  /**
   * Clean up old thumbnails to manage IndexedDB storage
   */
  async cleanupOldThumbnails(keepCount = 100): Promise<void> {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return;

    const allImages = await db.table<ImageMetadata>('imageMetadata')
      .where('tenantId')
      .equals(tenantId)
      .reverse()
      .sortBy('updatedAt');

    if (allImages.length <= keepCount) return;

    // Keep only the most recent images with thumbnails
    const toClean = allImages.slice(keepCount);

    for (const image of toClean) {
      if (image.uploadStatus === 'uploaded' && image.thumbnailDataUrl) {
        await db.table<ImageMetadata>('imageMetadata').update(image.id, {
          thumbnailDataUrl: undefined // Clear thumbnail for old uploaded images
        });
      }
    }
  }
}

// Export singleton instance
export const enhancedImageMetadataStore = new EnhancedImageMetadataStore();

// Extend the base store with enhanced methods
export const enhancedImageStore = {
  // Include all base methods
  ...imageMetadataStore,

  // Add enhanced methods
  uploadImage: enhancedImageMetadataStore.uploadImage.bind(enhancedImageMetadataStore),
  cancelUpload: enhancedImageMetadataStore.cancelUpload.bind(enhancedImageMetadataStore),
  archiveImage: enhancedImageMetadataStore.archiveImage.bind(enhancedImageMetadataStore),
  unarchiveImage: enhancedImageMetadataStore.unarchiveImage.bind(enhancedImageMetadataStore),
  getFullImageUrl: enhancedImageMetadataStore.getFullImageUrl.bind(enhancedImageMetadataStore),
  getActiveImages: enhancedImageMetadataStore.getActiveImages.bind(enhancedImageMetadataStore),
  getArchivedImages: enhancedImageMetadataStore.getArchivedImages.bind(enhancedImageMetadataStore),
  retryFailedUploads: enhancedImageMetadataStore.retryFailedUploads.bind(enhancedImageMetadataStore),
  syncPendingUploads: enhancedImageMetadataStore.syncPendingUploads.bind(enhancedImageMetadataStore),
  cleanupOldThumbnails: enhancedImageMetadataStore.cleanupOldThumbnails.bind(enhancedImageMetadataStore),
};