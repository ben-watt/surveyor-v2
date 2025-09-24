# Image Upload Architecture

## Current System Overview

After Phase 1 cleanup, the image upload system now has a clear, consolidated architecture:

### Core Components

1. **DropZoneInputImageV2** - Main enhanced component with:
   - Content-based duplicate detection using SHA-256 hashes
   - Progressive upload with thumbnails
   - Archive management
   - Comprehensive error handling with exponential backoff retry

2. **EnhancedImageMetadataStore** - Advanced image management with:
   - Thumbnail generation and caching in IndexedDB
   - Background S3 uploads with retry mechanisms
   - Archive/unarchive functionality
   - Offline-first architecture

3. **ImageUploadStore** - Legacy compatibility layer for:
   - Existing image uploads
   - Simple archive operations (S3 copy/move)
   - Backward compatibility with old forms

### Sync Architecture

The system uses a layered sync approach:

- **Dexie Sync**: Handles all structured metadata sync to DynamoDB
- **Enhanced Store**: Uses base sync + manages S3 uploads and thumbnails
- **Legacy Store**: Direct S3 operations for simple use cases

### Type System

Unified around `DropZoneInputFile` from V2 component:
```typescript
export type DropZoneInputFile = {
  path: string;
  isArchived: boolean;
  hasMetadata: boolean;
  preview?: string;
};
```

### Error Handling

- **Upload Failures**: 3-retry system with exponential backoff
- **Network Issues**: Offline queue with automatic retry when online
- **User Feedback**: Toast notifications for all error states
- **Fallback**: Hybrid loading (enhanced store → legacy store)

## Cleanup Completed

✅ Removed legacy DropZoneInputImage.tsx
✅ Unified exports through index.tsx
✅ Updated all import paths
✅ Consolidated type definitions
✅ Added comprehensive error handling
✅ Documented sync architecture

## Usage

```typescript
import { DropZoneInputImage } from '@/app/home/components/InputImage';

<DropZoneInputImage
  path={joinPath('surveys', surveyId, 'photos')}
  maxFiles={5}
  features={{ archive: true, metadata: true }}
  onChange={(files) => console.log(files)}
/>
```