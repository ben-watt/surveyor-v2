/**
 * Utilities for generating content-based hashes for images
 * This solves the duplicate filename problem by creating unique identifiers
 * based on actual image content rather than arbitrary filenames
 */

/**
 * Generate a SHA-256 hash from a File or Blob
 * @param file The file to hash
 * @returns A hex string of the hash (first 8 characters for brevity)
 */
export async function generateImageHash(file: File | Blob): Promise<string> {
  // In Node/test environment, use a fallback if crypto.subtle is not available
  if (typeof window === 'undefined' || !crypto?.subtle?.digest) {
    // Simple fallback for testing - in production this will use Web Crypto API
    let content: string;

    // Handle both text() method and FileReader for compatibility
    if (typeof file.text === 'function') {
      content = await file.text();
    } else {
      // Fallback for environments where text() is not available
      content = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsText(file);
      });
    }

    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0').substring(0, 8);
  }

  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  // Return first 8 characters for brevity (still gives us 16^8 = 4.3 billion unique values)
  return hashHex.substring(0, 8);
}

/**
 * Generate a unique filename using content hash
 * Format: originalName_hash.extension
 * Example: "image-01_a3f2c8d9.jpg"
 *
 * @param file The file to process
 * @param preserveOriginalName Whether to keep the original name as prefix
 * @returns The new filename with hash
 */
export async function generateHashedFilename(
  file: File,
  preserveOriginalName: boolean = true
): Promise<string> {
  const hash = await generateImageHash(file);
  const nameParts = file.name.split('.');
  const extension = nameParts.pop() || 'jpg';
  const baseName = nameParts.join('.');

  if (preserveOriginalName) {
    return `${baseName}_${hash}.${extension}`;
  } else {
    // Use only hash as filename for maximum uniqueness
    return `${hash}.${extension}`;
  }
}

/**
 * Check if two files have the same content by comparing their hashes
 * @param file1 First file to compare
 * @param file2 Second file to compare
 * @returns True if files have identical content
 */
export async function areFilesIdentical(
  file1: File | Blob,
  file2: File | Blob
): Promise<boolean> {
  // Quick check: if sizes differ, they're definitely different
  if (file1.size !== file2.size) {
    return false;
  }

  const hash1 = await generateImageHash(file1);
  const hash2 = await generateImageHash(file2);
  return hash1 === hash2;
}

/**
 * Process a file for upload with smart naming:
 * - If file is truly unique (different content), add hash to name
 * - If file is duplicate (same content), return existing file info
 *
 * @param newFile The file to process
 * @param existingFiles Array of existing files to check against
 * @returns Object with filename and isDuplicate flag
 */
export async function processFileWithHash(
  newFile: File,
  existingFiles: { name: string; file: File | Blob; isArchived?: boolean }[]
): Promise<{
  filename: string;
  isDuplicate: boolean;
  matchedFile?: string;
  isArchived?: boolean;
}> {
  // Check if any existing file has the same content
  for (const existing of existingFiles) {
    if (await areFilesIdentical(newFile, existing.file)) {
      // This is a true duplicate (same content)
      return {
        filename: existing.name,
        isDuplicate: true,
        matchedFile: existing.name,
        isArchived: existing.isArchived || false
      };
    }
  }

  // This is a unique file, generate hash-based name
  const hashedName = await generateHashedFilename(newFile);
  return {
    filename: hashedName,
    isDuplicate: false
  };
}

/**
 * Create a renamed File object with a new filename
 * @param originalFile The original file
 * @param newName The new filename
 * @returns A new File object with the updated name
 */
export function renameFile(originalFile: File, newName: string): File {
  return new File([originalFile], newName, {
    type: originalFile.type,
    lastModified: originalFile.lastModified
  });
}