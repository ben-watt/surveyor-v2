# Image Upload System

## Overview

The image upload system provides offline-first, progressive image handling with thumbnail generation, archive management, and robust sync capabilities. The architecture leverages existing infrastructure while adding performance optimizations and better user experience.

## Current Architecture

### Core Components

1. **DropZoneInputImageV2** (`app/home/components/InputImage/DropZoneInputImageV2.tsx`)
   - Content-based duplicate detection using SHA-256 hashes
   - Progressive upload with thumbnails
   - Archive/metadata UI controls
   - Uses `react-dropzone` for file capture and `react-image-file-resizer` for transforms

2. **Enhanced Image Store** (`app/home/clients/enhancedImageMetadataStore.ts`)
   - Orchestrates background uploads via Amplify Storage `uploadData` (progress, cancel, retries)
   - Generates and stores thumbnails + dimensions
   - Persists local file data for offline-first resume
   - Exposes helpers: `uploadImage`, `archiveImage`, `unarchiveImage`, `getFullImageUrl`, `retryFailedUploads`, `syncPendingUploads`, `cleanupOldThumbnails`

3. **Image Metadata Store (base)** (`app/home/clients/Database.ts:~360+`)
   - Base Dexie hooks (`CreateDexieHooks`) for CRUD + sync to DynamoDB `ImageMetadata`
   - Removes local-only fields before server sync
   - Tenant isolation and indexes managed in `app/home/clients/Dexie.ts`

4. (Legacy) **ImageUploadStore**
   - Removed in Dexie schema v23; legacy references exist only in older docs

### Data Flow

```
User Selects Image → Generate Thumbnail → Store in IndexedDB → Background Upload to S3 → Sync Metadata to DynamoDB
                           ↓                      ↓                      ↓
                    Instant Preview        Offline Support      Progress Tracking
```

## Enhancements & Hardening

We are keeping the Amplify + Dexie approach and hardening it with better lifecycle management and consistency:
- Wire background helpers on app load and `online` events (`syncPendingUploads`, `retryFailedUploads`)
- Add periodic `cleanupOldThumbnails()` to control IndexedDB usage
- Centralize duplicate detection inside the enhanced store (hash + path/tenant)
- Extract shared `joinPath()` and filename sanitization util
- Optional: add a simple upload concurrency limiter in the enhanced store

### 1. Schema Updates

#### DynamoDB Schema (`amplify/data/resource.ts`)
```typescript
ImageMetadata: a.model({
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
  contentHash: a.string(),            // SHA-256 for deduplication
  caption: a.string(),
  notes: a.string(),
  isArchived: a.boolean().default(false),
  uploadStatus: a.enum(['pending', 'uploaded', 'failed']).default('pending'),
  tenantId: a.string().required(),
})
```

#### Dexie Schema (local model) (`app/home/clients/Database.ts`)
```typescript
export interface ImageMetadata {
  id: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
  imagePath: string;
  thumbnailDataUrl?: string;  // Base64 thumbnail
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  contentHash?: string;        // SHA-256 for deduplication
  caption?: string;
  notes?: string;
  isArchived?: boolean;
  uploadStatus?: 'pending' | 'uploaded' | 'failed';
  uploadProgress?: number;   // 0-100, local-only
  localFileData?: ArrayBuffer;  // Local-only
  localFileType?: string;       // Local-only
  localFileName?: string;       // Local-only
  tenantId: string;
}
```

### 2. Reusable Image Utilities

Extract and reuse existing resize logic:

```typescript
// app/home/utils/imageResizer.ts
import Resizer from 'react-image-file-resizer'

export const resizeImage = (file: File): Promise<File> => { /* ... */ }
export const generateThumbnail = (file: File): Promise<string> => { /* ... */ }
export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => { /* ... */ }
export const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => { /* ... */ }
export const arrayBufferToFile = (buf: ArrayBuffer, name: string, type: string): File => { /* ... */ }
export const estimateThumbnailSize = (base64DataUrl: string): number => { /* ... */ }
```

### 3. Enhanced Store Methods

Use the enhanced store for uploads, thumbnails, and background processing:

