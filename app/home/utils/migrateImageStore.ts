import { db, ImageUpload, SyncStatus } from '../clients/Dexie';
import { enhancedImageStore } from '../clients/enhancedImageMetadataStore';
import { generateThumbnail, getImageDimensions, fileToArrayBuffer } from './imageResizer';
import { getCurrentTenantId } from './tenant-utils';

export interface MigrationStats {
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

/**
 * Migrate data from old ImageUploadStore to new enhanced ImageMetadataStore
 * This should be run once per user/tenant to migrate their existing images
 */
export async function migrateFromImageUploadStore(
  options: {
    dryRun?: boolean;
    onProgress?: (current: number, total: number) => void;
    batchSize?: number;
  } = {}
): Promise<MigrationStats> {
  const { dryRun = false, onProgress, batchSize = 10 } = options;

  const stats: MigrationStats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };

  try {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) {
      throw new Error('No tenant ID available for migration');
    }

    console.log(`Starting migration for tenant: ${tenantId}${dryRun ? ' (DRY RUN)' : ''}`);

    // Get all image uploads from old store
    const oldUploads = await db.table<ImageUpload>('imageUploads')
      .where('tenantId')
      .equals(tenantId)
      .toArray();

    stats.total = oldUploads.length;
    console.log(`Found ${stats.total} images to migrate`);

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < oldUploads.length; i += batchSize) {
      const batch = oldUploads.slice(i, Math.min(i + batchSize, oldUploads.length));

      await Promise.all(batch.map(async (upload, batchIndex) => {
        const currentIndex = i + batchIndex;
        onProgress?.(currentIndex + 1, stats.total);

        try {
          // Check if already migrated
          const existing = await db.table('imageMetadata').get(upload.id);
          if (existing) {
            console.log(`Skipping ${upload.id} - already migrated`);
            stats.skipped++;
            return;
          }

          // Generate thumbnail if we have the file
          let thumbnailDataUrl: string | undefined;
          let dimensions: { width: number; height: number } | undefined;
          let fileBuffer: ArrayBuffer | undefined;

          if (upload.file && upload.file.size > 0) {
            try {
              // Convert blob to file if needed
              const file = upload.file instanceof File
                ? upload.file
                : new File([upload.file], 'image', { type: upload.file.type });

              // Generate thumbnail for instant display
              thumbnailDataUrl = await generateThumbnail(file);
              dimensions = await getImageDimensions(file);
              fileBuffer = await fileToArrayBuffer(file);
            } catch (error) {
              console.warn(`Could not generate thumbnail for ${upload.id}:`, error);
            }
          }

          // Determine upload status based on sync status
          let uploadStatus: 'pending' | 'uploaded' | 'failed' = 'pending';
          if (upload.syncStatus === SyncStatus.Synced) {
            uploadStatus = 'uploaded';
          } else if (upload.syncStatus === SyncStatus.Failed) {
            uploadStatus = 'failed';
          }

          // Create new metadata entry
          const newMetadata = {
            id: upload.id,
            imagePath: upload.path,
            thumbnailDataUrl,
            fileName: upload.path.split('/').pop(),
            fileSize: upload.file?.size,
            mimeType: upload.file?.type,
            width: dimensions?.width,
            height: dimensions?.height,
            caption: upload.metadata?.caption,
            notes: upload.metadata?.notes,
            isArchived: upload.syncStatus === SyncStatus.Archived,
            uploadStatus,
            localFileData: uploadStatus === 'pending' ? fileBuffer : undefined,
            localFileType: uploadStatus === 'pending' ? upload.file?.type : undefined,
            localFileName: uploadStatus === 'pending' ? upload.path.split('/').pop() : undefined,
            tenantId: upload.tenantId,
            syncStatus: upload.syncStatus === SyncStatus.Synced ? SyncStatus.Synced : SyncStatus.Queued,
            createdAt: new Date().toISOString(),
            updatedAt: upload.updatedAt || new Date().toISOString(),
          };

          if (!dryRun) {
            // Add to new store
            await db.table('imageMetadata').add(newMetadata);
            console.log(`Migrated ${upload.id}`);
          } else {
            console.log(`[DRY RUN] Would migrate ${upload.id}`);
          }

          stats.migrated++;
        } catch (error) {
          console.error(`Failed to migrate ${upload.id}:`, error);
          stats.failed++;
          stats.errors.push({
            id: upload.id,
            error: (error as Error).message
          });
        }
      }));
    }

    // After successful migration, optionally clean up old data
    if (!dryRun && stats.failed === 0) {
      console.log('Migration successful, old data can be cleaned up');
      // Uncomment to auto-clean:
      // await cleanupOldImageUploads(tenantId);
    }

    return stats;
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Clean up old ImageUploadStore data after successful migration
 * CAUTION: This will delete all old image upload records
 */
