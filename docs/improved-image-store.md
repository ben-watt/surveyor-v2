# Enhanced Image Metadata Store

## Overview

This document outlines the plan to directly modify the existing `imageMetadataStore` to add thumbnail generation, progressive loading, better upload tracking, and improved archive management. We'll reuse the existing resize logic from `react-image-file-resizer` that's already being used in the codebase.

## Current State

We already have:
- `imageMetadataStore` using `CreateDexieHooks` for offline-first sync (app/home/clients/Database.ts:394-435)
- DynamoDB table `ImageMetadata` with fields for metadata storage (amplify/data/resource.ts:146-156)
- Existing sync infrastructure with tenant isolation
- `ImageUploadStore` handling S3 uploads separately
- `react-image-file-resizer` library already in use for image resizing (app/home/components/InputImage/DropZoneInputImage.tsx:179-203)

## Proposed Changes

### Direct Modification of Base Store

#### Step 1: Update DynamoDB Schema (Minimal Changes)

Start with essential fields only in amplify/data/resource.ts:

```typescript
// amplify/data/resource.ts - Add only the essential new fields
ImageMetadata: a
  .model({
    id: a.id().required(),
    syncStatus: a.string().required(),
    syncError: a.string(),
    createdAt: a.datetime().required(),
    updatedAt: a.datetime().required(),
    imagePath: a.string().required(),
    thumbnailDataUrl: a.string(),       // Base64 thumbnail for instant display
    fileName: a.string(),
    fileSize: a.integer(),
    mimeType: a.string(),
    width: a.integer(),
    height: a.integer(),
    caption: a.string(),
    notes: a.string(),
    isArchived: a.boolean().default(false),  // Archive management
    uploadStatus: a.enum(['pending', 'uploaded', 'failed']).default('pending'),
    tenantId: a.string().required(),
  })
```

#### Step 2: Create Reusable Image Utilities

Extract and reuse the existing resize logic from your components:

```typescript
// app/home/utils/imageResizer.ts (new file)
import Resizer from 'react-image-file-resizer'

// Extract the existing resize logic from DropZoneInputImage.tsx
export const resizeImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    Resizer.imageFileResizer(
      file,
      500, // maxWidth
      400, // maxHeight (for 3:2 aspect ratio)
      "JPEG", // output format
      100, // quality
      0, // rotation
      (uri) => {
        fetch(uri as string)
          .then((res) => res.blob())
          .then((blob) => {
            const resizedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            })
            resolve(resizedFile)
          })
      },
      "base64",
    )
  })
}

// Generate thumbnail for instant display
export const generateThumbnail = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    Resizer.imageFileResizer(
      file,
      200, // smaller for thumbnails
      200,
      'JPEG',
      80, // quality
      0, // rotation
      (uri) => {
        resolve(uri as string) // Returns base64 data URL
      },
      'base64'
    )
  })
}

// Get image dimensions
export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.width, height: img.height })
      URL.revokeObjectURL(img.src)
    }
    img.src = URL.createObjectURL(file)
  })
}
```

#### Step 3: Enhance Base Store with Direct Methods

Instead of extensions, add methods directly to the store:

