# Image Upload System

## Overview

The image upload system provides offline-first, progressive image handling with thumbnail generation, archive management, and robust sync capabilities. The architecture leverages existing infrastructure while adding performance optimizations and better user experience.

## Current Architecture

### Core Components

1. **DropZoneInputImageV2** (`app/home/components/InputImage/DropZoneInputImageV2.tsx`)
   - Content-based duplicate detection using SHA-256 hashes
   - Progressive upload with thumbnails
   - Archive management
   - Comprehensive error handling with exponential backoff retry
   - Reuses existing `react-image-file-resizer` library

2. **ImageMetadataStore** (`app/home/clients/Database.ts:394-435`)
   - Base store using `CreateDexieHooks` for offline-first sync
   - DynamoDB table `ImageMetadata` for metadata storage
   - Tenant isolation with composite keys
   - To be enhanced with thumbnail and upload features

3. **ImageUploadStore** (Legacy - to be deprecated)
   - Simple S3 operations for backward compatibility
   - Will be replaced by enhanced ImageMetadataStore

### Data Flow

```
User Selects Image → Generate Thumbnail → Store in IndexedDB → Background Upload to S3 → Sync Metadata to DynamoDB
                           ↓                      ↓                      ↓
                    Instant Preview        Offline Support      Progress Tracking
```

## Planned Enhancements

### Direct Store Modification Approach

Instead of creating new abstractions, we'll directly modify the existing `imageMetadataStore` to add:
- Thumbnail generation and caching
- Progressive upload tracking
- Archive management
- Better offline support

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
  caption: a.string(),
  notes: a.string(),
  isArchived: a.boolean().default(false),
  uploadStatus: a.enum(['pending', 'uploaded', 'failed']).default('pending'),
  tenantId: a.string().required(),
})
```

#### Dexie Schema (`app/home/clients/Dexie.ts`)
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
  caption?: string;
  notes?: string;
  isArchived?: boolean;
  uploadStatus?: 'pending' | 'uploaded' | 'failed';
  localFile?: ArrayBuffer;  // Temporary storage for offline uploads
  localFileType?: string;
  localFileName?: string;
  tenantId: string;
}
```

### 2. Reusable Image Utilities

Extract and reuse existing resize logic:

```typescript
// app/home/utils/imageResizer.ts
import Resizer from 'react-image-file-resizer'

export const generateThumbnail = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    Resizer.imageFileResizer(
      file,
      200, // thumbnail size
      200,
      'JPEG',
      80, // quality
      0,
      (uri) => resolve(uri as string), // Returns base64 data URL
      'base64'
    )
  })
}

export const resizeImage = (file: File): Promise<File> => {
  // Existing resize logic from DropZoneInputImage.tsx
}

export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  // Get image dimensions for metadata
}
```

### 3. Enhanced Store Methods

Add methods directly to the existing store:

```typescript
// app/home/clients/Database.ts - Enhanced imageMetadataStore
export const imageMetadataStore = {
  ...baseImageMetadataStore,

  async uploadImage(file: File, path: string, metadata?: Partial<ImageMetadata>) {
    const id = metadata?.id || crypto.randomUUID()

    // Generate thumbnail immediately
    const thumbnailDataUrl = await generateThumbnail(file)
    const dimensions = await getImageDimensions(file)

    // Store with thumbnail AND file for offline support
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
      uploadStatus: 'pending',
      localFile: await file.arrayBuffer(),
      localFileType: file.type,
      localFileName: file.name
    })

    // Trigger sync (handles online/offline automatically)
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

### 4. Progressive Image Component

```typescript
// app/home/components/ProgressiveImage.tsx
export function ProgressiveImage({ imageId }: { imageId: string }) {
  const [imageUrl, setImageUrl] = useState<string>()
  const [hydrated, image] = imageMetadataStore.useGet(imageId)

  useEffect(() => {
    if (image?.thumbnailDataUrl) {
      // Show thumbnail immediately from IndexedDB
      setImageUrl(image.thumbnailDataUrl)
    }
  }, [image?.thumbnailDataUrl])

  const loadFullImage = async () => {
    if (!image?.imagePath) return
    const fullUrl = await imageMetadataStore.getFullImageUrl(image.imagePath)
    setImageUrl(fullUrl)
  }

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

      {image?.uploadStatus === 'pending' && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-white">Uploading...</div>
        </div>
      )}

      {image?.isArchived && (
        <div className="absolute top-2 right-2 bg-gray-800/75 text-white px-2 py-1 rounded text-xs">
          Archived
        </div>
      )}
    </div>
  )
}
```

## Implementation Steps

### Phase 1: Schema & Utilities (Day 1)
1. Update `amplify/data/resource.ts` with new fields
2. Create `app/home/utils/imageResizer.ts` extracting existing logic
3. Update `app/home/clients/Dexie.ts` interface
4. Run `npm run sandbox` to apply schema changes

### Phase 2: Store Enhancement (Day 2)
1. Modify `app/home/clients/Database.ts` imageMetadataStore
2. Add upload, archive, and thumbnail methods
3. Implement custom sync handler for S3 uploads
4. Test basic upload and thumbnail generation

### Phase 3: Component Updates (Day 3)
1. Create `ProgressiveImage` component
2. Update `DropZoneInputImageV2` to use new store methods
3. Replace `ImageUploadStore` usage
4. Test archive/unarchive functionality

### Phase 4: Migration & Testing (Day 4-5)
1. Create migration script from `ImageUploadStore`
2. Test offline/online sync behavior
3. Verify progressive loading
4. Remove deprecated code

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