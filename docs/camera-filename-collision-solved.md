# Camera Filename Collision Issue - SOLVED ✅

## Problem (Historical)
Camera apps often reused generic filenames like "image-01.jpg" for DIFFERENT photos. The legacy implementation incorrectly assumed files with the same name were the same image and tried to replace them.

## Scenario That Was Problematic:
1. User takes a photo of the front of a building → camera saves as "image-01.jpg"
2. User uploads it to the survey
3. User takes a photo of the back of the building → camera ALSO saves as "image-01.jpg"
4. User tries to upload this NEW photo
5. App incorrectly tried to REPLACE the front photo with the back photo
6. Using `table.add()`, it would fail with "cannot replace" error

## Solution Implemented in V2
DropZoneInputImageV2 solves this with **content-based duplicate detection**:

1. **Content Hash Generation**: Each image gets a SHA-256 hash based on its actual content
2. **True Duplicate Detection**: Images are only considered duplicates if they have the same content hash
3. **Smart Handling**:
   - Same content → Skip upload, show "already exists" message
   - Same filename, different content → Both images are uploaded successfully
   - Archived duplicate → Unarchive existing instead of uploading new

## Technical Implementation
```typescript
// In DropZoneInputImageV2.tsx
const contentHash = await generateImageHash(resizedFile);
const existingImage = pathImages.find(img => img.contentHash === contentHash);

if (existingImage) {
  if (existingImage.isArchived) {
    // Unarchive existing image
    await enhancedImageStore.unarchiveImage(existingImage.id);
    toast(`Restored archived image: ${existingImage.fileName}`);
  } else {
    // Skip duplicate active image
    toast(`Image already exists: ${existingImage.fileName}`);
  }
} else {
  // Upload new unique image
  const uploadResult = await enhancedImageStore.uploadImage(resizedFile, fullPath);
}
```

## Result
✅ **PROBLEM SOLVED**: Multiple camera photos with same filename are now handled correctly
✅ **NO MORE CONFLICTS**: Content-based detection prevents false duplicates
✅ **BETTER UX**: Users see clear feedback about what happened
✅ **EFFICIENT**: True duplicates are detected and skipped

## Files Involved
- `DropZoneInputImageV2.tsx` - Main implementation
- `enhancedImageMetadataStore.ts` - Storage layer with hash support
- `imageHashUtils.ts` - SHA-256 content hashing utility

This issue is now completely resolved in the enhanced V2 system.