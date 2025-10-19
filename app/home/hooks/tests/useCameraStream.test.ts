import { renderHook, act } from '@testing-library/react';
import { useCameraStream } from '../useCameraStream';

// Mock getUserMedia and other browser APIs
const mockGetUserMedia = jest.fn();
const mockEnumerateDevices = jest.fn();
const mockVideoElement = {
  videoWidth: 1920,
  videoHeight: 1080,
  readyState: 4,
  paused: false,
  currentTime: 1.5,
} as HTMLVideoElement;

const mockTrackBase = {
  stop: jest.fn(),
  getSettings: jest.fn(() => ({ deviceId: 'device1' })),
  getCapabilities: jest.fn(() => ({})),
  applyConstraints: jest.fn(async () => {}),
};

const mockStream = {
  getTracks: jest.fn(() => [mockTrackBase as any]),
  getVideoTracks: jest.fn(() => [mockTrackBase as any]),
} as unknown as MediaStream;

const mockCanvas = {
  width: 0,
  height: 0,
  getContext: jest.fn(() => ({
    drawImage: jest.fn(),
  })),
  toBlob: jest.fn((callback) => {
    const mockBlob = new Blob(['photo'], { type: 'image/jpeg' });
    callback(mockBlob);
  }),
} as unknown as HTMLCanvasElement;

// Mock DOM APIs
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
    enumerateDevices: mockEnumerateDevices,
  },
  writable: true,
});

// Store original createElement
const originalCreateElement = global.document.createElement;

Object.defineProperty(global.document, 'createElement', {
  value: jest.fn((tagName) => {
    if (tagName === 'canvas') {
      return mockCanvas;
    }
    // Use original createElement for other elements
    return originalCreateElement.call(document, tagName);
  }),
  writable: true,
});

