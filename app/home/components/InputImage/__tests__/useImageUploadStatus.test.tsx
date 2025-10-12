import { renderHook, act } from '@testing-library/react';
import { useImageUploadStatus } from '../useImageUploadStatus';
import { imageUploadStatusStore } from '../imageUploadStatusStore';

// Mock the imageUploadStatusStore
jest.mock('../imageUploadStatusStore', () => {
  // Use a more realistic implementation
  const mockUploadingPaths: Record<string, boolean> = {};
  const mockSubscribers = new Set<Function>();

  return {
    imageUploadStatusStore: {
      isUploading: jest.fn((path: string) => !!mockUploadingPaths[path]),
      setUploading: jest.fn((path: string, isUploading: boolean) => {
        mockUploadingPaths[path] = isUploading;
        mockSubscribers.forEach((callback) => callback(isUploading, path));
      }),
      subscribe: jest.fn((callback: Function) => {
        mockSubscribers.add(callback);
        return jest.fn(() => {
          mockSubscribers.delete(callback);
        });
      }),
      _reset: () => {
        Object.keys(mockUploadingPaths).forEach((key) => {
          delete mockUploadingPaths[key];
        });
        mockSubscribers.clear();
      },
    },
  };
});

describe('useImageUploadStatus', () => {
  const testPaths = ['/test/path/1', '/test/path/2'];

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock store state
    (imageUploadStatusStore as any)._reset();
  });

  it('should return isUploading=false when no paths are uploading', () => {
    const { result } = renderHook(() => useImageUploadStatus(testPaths));

    expect(result.current.isUploading).toBe(false);
    expect(imageUploadStatusStore.subscribe).toHaveBeenCalled();
  });

  it('should return isUploading=true when any path is uploading', () => {
    // Set up a path as uploading before rendering the hook
    imageUploadStatusStore.setUploading(testPaths[0], true);

    const { result } = renderHook(() => useImageUploadStatus(testPaths));

    expect(result.current.isUploading).toBe(true);
  });

  it('should update isUploading when upload status changes', () => {
    // Start with no uploads
    const { result } = renderHook(() => useImageUploadStatus(testPaths));

    // Initial state should be false
    expect(result.current.isUploading).toBe(false);

    // Simulate an upload starting
    act(() => {
      imageUploadStatusStore.setUploading(testPaths[0], true);
    });

    // isUploading should now be true
    expect(result.current.isUploading).toBe(true);

    // Simulate the upload completing
    act(() => {
      imageUploadStatusStore.setUploading(testPaths[0], false);
    });

    // isUploading should be false again
    expect(result.current.isUploading).toBe(false);
  });

  it('should correctly check specific paths with isPathUploading', () => {
    // Set up the second path as uploading
    imageUploadStatusStore.setUploading(testPaths[1], true);

    const { result } = renderHook(() => useImageUploadStatus(testPaths));

    // Overall uploading status should be true
    expect(result.current.isUploading).toBe(true);

    // Check specific paths
    expect(result.current.isPathUploading(testPaths[0])).toBe(false);
    expect(result.current.isPathUploading(testPaths[1])).toBe(true);
  });

  it('should unsubscribe when unmounted', () => {
    // We need to spy on the unsubscribe function
    const unsubscribeSpy = jest.fn();
    (imageUploadStatusStore.subscribe as jest.Mock).mockReturnValueOnce(unsubscribeSpy);

    const { unmount } = renderHook(() => useImageUploadStatus(testPaths));

    unmount();

    expect(unsubscribeSpy).toHaveBeenCalled();
  });

  it('should re-subscribe when paths change', () => {
    const { rerender } = renderHook((paths) => useImageUploadStatus(paths), {
      initialProps: testPaths,
    });

    expect(imageUploadStatusStore.subscribe).toHaveBeenCalledTimes(1);

    // Change the paths
    const newPaths = [...testPaths, '/test/path/3'];
    rerender(newPaths);

    // Should subscribe again with the new paths
    expect(imageUploadStatusStore.subscribe).toHaveBeenCalledTimes(2);
  });
});