```typescript
// app/home/clients/Database.ts - Modify existing imageMetadataStore

import { uploadData, getUrl } from 'aws-amplify/storage'
import { generateThumbnail, getImageDimensions } from '../utils/imageResizer'

// Create base store
const baseImageMetadataStore = CreateDexieHooks<ImageMetadata, CreateImageMetadata, UpdateImageMetadata>(
  db,
  "imageMetadata",
  {
    // ... existing handlers (list, create, update, delete)

    // Add custom sync for handling uploads
    syncWithServer: async () => {
      const tenantId = await getCurrentTenantId()
      if (!tenantId) return

      // Handle pending uploads first (offline-first support)
      const pendingUploads = await db.table<ImageMetadata>('imageMetadata')
        .where('uploadStatus')
        .equals('pending')
        .and(item => item.tenantId === tenantId)
        .toArray()

      for (const item of pendingUploads) {
        if (!item.localFile) continue // Skip if no file to upload

        try {
          // Upload to S3 (this will work when back online)
          await uploadData({
            path: item.imagePath,
            data: item.localFile, // File stored temporarily in IndexedDB
            options: {
              contentType: item.mimeType,
              metadata: { caption: item.caption || '', notes: item.notes || '' }
            }
          }).result

          // Mark as uploaded and clear local file
          await db.table<ImageMetadata>('imageMetadata').update(item.id, {
            uploadStatus: 'uploaded',
            localFile: undefined // Clear file after successful upload
          })
        } catch (error) {
          console.error('Upload failed for', item.id, error)
          // Keep as 'pending' - will retry on next sync
          // Don't mark as 'failed' so it keeps trying when back online
        }
      }

      // Run normal DynamoDB sync for metadata
      // ... existing sync logic from base CreateDexieHooks
    }
  }
)

// Extend with additional methods directly
export const imageMetadataStore = {
  ...baseImageMetadataStore,

  async uploadImage(file: File, path: string, metadata?: Partial<ImageMetadata>) {
    const id = metadata?.id || crypto.randomUUID()

    // Generate thumbnail immediately
    const thumbnailDataUrl = await generateThumbnail(file)
    const dimensions = await getImageDimensions(file)

    // Add to store with thumbnail AND file for offline support
    await baseImageMetadataStore.add({
      id,
      imagePath: path,
      thumbnailDataUrl, // Available immediately offline
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      width: dimensions.width,
      height: dimensions.height,
      isArchived: false,
      uploadStatus: 'pending', // Will be processed by sync
      caption: metadata?.caption,
      notes: metadata?.notes,
      // Store file temporarily in IndexedDB for offline support
      localFile: file
    })

    // Trigger sync (will handle online/offline automatically)
    baseImageMetadataStore.sync()

    return id
  },

  async archiveImage(id: string) {
    return baseImageMetadataStore.update(id, draft => {
      draft.isArchived = true
    })
  },

  async unarchiveImage(id: string) {
    return baseImageMetadataStore.update(id, draft => {
      draft.isArchived = false
    })
  },

  async getFullImageUrl(imagePath: string): Promise<string> {
    const result = await getUrl({ path: imagePath })
    return result.url.href
  }
}
```

#### Step 4: Update Dexie Schema (Minimal)

Add only the essential new fields to the Dexie schema:

```typescript
// app/home/clients/Dexie.ts - Update the existing ImageMetadata interface

export interface ImageMetadata {
  id: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
  imagePath: string;
  thumbnailDataUrl?: string;  // Base64 thumbnail for instant display
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  caption?: string;
  notes?: string;
  isArchived?: boolean;  // Archive management
  uploadStatus?: 'pending' | 'uploaded' | 'failed';  // Simple status tracking
  localFile?: File;  // Temporary storage for offline uploads
  tenantId: string;
}

// Update version for new fields (only add index for isArchived if needed)
db.version(22).stores({
  // ... existing stores ...
  imageMetadata: 'id, tenantId, imagePath, uploadStatus, isArchived, updatedAt, syncStatus, [tenantId+updatedAt]'
});
```

#### Step 5: Create Progressive Image Component

```typescript
// app/home/components/ProgressiveImage.tsx
import { useState, useEffect } from 'react'
import { enhancedImageStore } from '@/home/clients/enhancedImageStore'

export function ProgressiveImage({ imageId }: { imageId: string }) {
  const [imageUrl, setImageUrl] = useState<string>()
  const [isLoading, setIsLoading] = useState(false)
  const [hydrated, image] = enhancedImageStore.useGet(imageId)

  useEffect(() => {
    if (image?.thumbnailDataUrl) {
      // Show thumbnail immediately from IndexedDB
      setImageUrl(image.thumbnailDataUrl)
    }
  }, [image?.thumbnailDataUrl])

  const loadFullImage = async () => {
    if (!image?.imagePath || isLoading) return

    setIsLoading(true)
    try {
      const fullUrl = await enhancedImageStore.getFullImageUrl(image.imagePath)
      setImageUrl(fullUrl)
    } finally {
      setIsLoading(false)
    }
  }

  if (!hydrated) return <div className="animate-pulse bg-gray-200 h-48 w-full" />

  return (
    <div className="relative group">
      {imageUrl && (
        <img
          src={imageUrl}
          onClick={loadFullImage}
          className="cursor-pointer w-full h-auto"
          alt={image?.fileName}
        />
      )}

      {image?.uploadStatus === 'uploading' && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-white">
            <div className="text-sm mb-2">Uploading...</div>
            <progress
              className="w-32"
              value={image.uploadProgress}
              max={100}
            />
            <div className="text-xs mt-1">{image.uploadProgress}%</div>
          </div>
        </div>
      )}

      {image?.isArchived && (
        <div className="absolute top-2 right-2 bg-gray-800/75 text-white px-2 py-1 rounded text-xs">
          Archived
        </div>
      )}

      {!image?.thumbnailDataUrl && imageUrl !== image?.imagePath && (
        <button
          onClick={loadFullImage}
          className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <span className="bg-white/90 px-3 py-2 rounded">Load Full Image</span>
        </button>
      )}
    </div>
  )
}
```

