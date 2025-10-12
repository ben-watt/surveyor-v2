import {
  generateImageHash,
  generateHashedFilename,
  areFilesIdentical,
  processFileWithHash,
  renameFile,
} from '../imageHashUtils';

describe('imageHashUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateImageHash', () => {
    it('should generate consistent hash for same content', async () => {
      const content = 'test image content';
      const file1 = new File([content], 'test1.jpg', { type: 'image/jpeg' });
      const file2 = new File([content], 'test2.jpg', { type: 'image/jpeg' });

      const hash1 = await generateImageHash(file1);
      const hash2 = await generateImageHash(file2);

      // Same content should produce same hash
      expect(hash1).toBe(hash2);
      // Hash should be 8 characters
      expect(hash1).toHaveLength(8);
      // Hash should be hexadecimal
      expect(hash1).toMatch(/^[a-f0-9]{8}$/);
    });

    it('should generate different hashes for different content', async () => {
      const file1 = new File(['content1'], 'test1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['content2'], 'test2.jpg', { type: 'image/jpeg' });

      const hash1 = await generateImageHash(file1);
      const hash2 = await generateImageHash(file2);

      expect(hash1).not.toBe(hash2);
      expect(hash1).toHaveLength(8);
      expect(hash2).toHaveLength(8);
    });
  });

  describe('generateHashedFilename', () => {
    it('should append hash to original filename', async () => {
      const file = new File(['content'], 'image-01.jpg', { type: 'image/jpeg' });

      const hashedName = await generateHashedFilename(file, true);

      // Should have format: originalName_hash.extension
      expect(hashedName).toMatch(/^image-01_[a-f0-9]{8}\.jpg$/);
      expect(hashedName.startsWith('image-01_')).toBe(true);
      expect(hashedName.endsWith('.jpg')).toBe(true);
    });

    it('should use only hash when preserveOriginalName is false', async () => {
      const file = new File(['content'], 'image-01.jpg', { type: 'image/jpeg' });

      const hashedName = await generateHashedFilename(file, false);

      // Should have format: hash.extension
      expect(hashedName).toMatch(/^[a-f0-9]{8}\.jpg$/);
      expect(hashedName).not.toContain('image-01');
      expect(hashedName.endsWith('.jpg')).toBe(true);
    });

    it('should handle files with multiple dots in name', async () => {
      const file = new File(['content'], 'my.photo.image.jpg', { type: 'image/jpeg' });

      const hashedName = await generateHashedFilename(file, true);
      expect(hashedName).toMatch(/^my\.photo\.image_[a-f0-9]{8}\.jpg$/);
    });
  });

  describe('areFilesIdentical', () => {
    it('should return false for files with different sizes', async () => {
      const file1 = new File(['short'], 'file1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['much longer content'], 'file2.jpg', { type: 'image/jpeg' });

      const result = await areFilesIdentical(file1, file2);
      expect(result).toBe(false);
      // Should skip hash comparison due to different sizes
    });

    it('should return true for files with same content', async () => {
      const content = 'identical content';
      const file1 = new File([content], 'file1.jpg', { type: 'image/jpeg' });
      const file2 = new File([content], 'file2.jpg', { type: 'image/jpeg' });

      const result = await areFilesIdentical(file1, file2);
      expect(result).toBe(true);
    });

    it('should return false for files with same size but different content', async () => {
      const file1 = new File(['12345'], 'file1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['abcde'], 'file2.jpg', { type: 'image/jpeg' });

      const result = await areFilesIdentical(file1, file2);
      expect(result).toBe(false);
    });
  });

  describe('processFileWithHash', () => {
    it('should detect true duplicates (same content)', async () => {
      const existingContent = 'kitchen photo';
      const existingFile = new File([existingContent], 'image-01.jpg', { type: 'image/jpeg' });

      // Camera takes "new" photo but it's actually the same image
      const newFile = new File([existingContent], 'image-01.jpg', { type: 'image/jpeg' });

      const result = await processFileWithHash(newFile, [
        { name: 'image-01_abc123.jpg', file: existingFile },
      ]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matchedFile).toBe('image-01_abc123.jpg');
    });

    it('should handle different images with same camera filename', async () => {
      // Existing photo
      const existingFile = new File(['kitchen damage'], 'image-01.jpg', { type: 'image/jpeg' });

      // New different photo with same camera filename
      const newFile = new File(['bathroom leak'], 'image-01.jpg', { type: 'image/jpeg' });

      const result = await processFileWithHash(newFile, [
        { name: 'image-01_abc123.jpg', file: existingFile },
      ]);

      expect(result.isDuplicate).toBe(false);
      // Should have the original name with a hash appended
      expect(result.filename).toMatch(/^image-01_[a-f0-9]{8}\.jpg$/);
    });

    it('should handle multiple existing files', async () => {
      const existing1 = new File(['photo1'], 'image-01.jpg', { type: 'image/jpeg' });
      const existing2 = new File(['photo2'], 'image-02.jpg', { type: 'image/jpeg' });
      const newFile = new File(['photo3'], 'image-01.jpg', { type: 'image/jpeg' });

      const result = await processFileWithHash(newFile, [
        { name: 'image-01_hash1.jpg', file: existing1 },
        { name: 'image-02_hash2.jpg', file: existing2 },
      ]);

      expect(result.isDuplicate).toBe(false);
      expect(result.filename).toMatch(/^image-01_[a-f0-9]{8}\.jpg$/);
    });
  });

  describe('renameFile', () => {
    it('should create new File with updated name', () => {
      const original = new File(['content'], 'old-name.jpg', {
        type: 'image/jpeg',
        lastModified: 1234567890,
      });

      const renamed = renameFile(original, 'new-name_hash123.jpg');

      expect(renamed.name).toBe('new-name_hash123.jpg');
      expect(renamed.type).toBe('image/jpeg');
      expect(renamed.lastModified).toBe(1234567890);
      expect(renamed.size).toBe(original.size);
    });
  });

  describe('Real-world camera scenarios', () => {
    it('should handle iPhone Live Photos (HEIC with same name pattern)', async () => {
      // iPhones often use IMG_0001.HEIC, IMG_0002.HEIC, etc.
      const photo1 = new File(['living room'], 'IMG_0001.HEIC', { type: 'image/heic' });
      const photo2 = new File(['bedroom'], 'IMG_0001.HEIC', { type: 'image/heic' });

      const hash1 = await generateHashedFilename(photo1);
      const hash2 = await generateHashedFilename(photo2);

      // Both should have the pattern IMG_0001_[hash].HEIC
      expect(hash1).toMatch(/^IMG_0001_[a-f0-9]{8}\.HEIC$/);
      expect(hash2).toMatch(/^IMG_0001_[a-f0-9]{8}\.HEIC$/);
      // But with different hashes since content is different
      expect(hash1).not.toBe(hash2);
    });

    it('should handle Android camera patterns (IMG_20240101_120000.jpg)', async () => {
      // Android often uses timestamp patterns but can still collide
      const photo1 = new File(['front'], 'IMG_20240101_120000.jpg', { type: 'image/jpeg' });
      const photo2 = new File(['back'], 'IMG_20240101_120000.jpg', { type: 'image/jpeg' });

      const hash1 = await generateHashedFilename(photo1);
      const hash2 = await generateHashedFilename(photo2);

      expect(hash1).toMatch(/^IMG_20240101_120000_[a-f0-9]{8}\.jpg$/);
      expect(hash2).toMatch(/^IMG_20240101_120000_[a-f0-9]{8}\.jpg$/);
      expect(hash1).not.toBe(hash2);
    });
  });
});