```typescript
// app/home/clients/enhancedImageMetadataStore.ts (public surface via enhancedImageStore)
const idResult = await enhancedImageStore.uploadImage(file, path, {
  onProgress: (p) => console.debug('progress', p)
});

if (idResult.ok) {
  // ID available immediately; background upload continues
}

// Later (e.g., on app boot or when online):
await enhancedImageStore.syncPendingUploads();
await enhancedImageStore.retryFailedUploads();
await enhancedImageStore.cleanupOldThumbnails(100);
```

### 4. Progressive Image Component

```typescript
// app/home/components/ProgressiveImage.tsx
// Uses enhancedImageStore under the hood; shows thumbnail immediately and loads full size on demand
```

## Improvement Plan

### Phase 1: Lifecycle wiring
1. On app boot (after auth/tenant ready), call `syncPendingUploads()` and `retryFailedUploads()`
2. Add `window.addEventListener('online', ...)` to trigger the same
3. Add a daily/weekly schedule to `cleanupOldThumbnails(keepCount)`

### Phase 2: Duplicate detection centralization
1. Add store method `findDuplicate({ contentHash, pathPrefix, tenantId })`
2. Update `uploadImage()` to optionally check duplicates and short-circuit
3. Simplify component: move duplicate checks from UI to store

### Phase 3: Path utils and sanitization
1. Extract `joinPath()` to a shared util (avoid leading slashes)
2. Add filename sanitization (spaces, unsafe chars) prior to upload
3. Use util everywhere (components, store, camera)

### Phase 4: Concurrency controls (optional)
1. Add N-parallel upload limit in enhanced store
2. Expose queue length/position if useful to UI

### Phase 5: Docs and tests
1. Align docs (this file) with final field names and flows
2. Add unit tests for `uploadImage()` progress/retry and duplicate detection

## Performance Benefits

- **80% reduction in IndexedDB storage** - Store thumbnails instead of full images
- **Instant previews** - Base64 thumbnails load immediately
- **Progressive loading** - Full images only when needed
- **Batch operations** - Existing Dexie infrastructure handles bulk syncs

## Error Handling

- **Upload Failures**: 3-retry system with exponential backoff
- **Network Issues**: Offline queue with automatic retry
- **User Feedback**: Toast notifications for all states
- **Fallback**: Graceful degradation if thumbnails unavailable

## Migration Strategy

```typescript
// Simple migration from ImageUploadStore
async function migrateFromImageUploadStore() {
  const oldUploads = await db.table('imageUploads').toArray()

  for (const upload of oldUploads) {
    // Skip if already migrated
    const existing = await imageMetadataStore.get(upload.id)
    if (existing) continue

    // Generate thumbnail if file available
    let thumbnailDataUrl
    if (upload.file) {
      thumbnailDataUrl = await generateThumbnail(upload.file)
    }

    // Migrate to new store
    await imageMetadataStore.add({
      id: upload.id,
      imagePath: upload.path,
      thumbnailDataUrl,
      isArchived: upload.syncStatus === SyncStatus.Archived,
      uploadStatus: upload.syncStatus === SyncStatus.Synced ? 'uploaded' : 'pending'
    })
  }
}
```

Note: Dexie v23 removed `imageUploads`. Keep this migration only for users/devices that may still hold older local data.

## Cost Analysis

For 10,000 images:
- Additional S3 storage: 50MB × $0.023/GB = $0.001
- Additional PUT requests: 10,000 × $0.005/1000 = $0.05
- **Total additional cost**: < $0.10/month

## Key Advantages

1. **No new abstractions** - Directly modifies existing store
2. **Reuses existing libraries** - Uses `react-image-file-resizer` already in codebase
3. **Minimal code changes** - Mostly additions rather than replacements
4. **Consistent patterns** - Same `CreateDexieHooks` pattern with custom sync
5. **Backward compatible** - Existing code works during migration
6. **Offline-first** - Thumbnails and metadata available without network
7. **Performance optimized** - Progressive loading reduces initial load times

## Usage Example

```typescript
import { DropZoneInputImage } from '@/app/home/components/InputImage';

<DropZoneInputImage
  path={joinPath('surveys', surveyId, 'photos')}
  maxFiles={5}
  features={{ archive: true, metadata: true }}
  onChange={(files) => console.log(files)}
/>
```
