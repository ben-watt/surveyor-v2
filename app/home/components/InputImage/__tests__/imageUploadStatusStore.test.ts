import { imageUploadStatusStore } from '../imageUploadStatusStore';

describe('imageUploadStatusStore', () => {
  beforeEach(() => {
    // Reset the store's state before each test
    Object.keys(imageUploadStatusStore['uploadingPaths']).forEach(key => {
      delete imageUploadStatusStore['uploadingPaths'][key];
    });
    imageUploadStatusStore['subscribers'].clear();
  });

  it('should set and check upload status correctly', () => {
    const testPath = '/test/path';
    
    // Initially not uploading
    expect(imageUploadStatusStore.isUploading(testPath)).toBe(false);
    
    // Set as uploading
    imageUploadStatusStore.setUploading(testPath, true);
    expect(imageUploadStatusStore.isUploading(testPath)).toBe(true);
    
    // Set as not uploading
    imageUploadStatusStore.setUploading(testPath, false);
    expect(imageUploadStatusStore.isUploading(testPath)).toBe(false);
  });

  it('should set upload status to false when calling setUploaded', () => {
    const testPath = '/test/path';
    
    // Set as uploading
    imageUploadStatusStore.setUploading(testPath, true);
    expect(imageUploadStatusStore.isUploading(testPath)).toBe(true);
    
    // Mark as uploaded
    imageUploadStatusStore.setUploaded(testPath);
    expect(imageUploadStatusStore.isUploading(testPath)).toBe(false);
  });

  it('should notify subscribers when upload status changes', () => {
    const testPath = '/test/path';
    const mockCallback = jest.fn();
    
    // Subscribe to changes
    const unsubscribe = imageUploadStatusStore.subscribe(mockCallback);
    
    // Set as uploading
    imageUploadStatusStore.setUploading(testPath, true);
    expect(mockCallback).toHaveBeenCalledWith(true, testPath);
    
    // Set as not uploading
    imageUploadStatusStore.setUploading(testPath, false);
    expect(mockCallback).toHaveBeenCalledWith(false, testPath);
    
    // Unsubscribe
    unsubscribe();
    
    // Reset mock
    mockCallback.mockReset();
    
    // Change status again, callback should not be called
    imageUploadStatusStore.setUploading(testPath, true);
    expect(mockCallback).not.toHaveBeenCalled();
  });
}); 