export async function cleanupOldImageUploads(tenantId?: string): Promise<void> {
  const tid = tenantId || await getCurrentTenantId();
  if (!tid) {
    throw new Error('No tenant ID available for cleanup');
  }

  const confirmed = confirm(
    'This will permanently delete all old image upload records. ' +
    'Make sure migration was successful. Continue?'
  );

  if (!confirmed) {
    console.log('Cleanup cancelled');
    return;
  }

  // Delete all old uploads for this tenant
  const deleted = await db.table<ImageUpload>('imageUploads')
    .where('tenantId')
    .equals(tid)
    .delete();

  console.log(`Deleted ${deleted} old image upload records`);
}

/**
 * Verify migration was successful by comparing counts
 */
export async function verifyMigration(): Promise<{
  isValid: boolean;
  oldCount: number;
  newCount: number;
  message: string;
}> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return {
      isValid: false,
      oldCount: 0,
      newCount: 0,
      message: 'No tenant ID available'
    };
  }

  const oldCount = await db.table<ImageUpload>('imageUploads')
    .where('tenantId')
    .equals(tenantId)
    .count();

  const newCount = await db.table('imageMetadata')
    .where('tenantId')
    .equals(tenantId)
    .count();

  const isValid = newCount >= oldCount;
  const message = isValid
    ? `Migration verified: ${newCount} images in new store (${oldCount} in old store)`
    : `Migration incomplete: Only ${newCount} of ${oldCount} images migrated`;

  return { isValid, oldCount, newCount, message };
}

/**
 * Export migration data for backup
 */
export async function exportMigrationBackup(): Promise<any[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    throw new Error('No tenant ID available for backup');
  }

  const uploads = await db.table<ImageUpload>('imageUploads')
    .where('tenantId')
    .equals(tenantId)
    .toArray();

  // Convert File objects to base64 for JSON serialization
  const backupData = await Promise.all(uploads.map(async (upload) => {
    let fileData = null;
    if (upload.file && upload.file.size > 0) {
      // Convert blob to file if needed
      const file = upload.file instanceof File
        ? upload.file
        : new File([upload.file], 'image', { type: upload.file.type });

      const buffer = await fileToArrayBuffer(file);
      fileData = {
        data: Array.from(new Uint8Array(buffer)),
        type: file.type,
        name: file.name,
        size: file.size
      };
    }

    return {
      ...upload,
      file: fileData
    };
  }));

  return backupData;
}

/**
 * Restore from migration backup if something goes wrong
 */
export async function restoreFromBackup(backupData: any[]): Promise<void> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    throw new Error('No tenant ID available for restore');
  }

  // Clear existing data
  await db.table('imageMetadata')
    .where('tenantId')
    .equals(tenantId)
    .delete();

  // Restore old data
  const restored = backupData.map(item => {
    let file = null;
    if (item.file && item.file.data) {
      const uint8Array = new Uint8Array(item.file.data);
      file = new File([uint8Array], item.file.name, {
        type: item.file.type
      });
    }

    return {
      ...item,
      file
    };
  });

  await db.table<ImageUpload>('imageUploads').bulkAdd(restored);
  console.log(`Restored ${restored.length} records from backup`);
}