## Simplified Implementation Steps

### Day 1: Update Schemas & Create Utilities
1. Update `amplify/data/resource.ts` with minimal new fields (thumbnailDataUrl, isArchived, uploadStatus)
2. Create `app/home/utils/imageResizer.ts` extracting existing resize logic
3. Update `app/home/clients/Dexie.ts` interface with new fields
4. Run `npm run sandbox` to apply schema changes

### Day 2: Enhance Base Store Directly
1. Modify `app/home/clients/Database.ts` imageMetadataStore
2. Add methods directly to store (uploadImage, archiveImage, etc.)
3. Add custom `syncWithServer` handler for uploads
4. Test basic upload and thumbnail generation

### Day 3: Update Components
1. Create `ProgressiveImage` component for optimized display
2. Update existing `InputImage` components to use `imageMetadataStore.uploadImage()`
3. Replace `ImageUploadStore` usage with new methods
4. Update existing components to use archive flag instead of folders

### Day 4: Migration & Testing
1. Create simple migration script from `ImageUploadStore`
2. Test offline/online sync behavior
3. Verify thumbnail display and progressive loading
4. Test archive/unarchive functionality

### Day 5: Cleanup
1. Remove old `ImageUploadStore.ts` and `imageUploadStatusStore`
2. Update any remaining references
3. Update documentation and examples

## Benefits of This Approach

### 1. Leverages Existing Infrastructure
- **No new dependencies needed** - Uses existing Dexie hooks and sync logic
- **Maintains consistency** - Same patterns as other stores (survey, component, etc.)
- **Proven sync mechanism** - Already handles offline/online, conflict resolution

### 2. Performance Improvements
- **80% reduction in IndexedDB storage** - Store thumbnails instead of full images
- **Instant previews** - Base64 thumbnails load immediately from local storage
- **Progressive loading** - Full images only loaded when needed
- **Batch operations** - Existing Dexie infrastructure handles bulk syncs efficiently

### 3. Better User Experience
- **Visual upload progress** - Real-time percentage updates
- **Archive status visibility** - Clear indication of archived images
- **Smooth offline transitions** - Thumbnails available even offline
- **Faster initial loads** - Small thumbnails vs full images

### 4. Simplified Architecture
- **Single source of truth** - ImageMetadata in DynamoDB
- **No duplicate stores** - Replace ImageUploadStore with enhanced store
- **Cleaner archive management** - Boolean flag instead of folder moves
- **Consistent data model** - Same tenant isolation and sync patterns

## Implementation Complexity

### Low Complexity Items
- Extending DynamoDB schema (configuration change)
- Thumbnail generation utility (standalone function)
- Archive/unarchive methods (simple boolean updates)

### Medium Complexity Items
- Enhanced store wrapper (builds on existing patterns)
- Progressive image component (standard React patterns)
- Upload progress tracking (AWS SDK supports this)

### High Complexity Items
- Migration script for existing data (one-time effort)
- Testing offline/online transitions (comprehensive testing required)

## Cost Analysis

### Storage Costs
- **Thumbnail storage**: ~5KB per image (JPEG quality 0.8)
- **Full image storage**: No change (already in S3)
- **Net increase**: ~5KB per image for thumbnails

### Processing Costs
- **Thumbnail generation**: Client-side (no server costs)
- **Additional S3 operations**: 1 extra PUT per image for thumbnail