describe('useCameraStream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserMedia.mockResolvedValue(mockStream);
    mockEnumerateDevices.mockResolvedValue([
      { deviceId: 'device1', label: 'Front Camera', kind: 'videoinput' },
      { deviceId: 'device2', label: 'Back Camera', kind: 'videoinput' },
    ]);
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useCameraStream());

    expect(result.current.stream).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.devices).toEqual([]);
    expect(result.current.activeDeviceId).toBeNull();
    expect(result.current.hasPermission).toBe(false);
  });

  it('starts camera successfully', async () => {
    const { result } = renderHook(() => useCameraStream());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(mockGetUserMedia).toHaveBeenCalledWith({
      video: {
        facingMode: 'environment',
        width: { ideal: 2560 },
        height: { ideal: 1440 },
      },
      audio: false,
    });
    expect(result.current.stream).toBe(mockStream);
    expect(result.current.hasPermission).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('starts camera with custom options', async () => {
    const { result } = renderHook(() => useCameraStream());

    await act(async () => {
      await result.current.startCamera({
        facingMode: 'user',
        width: 1280,
        height: 720,
        deviceId: 'specific-device',
      });
    });

    expect(mockGetUserMedia).toHaveBeenCalledWith({
      video: {
        facingMode: 'user',
        width: 1280,
        height: 720,
        deviceId: { exact: 'specific-device' },
      },
      audio: false,
    });
  });

  it('handles camera permission denied error', async () => {
    const { result } = renderHook(() => useCameraStream());

    const permissionError = new Error('Permission denied');
    permissionError.name = 'NotAllowedError';
    mockGetUserMedia.mockRejectedValue(permissionError);

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.error).toBe('Camera permission denied. Please allow camera access.');
    expect(result.current.stream).toBeNull();
    expect(result.current.hasPermission).toBe(false);
  });

  it('handles no camera found error', async () => {
    const { result } = renderHook(() => useCameraStream());

    const notFoundError = new Error('No camera found');
    notFoundError.name = 'NotFoundError';
    mockGetUserMedia.mockRejectedValue(notFoundError);

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.error).toBe('No camera found on this device.');
  });

  it('handles camera in use error', async () => {
    const { result } = renderHook(() => useCameraStream());

    const inUseError = new Error('Camera in use');
    inUseError.name = 'NotReadableError';
    mockGetUserMedia.mockRejectedValue(inUseError);

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.error).toBe('Camera is already in use by another application.');
  });

  it('handles overconstrained error with fallback', async () => {
    const { result } = renderHook(() => useCameraStream());

    const overconstrainedError = new Error('Overconstrained');
    overconstrainedError.name = 'OverconstrainedError';
    mockGetUserMedia.mockRejectedValueOnce(overconstrainedError).mockResolvedValueOnce(mockStream);

    await act(async () => {
      await result.current.startCamera();
    });

    expect(mockGetUserMedia).toHaveBeenCalledTimes(2);
    // Second call should fallback to 1080p ideals
    expect(mockGetUserMedia).toHaveBeenLastCalledWith({
      video: expect.objectContaining({
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      }),
      audio: false,
    });
    expect(result.current.stream).toBe(mockStream);
  });

  it('stops camera and cleans up stream', async () => {
    const mockTrack = { stop: jest.fn(), getSettings: jest.fn(() => ({ deviceId: 'device1' })) };
    const testStream = {
      getTracks: jest.fn(() => [mockTrack]),
    } as unknown as MediaStream;

    mockGetUserMedia.mockResolvedValue(testStream);

    const { result } = renderHook(() => useCameraStream());

    // Start camera first
    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.stream).toBe(testStream);

    // Stop camera
    act(() => {
      result.current.stopCamera();
    });

    expect(mockTrack.stop).toHaveBeenCalled();
    expect(result.current.stream).toBeNull();
    expect(result.current.activeDeviceId).toBeNull();
  });

  it('switches camera to different device', async () => {
    const { result } = renderHook(() => useCameraStream());

    await act(async () => {
      await result.current.switchCamera('device2');
    });

    expect(mockGetUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        video: expect.objectContaining({
          deviceId: { exact: 'device2' },
        }),
      }),
    );
  });

  it('enumerates available devices', async () => {
    const { result } = renderHook(() => useCameraStream());

    await act(async () => {
      // Trigger device enumeration by starting camera
      await result.current.startCamera();
    });

    expect(mockEnumerateDevices).toHaveBeenCalled();
    expect(result.current.devices).toEqual([
      { deviceId: 'device1', label: 'Front Camera', kind: 'videoinput' },
      { deviceId: 'device2', label: 'Back Camera', kind: 'videoinput' },
    ]);
  });

  it('sets video ref for photo capture', () => {
    const { result } = renderHook(() => useCameraStream());

    act(() => {
      result.current.setVideoRef(mockVideoElement);
    });

    // Video ref is internal, but we can test capture functionality
    expect(typeof result.current.setVideoRef).toBe('function');
  });

  it('captures photo successfully', async () => {
    const { result } = renderHook(() => useCameraStream());

    // Setup camera and video ref
    await act(async () => {
      await result.current.startCamera();
      result.current.setVideoRef(mockVideoElement);
    });

    let capturedBlob: Blob | null = null;
    await act(async () => {
      capturedBlob = await result.current.capturePhoto();
    });

    expect(capturedBlob).toBeInstanceOf(Blob);
    expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
  });

  it('exposes zoom capabilities and applies hardware zoom when available', async () => {
    const trackWithZoom = {
      ...mockTrackBase,
      getCapabilities: jest.fn(() => ({ zoom: { min: 1, max: 3, step: 0.1 } })),
      getSettings: jest.fn(() => ({ deviceId: 'device1', zoom: 1 })),
      applyConstraints: jest.fn(async () => {}),
    };
    const streamWithZoom = {
      getTracks: jest.fn(() => [trackWithZoom as any]),
      getVideoTracks: jest.fn(() => [trackWithZoom as any]),
    } as unknown as MediaStream;

    mockGetUserMedia.mockResolvedValueOnce(streamWithZoom);

    const { result } = renderHook(() => useCameraStream());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.supportedFeatures.zoom).toBe(true);
    expect(result.current.capabilities.zoom).toEqual({ min: 1, max: 3, step: 0.1 });

    await act(async () => {
      await result.current.setZoom(2);
    });

    expect(trackWithZoom.applyConstraints).toHaveBeenCalled();
  });

  it('uses ImageCapture for high-quality capture when available', async () => {
    // Mock ImageCapture API
    const takePhoto = jest.fn(async () => new Blob(['photo'], { type: 'image/jpeg' }));
    (globalThis as any).ImageCapture = jest.fn(function () {
      return { takePhoto };
    });
    // Mock createImageBitmap
    (globalThis as any).createImageBitmap = jest.fn(async () => ({ width: 3000, height: 2000 }));

    const { result } = renderHook(() => useCameraStream());

    await act(async () => {
      await result.current.startCamera();
      result.current.setVideoRef(mockVideoElement);
    });

    let capturedBlob: Blob | null = null;
    await act(async () => {
      capturedBlob = await result.current.capturePhoto({ targetLongEdge: 2000, jpegQuality: 0.9 });
    });

    expect(takePhoto).toHaveBeenCalled();
    expect(capturedBlob).toBeInstanceOf(Blob);

    // Cleanup mocked globals
    delete (globalThis as any).ImageCapture;
    delete (globalThis as any).createImageBitmap;
  });

  it('fails to capture photo without stream', async () => {
    const { result } = renderHook(() => useCameraStream());

    let capturedBlob: Blob | null = null;
    await act(async () => {
      capturedBlob = await result.current.capturePhoto();
    });

    expect(capturedBlob).toBeNull();
    expect(result.current.error).toBe('No active camera stream for photo capture');
  });

  it('fails to capture photo without video ref', async () => {
    const { result } = renderHook(() => useCameraStream());

    // Start camera but don't set video ref
    await act(async () => {
      await result.current.startCamera();
    });

    let capturedBlob: Blob | null = null;
    await act(async () => {
      capturedBlob = await result.current.capturePhoto();
    });

    expect(capturedBlob).toBeNull();
    expect(result.current.error).toBe('No active camera stream for photo capture');
  });

  it('fails to capture when video dimensions are zero', async () => {
    const { result } = renderHook(() => useCameraStream());

    const zeroSizeVideo = { ...mockVideoElement, videoWidth: 0, videoHeight: 0 };

    await act(async () => {
      await result.current.startCamera();
      result.current.setVideoRef(zeroSizeVideo as HTMLVideoElement);
    });

    let capturedBlob: Blob | null = null;
    await act(async () => {
      capturedBlob = await result.current.capturePhoto();
    });

    expect(capturedBlob).toBeNull();
    expect(result.current.error).toBe('Video not ready for capture');
  });

  it('cleans up stream on unmount', async () => {
    const mockTrack = { stop: jest.fn(), getSettings: jest.fn(() => ({ deviceId: 'device1' })) };
    const testStream = {
      getTracks: jest.fn(() => [mockTrack]),
    } as unknown as MediaStream;

    mockGetUserMedia.mockResolvedValue(testStream);

    const { result, unmount } = renderHook(() => useCameraStream());

    // Start camera to create a real stream
    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.stream).toBe(testStream);

    unmount();

    expect(mockTrack.stop).toHaveBeenCalled();
  });
});
