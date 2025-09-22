# Camera Duplicate Filename Issue Analysis

## Problem Summary

Users are experiencing an error "cannot replace image-01.jpg" when uploading photos from their camera. This occurs because:

1. **Camera apps reuse generic filenames** (e.g., "image-01.jpg", "IMG_001.jpg") for different photos
2. **The app incorrectly assumes files with the same name are the same image** and tries to replace them
3. **The replacement fails** because `imageUploadStore.create()` uses `table.add()` which throws an error when the key already exists

## Root Cause Analysis

### Current Behavior (DropZoneInputImage.tsx lines 283-343)

When a file is dropped/uploaded, the code checks:
```typescript
const existingFile = files.find((f) => f.name === file.name);

if (existingFile) {
  if (existingFile.isArchived) {
    // Unarchive the existing file
  } else {
    // PROBLEM: Tries to REPLACE the existing file
    await imageUploadStore.create({...}) // This fails!
  }
}
```

### Why It Fails (ImageUploadStore.ts line 157)

```typescript
create: async (data: CreateImageUpload) => {
  await table.add({...}) // add() throws if key exists!
}
```

The `table.add()` method throws an error if a record with the same primary key `[path, tenantId]` already exists.

## The Real Issue

**These are DIFFERENT images that happen to share the same filename.** The current logic incorrectly treats them as the same image and tries to replace, when it should:

1. Recognize they are different images
2. Either rename the new image or handle the collision appropriately

## Example Scenario

1. User takes photo of kitchen damage → Camera saves as "image-01.jpg"
2. User uploads to survey
3. User takes photo of bathroom leak → Camera ALSO saves as "image-01.jpg" (different photo!)
4. User tries to upload → App tries to REPLACE kitchen photo with bathroom photo
5. Error: "cannot replace image-01.jpg"

## Solutions

### Option 1: Auto-rename on Collision
```typescript
function generateUniqueFilename(originalName: string, existingFiles: string[]): string {
  let finalName = originalName;
  let counter = 1;

  while (existingFiles.includes(finalName)) {
    const [baseName, ext] = originalName.split(/\.(?=[^.]+$)/);
    finalName = `${baseName}-${counter}.${ext}`;
    counter++;
  }

  return finalName; // e.g., "image-01-1.jpg", "image-01-2.jpg"
}
```

### Option 2: Timestamp-based Naming
```typescript
function addTimestampToFilename(originalName: string): string {
  const timestamp = Date.now();
  const [baseName, ext] = originalName.split(/\.(?=[^.]+$)/);
  return `${baseName}_${timestamp}.${ext}`; // e.g., "image-01_1704110400000.jpg"
}
```

### Option 3: Fix the Immediate Error
Change `ImageUploadStore.ts` to use `put()` instead of `add()`:
```typescript
create: async (data: CreateImageUpload) => {
  await table.put({...}) // put() will update or insert
}
```
**Note:** This would replace existing images, which may not be desired behavior.

### Option 4: Prompt User
Show a dialog asking:
- Replace existing image
- Keep both (rename new)
- Cancel upload

## Recommended Solution: Hash-Based Naming

The best solution is to use **content-based hashing** to create unique filenames. This approach:

1. **Prevents all filename collisions** - Different images get different hashes
2. **Detects true duplicates** - Same image content gets the same hash
3. **Preserves original context** - Original filename is kept with hash appended
4. **Works universally** - Handles any camera naming scheme

### Hash-Based Implementation

Add the hash utility (`app/home/utils/imageHashUtils.ts`) and integrate into `DropZoneInputImage.tsx`:

```typescript
import { processFileWithHash, renameFile } from '@/app/home/utils/imageHashUtils';

// In onDrop handler:
const processedFiles = await Promise.all(
  acceptedFiles.map(async (file) => {
    // Check existing files for duplicates/collisions
    const existingFileData = files.map(f => ({ name: f.name, file: f }));

    const processResult = await processFileWithHash(file, existingFileData);

    if (processResult.isDuplicate) {
      // Same content - skip duplicate
      toast.info(`Image already exists: ${processResult.matchedFile}`);
      return null;
    }

    // Different content - rename with hash
    const hashedFile = renameFile(file, processResult.filename);
    // ... continue with normal processing
  })
);
```

### Example Transformations

- `image-01.jpg` (kitchen) → `image-01_a3f2c8d9.jpg`
- `image-01.jpg` (bathroom) → `image-01_b7e4d2f1.jpg`
- `IMG_0001.HEIC` (photo1) → `IMG_0001_3fa8b2c1.HEIC`
- `IMG_0001.HEIC` (photo2) → `IMG_0001_9d2e5f8a.HEIC`

### Alternative: Simple Auto-rename (without hashing)

For a simpler approach without content analysis:

This ensures:
- No data loss (all photos are kept)
- Clear naming (users can see "image-01.jpg", "image-01-1.jpg", etc.)
- No errors during upload
- Works with any camera app's naming scheme

## Tests Created

1. `camera-filename-collision.test.tsx` - Demonstrates the problem and solutions
2. `DropZoneInputImage.camera-duplicate.test.tsx` - Tests the actual component behavior
3. `DropZoneInputImage.duplicate.test.tsx` - Integration tests for duplicate handling

## Impact

This issue affects all users who:
- Use mobile devices to take photos (iOS/Android cameras)
- Use external cameras that generate generic filenames
- Upload multiple photos in a survey session

## Next Steps

1. Implement the auto-rename solution in `DropZoneInputImage.tsx`
2. Add user feedback (toast notification) when files are renamed
3. Consider adding a setting to let users choose their preferred collision handling
4. Update tests to verify the new behavior