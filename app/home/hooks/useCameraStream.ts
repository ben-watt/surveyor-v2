import { useState, useEffect, useCallback, useRef } from 'react';

export interface CameraDevice {
  deviceId: string;
  label: string;
  kind: 'videoinput';
}

export interface CameraStreamOptions {
  facingMode?: 'user' | 'environment';
  deviceId?: string;
  width?: number | { ideal: number };
  height?: number | { ideal: number };
}

export interface UseCameraStreamReturn {
  stream: MediaStream | null;
  isLoading: boolean;
  error: string | null;
  devices: CameraDevice[];
  activeDeviceId: string | null;
  startCamera: (options?: CameraStreamOptions) => Promise<void>;
  stopCamera: () => void;
  switchCamera: (deviceId: string) => Promise<void>;
  capturePhoto: () => Promise<Blob | null>;
  hasPermission: boolean;
  setVideoRef: (el: HTMLVideoElement | null) => void;
}

export const useCameraStream = (): UseCameraStreamReturn => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Check if getUserMedia is supported
  const isSupported = useCallback(() => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }, []);

  // Get available camera devices
  const getDevices = useCallback(async () => {
    if (!isSupported()) {
      setError('Camera API not supported in this browser');
      return;
    }

    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const cameras = deviceList
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
          kind: 'videoinput' as const
        }));
      
      setDevices(cameras);
    } catch (err) {
      console.error('Error enumerating devices:', err);
      setError('Failed to get camera devices');
    }
  }, [isSupported]);

  // Start camera with given constraints
  const startCamera = useCallback(async (options: CameraStreamOptions = {}) => {
    if (!isSupported()) {
      setError('Camera API not supported in this browser');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      // Default constraints optimized for surveys (rear camera, high quality)
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: options.facingMode || 'environment',
          width: options.width || { ideal: 1920 },
          height: options.height || { ideal: 1080 },
          ...(options.deviceId && { deviceId: { exact: options.deviceId } })
        },
        audio: false
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      setHasPermission(true);
      
      // Track active device
      const videoTrack = newStream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        setActiveDeviceId(settings.deviceId || null);
      }

      // Update devices list with labels now that we have permission
      await getDevices();
    } catch (err) {
      console.error('Error starting camera:', err);
      
      if (err instanceof Error) {
        switch (err.name) {
          case 'NotAllowedError':
            setError('Camera permission denied. Please allow camera access.');
            break;
          case 'NotFoundError':
            setError('No camera found on this device.');
            break;
          case 'NotReadableError':
            setError('Camera is already in use by another application.');
            break;
          case 'OverconstrainedError':
            setError('Camera settings not supported. Trying with default settings.');
            // Retry with minimal constraints
            try {
              const fallbackStream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: false 
              });
              setStream(fallbackStream);
              setHasPermission(true);
            } catch (fallbackErr) {
              setError('Failed to start camera with fallback settings.');
            }
            break;
          default:
            setError(`Camera error: ${err.message}`);
        }
      } else {
        setError('Unknown camera error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [stream, isSupported, getDevices]);

  // Stop camera and cleanup
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
      setActiveDeviceId(null);
    }
  }, [stream]);

  // Switch to a different camera
  const switchCamera = useCallback(async (deviceId: string) => {
    if (!deviceId) return;
    
    await startCamera({ deviceId });
  }, [startCamera]);

  // Capture photo from current stream
  const capturePhoto = useCallback(async (): Promise<Blob | null> => {
    console.log('🔵 capturePhoto called', { 
      hasStream: !!stream, 
      hasVideoRef: !!videoRef.current 
    });
    
    if (!stream || !videoRef.current) {
      console.error('🔴 Missing stream or videoRef', { stream: !!stream, videoRef: !!videoRef.current });
      setError('No active camera stream for photo capture');
      return null;
    }

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        setError('Failed to create canvas context');
        return null;
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (canvas.width === 0 || canvas.height === 0) {
        setError('Video not ready for capture');
        return null;
      }

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          'image/jpeg',
          0.8 // 80% quality for good balance of size/quality
        );
      });
    } catch (err) {
      console.error('Error capturing photo:', err);
      setError('Failed to capture photo');
      return null;
    }
  }, [stream]);

  // Set video ref for photo capture
  const setVideoRef = useCallback((videoElement: HTMLVideoElement | null) => {
    videoRef.current = videoElement;
  }, []);

  // Update video src when stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      (videoRef.current as any).srcObject = stream;
    }
  }, [stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Get initial devices list (without camera access)
  useEffect(() => {
    getDevices();
  }, [getDevices]);

  return {
    stream,
    isLoading,
    error,
    devices,
    activeDeviceId,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
    hasPermission,
    setVideoRef
  };
};