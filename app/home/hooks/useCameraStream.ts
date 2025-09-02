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

export interface CameraCapabilitiesSummary {
  zoom?: {
    min: number;
    max: number;
    step?: number;
  };
}

export interface SupportedCameraFeatures {
  zoom: boolean;
  imageCapture: boolean;
}

export interface CaptureOptions {
  targetLongEdge?: number;
  jpegQuality?: number; // 0..1
  // When hardware zoom is not supported and preview uses CSS scale,
  // pass the preview scale so we crop the canvas to match the UI.
  previewZoomScale?: number; // 1 = no zoom, >1 zoom-in
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
  capturePhoto: (options?: CaptureOptions) => Promise<Blob | null>;
  hasPermission: boolean;
  setVideoRef: (el: HTMLVideoElement | null) => void;
  // Quality/zoom additions
  capabilities: CameraCapabilitiesSummary;
  supportedFeatures: SupportedCameraFeatures;
  currentZoom: number | null;
  setZoom: (value: number) => Promise<void>;
}

export const useCameraStream = (): UseCameraStreamReturn => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const imageCaptureRef = useRef<any | null>(null);
  const [capabilities, setCapabilities] = useState<CameraCapabilitiesSummary>({});
  const [supportedFeatures, setSupportedFeatures] = useState<SupportedCameraFeatures>({
    zoom: false,
    imageCapture: false
  });
  const [currentZoom, setCurrentZoom] = useState<number | null>(null);

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

      // Start with higher ideal resolution; gracefully fallback on errors below
      const highConstraints: MediaStreamConstraints = {
        video: {
          facingMode: options.facingMode || 'environment',
          width: options.width || { ideal: 2560 },
          height: options.height || { ideal: 1440 },
          ...(options.deviceId && { deviceId: { exact: options.deviceId } })
        },
        audio: false
      };

      let newStream: MediaStream | null = null;
      try {
        newStream = await navigator.mediaDevices.getUserMedia(highConstraints);
      } catch {
        // Fallback to 1080p ideals
        const fallback1080: MediaStreamConstraints = {
          video: {
            facingMode: options.facingMode || 'environment',
            width: options.width || { ideal: 1920 },
            height: options.height || { ideal: 1080 },
            ...(options.deviceId && { deviceId: { exact: options.deviceId } })
          },
          audio: false
        };
        try {
          newStream = await navigator.mediaDevices.getUserMedia(fallback1080);
        } catch {
          // Last resort: browser default
          newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
      }

      if (!newStream) {
        throw new Error('Failed to start camera');
      }

      setStream(newStream);
      setHasPermission(true);
      
      // Track active device
      const videoTrack = newStream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        setActiveDeviceId(settings.deviceId || null);
        videoTrackRef.current = videoTrack;

        // Read capabilities and settings for features like zoom
        try {
          const caps = (videoTrack as any).getCapabilities
            ? (videoTrack as any).getCapabilities()
            : undefined;
          const sett = videoTrack.getSettings();
          const zoomCap = caps && typeof caps.zoom === 'object' ? caps.zoom : undefined;
          setCapabilities(prev => ({
            ...prev,
            ...(zoomCap
              ? { zoom: { min: zoomCap.min, max: zoomCap.max, step: zoomCap.step } }
              : {})
          }));
          setSupportedFeatures(prev => ({
            ...prev,
            zoom: !!zoomCap,
            imageCapture: typeof (globalThis as any).ImageCapture === 'function'
          }));
          setCurrentZoom(typeof (sett as any).zoom === 'number' ? (sett as any).zoom : null);
        } catch {
          setSupportedFeatures(prev => ({
            ...prev,
            zoom: false,
            imageCapture: typeof (globalThis as any).ImageCapture === 'function'
          }));
        }

        // Initialize ImageCapture when available for higher-quality stills
        try {
          if (typeof (globalThis as any).ImageCapture === 'function') {
            imageCaptureRef.current = new (globalThis as any).ImageCapture(videoTrack);
          } else {
            imageCaptureRef.current = null;
          }
        } catch {
          imageCaptureRef.current = null;
        }
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
      videoTrackRef.current = null;
      imageCaptureRef.current = null;
    }
  }, [stream]);

  // Switch to a different camera
  const switchCamera = useCallback(async (deviceId: string) => {
    if (!deviceId) return;
    
    await startCamera({ deviceId });
  }, [startCamera]);

  // Capture photo from current stream
  const capturePhoto = useCallback(async (options?: CaptureOptions): Promise<Blob | null> => {
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
      const targetLongEdge = options?.targetLongEdge ?? 2400;
      const jpegQuality = options?.jpegQuality ?? 0.92;

      // Prefer ImageCapture when available for full-resolution stills
      if (!imageCaptureRef.current && (globalThis as any).ImageCapture && videoTrackRef.current) {
        try {
          imageCaptureRef.current = new (globalThis as any).ImageCapture(videoTrackRef.current);
        } catch {
          imageCaptureRef.current = null;
        }
      }

      if (imageCaptureRef.current) {
        try {
          const blob: Blob = await imageCaptureRef.current.takePhoto();
          // Downscale with canvas to a practical size
          const bitmap = await createImageBitmap(blob);
          const { width: srcW, height: srcH } = bitmap;
          const scale = targetLongEdge / Math.max(srcW, srcH);
          const destW = Math.round(srcW * Math.min(1, scale));
          const destH = Math.round(srcH * Math.min(1, scale));
          const canvas = document.createElement('canvas');
          canvas.width = destW;
          canvas.height = destH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return blob;
          }
          ctx.drawImage(bitmap, 0, 0, destW, destH);
          return await new Promise(resolve =>
            canvas.toBlob(b => resolve(b as Blob), 'image/jpeg', jpegQuality)
          );
        } catch (icErr) {
          console.warn('ImageCapture failed, falling back to canvas:', icErr);
        }
      }

      // Fallback to drawing the current video frame to canvas
      const video = videoRef.current;
      const srcW = video.videoWidth;
      const srcH = video.videoHeight;
      if (srcW === 0 || srcH === 0) {
        setError('Video not ready for capture');
        return null;
      }

      // Apply fallback zoom by cropping the source rectangle when preview uses CSS scale
      const previewScale = options?.previewZoomScale && options.previewZoomScale > 1
        ? options.previewZoomScale
        : 1;
      const cropW = Math.round(srcW / previewScale);
      const cropH = Math.round(srcH / previewScale);
      const sx = Math.floor((srcW - cropW) / 2);
      const sy = Math.floor((srcH - cropH) / 2);

      // First render cropped frame to an intermediate canvas at full source size
      const stage = document.createElement('canvas');
      stage.width = cropW;
      stage.height = cropH;
      const sctx = stage.getContext('2d');
      if (!sctx) {
        setError('Failed to create canvas context');
        return null;
      }
      sctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, cropW, cropH);

      // Downscale to target long edge
      const scale = targetLongEdge / Math.max(cropW, cropH);
      const outW = Math.round(cropW * Math.min(1, scale));
      const outH = Math.round(cropH * Math.min(1, scale));
      const out = document.createElement('canvas');
      out.width = outW;
      out.height = outH;
      const octx = out.getContext('2d');
      if (!octx) {
        setError('Failed to create canvas context');
        return null;
      }
      octx.drawImage(stage, 0, 0, outW, outH);
      return await new Promise(resolve =>
        out.toBlob(b => resolve(b as Blob), 'image/jpeg', jpegQuality)
      );
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

  const setZoom = useCallback(async (value: number) => {
    const track = videoTrackRef.current as any;
    if (!track || !supportedFeatures.zoom) return;
    try {
      const caps = track.getCapabilities ? track.getCapabilities() : undefined;
      const range = caps?.zoom;
      const min = range?.min ?? value;
      const max = range?.max ?? value;
      const clamped = Math.min(max, Math.max(min, value));
      // Try advanced first (wider support on some devices), then basic
      await track.applyConstraints({ advanced: [{ zoom: clamped }] });
      setCurrentZoom(clamped);
    } catch {
      try {
        await (videoTrackRef.current as any).applyConstraints({ zoom: value });
        setCurrentZoom(value);
      } catch (e) {
        console.warn('Failed to apply hardware zoom:', e);
      }
    }
  }, [supportedFeatures.zoom]);

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
    setVideoRef,
    capabilities,
    supportedFeatures,
    currentZoom,
    setZoom
  };
};