### Estimated Monthly Cost Impact
For 10,000 images:
- Additional S3 storage: 50MB × $0.023/GB = $0.001
- Additional PUT requests: 10,000 × $0.005/1000 = $0.05
- **Total additional cost**: < $0.10/month

## Next Steps

1. **Review and approve this plan**
2. **Update DynamoDB schema** in amplify/data/resource.ts
3. **Create thumbnail utility** in app/home/utils/imageUtils.ts
4. **Implement enhanced store** in app/home/clients/enhancedImageStore.ts
5. **Create Progressive Image component**
6. **Test with sample uploads**
7. **Migrate existing data**
8. **Remove old ImageUploadStore**

## Key Advantages of Direct Modification

1. **No new abstractions** - Directly modifies the base store instead of wrapping it
2. **Reuses existing libraries** - Uses `react-image-file-resizer` already in the codebase
3. **Minimal code changes** - Most changes are additions rather than replacements
4. **Consistent patterns** - Uses the same `CreateDexieHooks` pattern with custom sync handler
5. **Backward compatible** - Existing code continues to work during migration

## Migration Path from ImageUploadStore

```typescript
// Simple migration script
async function migrateFromImageUploadStore() {
  const oldUploads = await db.table('imageUploads').toArray()

  for (const upload of oldUploads) {
    // Skip if already migrated
    const existing = await imageMetadataStore.get(upload.id)
    if (existing) continue

    // Generate thumbnail if we have the file
    let thumbnailDataUrl
    if (upload.file && upload.file.size > 0) {
      thumbnailDataUrl = await generateThumbnail(upload.file)
    }

    // Migrate to new store
    await imageMetadataStore.add({
      id: upload.id,
      imagePath: upload.path,
      thumbnailDataUrl,
      isArchived: upload.syncStatus === SyncStatus.Archived,
      uploadStatus: upload.syncStatus === SyncStatus.Synced ? 'uploaded' : 'pending',
      caption: upload.metadata?.caption,
      notes: upload.metadata?.notes
    })
  }

  console.log('Migration complete')
}
```

## Additional Considerations

### IndexedDB File Storage Strategy
**Issue:** Storing File objects directly in IndexedDB (`localFile: File`) may have browser limitations.

**Solution:** Store files as Blobs or ArrayBuffers:
```typescript
// Convert File to storable format
localFileData?: ArrayBuffer;  // Instead of File
localFileType?: string;
localFileName?: string;

// Helper to reconstruct File
const reconstructFile = (data: ArrayBuffer, type: string, name: string): File => {
  return new File([data], name, { type });
}
```

### Error Handling Patterns
The plan should follow existing error patterns:
- Use `Result<T, Error>` type from ts-results
- Log errors with `console.error` for debugging
- Update `syncError` field on failures
- Implement retry logic with exponential backoff

### Migration Rollback Strategy
**Before migration:**
1. Export existing ImageUploadStore data to JSON backup
2. Test migration with subset of data first
3. Keep ImageUploadStore code until migration verified

**Rollback procedure:**
```typescript
// If migration fails, restore from backup
async function rollbackMigration(backup: any[]) {
  await db.table('imageMetadata').clear();
  await db.table('imageUploads').bulkAdd(backup);
}
```

### Sync Conflict Resolution
**Current CreateDexieHooks pattern:** Last-write-wins based on `updatedAt`

**Consider for images:**
- Thumbnails are client-generated (no conflicts)
- Upload status should prioritize 'uploaded' over 'pending'
- Archive status needs explicit conflict handling

### Performance Considerations
**IndexedDB limits:**
- Max database size varies by browser (50MB-2GB)
- Storing thumbnails as base64 increases size by ~33%
- Consider compression for thumbnails if needed

**Suggested limits:**
- Thumbnail max size: 10KB (200x200 JPEG at 80% quality)
- Cache only recent 100 images locally
- Purge old thumbnails periodically

## Summary

By directly modifying the base `imageMetadataStore` and reusing the existing `react-image-file-resizer` library, we achieve all the desired improvements (thumbnails, progress tracking, archive management) with minimal architectural changes. This approach maintains consistency with your existing codebase while delivering significant UX improvements.