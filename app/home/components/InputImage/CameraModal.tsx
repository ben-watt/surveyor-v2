import { useCallback, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Camera, RotateCcw, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { useCameraStream } from '@/app/home/hooks/useCameraStream';
import { enhancedImageStore } from '@/app/home/clients/enhancedImageMetadataStore';
import { joinPath, sanitizeFileName } from '@/app/home/utils/path';
import { resizeImage } from '@/app/home/utils/imageResizer';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  path: string;
  onPhotoCaptured?: (filePath: string) => void;
  maxPhotos?: number;
}

interface CapturedPhoto {
  id: string;
  blob: Blob;
  preview: string;
  timestamp: number;
}

export const CameraModal = ({
  isOpen,
  onClose,
  path,
  onPhotoCaptured,
  maxPhotos = 10,
}: CameraModalProps) => {
  const {
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
    // New quality/zoom additions
    capabilities,
    supportedFeatures,
    currentZoom,
    setZoom,
  } = useCameraStream();

  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const cameraStartedRef = useRef(false);
  // Fallback preview zoom scaling when hardware zoom isn't available
  const [previewZoomScale, setPreviewZoomScale] = useState<number>(1);
  // A11y + focus management
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const captureButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const pinchStartDistRef = useRef<number | null>(null);

  // Use shared high-quality resizer
  const resizeForUpload = useCallback((file: File) => resizeImage(file), []);

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen && !stream && !cameraStartedRef.current) {
      cameraStartedRef.current = true;
      startCamera({ facingMode: 'environment' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, stream]); // Intentionally exclude startCamera to prevent restart loops

  // Cleanup when modal closes and manage body overflow
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll when modal closes
      document.body.style.overflow = '';
      stopCamera();
      cameraStartedRef.current = false;
      // Clean up captured photos URLs to prevent memory leaks
      setCapturedPhotos((prev) => {
        prev.forEach((photo) => URL.revokeObjectURL(photo.preview));
        return [];
      });
      setUploadSuccess(false);
    }

    // Cleanup function to restore overflow when component unmounts
    return () => {
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Intentionally exclude stopCamera to prevent restart loops

  // Focus trap, keyboard controls, and focus return to trigger
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;

    const focusableSelectors = [
      'a[href]',
      'area[href]',
      'button:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]',
    ].join(',');

    const getFocusable = (): HTMLElement[] => {
      const root = modalRef.current;
      if (!root) return [];
      const nodes = root.querySelectorAll<HTMLElement>(focusableSelectors);
      return Array.from(nodes).filter((el) => !el.hasAttribute('aria-hidden'));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isUploading) {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const focusables = getFocusable();
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const current = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (!current || current === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (!current || current === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }

      if (e.key === ' ' || e.key === 'Enter') {
        const target = e.target as HTMLElement;
        const tag = target.tagName.toLowerCase();
        const isFormControl =
          target.isContentEditable || ['input', 'select', 'textarea', 'button'].includes(tag);
        if (!isFormControl) {
          e.preventDefault();
          if (!isCapturing && stream && capturedPhotos.length < maxPhotos && !isUploading) {
            captureButtonRef.current?.focus();
            captureButtonRef.current?.click();
          }
        }
      }
    };

    // Initial focus inside dialog
    setTimeout(() => {
      (closeButtonRef.current || captureButtonRef.current || modalRef.current)?.focus();
    }, 0);

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to previously focused element
      if (previouslyFocusedElementRef.current) {
        try {
          previouslyFocusedElementRef.current.focus();
        } catch {}
      }
    };
  }, [isOpen, isUploading, onClose, isCapturing, stream, capturedPhotos.length, maxPhotos]);

  // Handle photo capture
  const handleCapture = useCallback(async () => {
    console.log('🔵 handleCapture called!', {
      isCapturing,
      capturedPhotosLength: capturedPhotos.length,
      maxPhotos,
      stream: !!stream,
      hasPermission,
    });

    if (isCapturing || capturedPhotos.length >= maxPhotos) return;

    setIsCapturing(true);

    // Trigger flash animation
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 200);

    try {
      const photoBlob = await capturePhoto({
        // Always pass preview zoom; it is ignored when not needed
        previewZoomScale: previewZoomScale > 1 ? previewZoomScale : 1,
      });
      if (photoBlob) {
        const photo: CapturedPhoto = {
          id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          blob: photoBlob,
          preview: URL.createObjectURL(photoBlob),
          timestamp: Date.now(),
        };

        setCapturedPhotos((prev) => [...prev, photo]);
      }
    } catch (err) {
      console.error('Error capturing photo:', err);
    } finally {
      setIsCapturing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturePhoto, isCapturing, capturedPhotos.length, stream, hasPermission, previewZoomScale]); // maxPhotos is stable prop

  // Zoom helpers
  const clamp = useCallback((value: number, min: number, max: number) => {
    return Math.min(max, Math.max(min, value));
  }, []);

  const adjustZoom = useCallback(
    async (delta: number) => {
      try {
        if (supportedFeatures?.zoom && capabilities?.zoom) {
          const min = capabilities.zoom.min ?? 1;
          const max = capabilities.zoom.max ?? 3;
          const step = capabilities.zoom.step || 0.1;
          const base = currentZoom ?? min;
          const next = clamp(base + delta * step, min, max);
          await setZoom(next);
        } else {
          const next = clamp(previewZoomScale + delta * 0.1, 1, 3);
          setPreviewZoomScale(next);
        }
      } catch (err) {
        console.error('Zoom adjust error', err);
      }
    },
    [supportedFeatures?.zoom, capabilities?.zoom, currentZoom, setZoom, previewZoomScale, clamp],
  );

  // Remove captured photo
  const removePhoto = useCallback((photoId: string) => {
    setCapturedPhotos((prev) => {
      const photo = prev.find((p) => p.id === photoId);
      if (photo) {
        URL.revokeObjectURL(photo.preview);
      }
      return prev.filter((p) => p.id !== photoId);
    });
  }, []);

  // Upload all captured photos
  const uploadPhotos = useCallback(async () => {
    if (capturedPhotos.length === 0 || isUploading) return;

    setIsUploading(true);
    setUploadSuccess(false);
    setUploadingIndex(0);
    setUploadProgress(0);
    try {
      const total = capturedPhotos.length;
      for (let index = 0; index < total; index++) {
        const photo = capturedPhotos[index];
        // Create file from blob
        const fileName = `camera-${photo.timestamp}.jpg`;
        const originalFile = new File([photo.blob], fileName, {
          type: 'image/jpeg',
          lastModified: photo.timestamp,
        });

        // Resize image using existing pipeline
        const resizedFile = await resizeForUpload(originalFile);
        const filePath = joinPath(path, sanitizeFileName(fileName));

        // Upload using enhanced image store
        await enhancedImageStore.uploadImage(resizedFile, filePath, {
          caption: `Camera photo captured at ${new Date(photo.timestamp).toLocaleString()}`,
          notes: JSON.stringify({
            filename: fileName,
            size: resizedFile.size.toString(),
            type: resizedFile.type,
            captureMethod: 'camera',
            captureTime: new Date(photo.timestamp).toISOString(),
          }),
        });

        // Notify parent component
        onPhotoCaptured?.(filePath);

        // Update progress after each file
        const nextIndex = index + 1;
        setUploadingIndex(nextIndex < total ? nextIndex : null);
        setUploadProgress(Math.round((nextIndex / total) * 100));
      }

      // Clear captured photos and show success
      setCapturedPhotos((prev) => {
        prev.forEach((photo) => URL.revokeObjectURL(photo.preview));
        return [];
      });
      setUploadSuccess(true);
      setUploadingIndex(null);
      setUploadProgress(100);

      // Auto-close if max photos reached, otherwise show success briefly
      if (capturedPhotos.length >= maxPhotos) {
        setTimeout(() => {
          setUploadSuccess(false);
          onClose();
        }, 1500);
      } else {
        setTimeout(() => setUploadSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Error uploading photos:', err);
    } finally {
      setIsUploading(false);
      setUploadingIndex(null);
      setUploadProgress(0);
    }
  }, [capturedPhotos, isUploading, path, resizeForUpload, onPhotoCaptured, onClose, maxPhotos]);

  // Handle camera switch
  const handleCameraSwitch = useCallback(() => {
    const currentIndex = devices.findIndex((d: any) => d.deviceId === activeDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDevice = devices[nextIndex];

    if (nextDevice) {
      switchCamera(nextDevice.deviceId);
    }
  }, [devices, activeDeviceId, switchCamera]);

  if (!isOpen) return null;

  // Debug button state
  const buttonDisabled =
    isCapturing || !stream || capturedPhotos.length >= maxPhotos || isUploading;
  console.log('🔵 Modal render - button state:', {
    buttonDisabled,
    isCapturing,
    hasStream: !!stream,
    capturedPhotosLength: capturedPhotos.length,
    maxPhotos,
    isUploading,
  });

  const modalContent = (
    <>
      <style jsx>{`
        @keyframes flash {
          0% {
            opacity: 0;
          }
          50% {
            opacity: 0.8;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes slideIn {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.8);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="camera-title"
        className="fixed inset-0 overflow-hidden bg-black"
        tabIndex={-1}
        style={{
          zIndex: 9999999,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'auto',
        }}
        onClick={(e) => {
          console.log('🟡 Modal background clicked!', e.target);
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        {/* Header */}
        <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between border-b border-white/10 bg-black/50 p-4 pt-[env(safe-area-inset-top)] text-white backdrop-blur-md">
          <button
            ref={closeButtonRef}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="rounded-full bg-black/50 p-2 transition-colors hover:bg-black/70"
            disabled={isUploading}
          >
            <X size={24} />
          </button>

          <div className="text-center">
            <p id="camera-title" className="text-sm font-medium">
              Camera
            </p>
            <p className="text-xs text-gray-300">
              {capturedPhotos.length}/{maxPhotos} photos
            </p>
          </div>

          {devices.length > 1 && (
            <button
              onClick={handleCameraSwitch}
              className="rounded-full bg-black/50 p-2 transition-colors hover:bg-black/70"
              disabled={isLoading || isUploading}
            >
              <RotateCcw size={24} />
            </button>
          )}
        </div>

        {/* Camera View */}
        <div
          className="relative flex h-full w-full items-center justify-center"
          onWheel={(e) => {
            e.preventDefault();
            const direction = e.deltaY > 0 ? -1 : 1;
            adjustZoom(direction);
          }}
          onTouchStart={(e) => {
            if (e.touches.length === 2) {
              const [t1, t2] = [e.touches[0], e.touches[1]];
              const dx = t2.clientX - t1.clientX;
              const dy = t2.clientY - t1.clientY;
              pinchStartDistRef.current = Math.hypot(dx, dy);
            }
          }}
          onTouchMove={(e) => {
            if (e.touches.length === 2 && pinchStartDistRef.current != null) {
              e.preventDefault();
              const [t1, t2] = [e.touches[0], e.touches[1]];
              const dx = t2.clientX - t1.clientX;
              const dy = t2.clientY - t1.clientY;
              const dist = Math.hypot(dx, dy);
              const diff = dist - pinchStartDistRef.current;
              if (Math.abs(diff) > 4) {
                adjustZoom(diff > 0 ? 0.5 : -0.5);
                pinchStartDistRef.current = dist;
              }
            }
          }}
          onTouchEnd={() => {
            pinchStartDistRef.current = null;
          }}
          style={{ touchAction: 'none' }}
        >
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70">
              <div className="text-center text-white">
                <Loader2 className="mx-auto mb-2 animate-spin" size={32} />
                <p>Starting camera...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70">
              <div className="max-w-sm p-6 text-center text-white">
                <AlertCircle className="mx-auto mb-4 text-red-400" size={48} />
                <h3 className="mb-2 text-lg font-medium">Camera Error</h3>
                <p className="mb-4 text-sm text-gray-300">{error}</p>
                <button
                  onClick={() => startCamera()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {stream && (
            <>
              <video
                ref={setVideoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
                style={{
                  width: '100vw',
                  height: '100vh',
                  objectFit: 'cover',
                  // Apply CSS zoom scaling when hardware zoom is unavailable
                  transform:
                    !supportedFeatures?.zoom && previewZoomScale > 1
                      ? `scale(${previewZoomScale})`
                      : undefined,
                  transformOrigin:
                    !supportedFeatures?.zoom && previewZoomScale > 1 ? 'center center' : undefined,
                }}
                onLoadedMetadata={(e) => {
                  const video = e.target as HTMLVideoElement;
                  if (video.paused) {
                    video.play().catch(console.error);
                  }
                }}
                onCanPlay={(e) => {
                  const video = e.target as HTMLVideoElement;
                  if (video.paused) {
                    video.play().catch(console.error);
                  }
                }}
              />

              {/* Viewfinder Overlay */}
              <div className="pointer-events-none absolute inset-0">
                {/* Rule of thirds grid */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                  {[...Array(9)].map((_, i) => (
                    <div
                      key={i}
                      className="border border-white/20"
                      style={{
                        borderWidth:
                          i % 3 === 2 ? '0 0 1px 0' : i > 5 ? '0 1px 0 0' : '0 1px 1px 0',
                      }}
                    />
                  ))}
                </div>

                {/* Center focus indicator */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform">
                  <div className="h-8 w-8 rounded-full border-2 border-white/60">
                    <div className="h-full w-full animate-ping rounded-full border-2 border-white/30" />
                  </div>
                </div>

                {/* Corner frame indicators */}
                <div className="absolute left-4 top-4 h-6 w-6 border-l-2 border-t-2 border-white/70" />
                <div className="absolute right-4 top-4 h-6 w-6 border-r-2 border-t-2 border-white/70" />
                <div className="absolute bottom-4 left-4 h-6 w-6 border-b-2 border-l-2 border-white/70" />
                <div className="absolute bottom-4 right-4 h-6 w-6 border-b-2 border-r-2 border-white/70" />
              </div>

              {/* Camera Flash Effect */}
              {showFlash && (
                <div
                  className="pointer-events-none absolute inset-0 animate-pulse bg-white"
                  style={{
                    animation: 'flash 0.2s ease-out',
                  }}
                />
              )}
            </>
          )}
        </div>

        {/* Photo Thumbnails */}
        {capturedPhotos.length > 0 && (
          <div className="absolute bottom-32 left-0 right-0 z-10">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-black/60 to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-black/60 to-transparent" />
              <div className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 py-3">
                {capturedPhotos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="group relative flex-shrink-0 snap-center"
                    style={{
                      animation: `slideIn 0.3s ease-out ${index * 0.1}s both`,
                    }}
                  >
                    <div className="relative overflow-hidden rounded-xl bg-white/10 p-1 shadow-lg backdrop-blur-sm transition-all duration-300 hover:bg-white/15 group-hover:scale-105">
                      <img
                        src={photo.preview}
                        alt={`Captured ${photo.id}`}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                      <div className="absolute inset-1 rounded-lg bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                    </div>

                    <button
                      onClick={() => removePhoto(photo.id)}
                      className="absolute -right-1 -top-1 z-20 flex h-7 w-7 transform items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-red-600 text-xs text-white shadow-lg transition-all duration-200 hover:scale-110 hover:from-red-600 hover:to-red-700 active:scale-95"
                    >
                      <X size={14} className="drop-shadow-sm" />
                    </button>

                    <div className="absolute -bottom-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white shadow-md">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div
          className="absolute bottom-0 left-0 right-0 z-10 rounded-t-2xl border-t border-white/10 bg-black/50 p-6 backdrop-blur-md"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
        >
          <div className="mx-auto flex max-w-screen-lg items-center justify-between gap-4">
            {/* Upload CTA / Success (left) */}
            <div className="min-w-[180px]">
              {uploadSuccess ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2 font-medium text-white shadow-lg"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                    <CheckCircle size={16} className="text-white" />
                  </div>
                  <span className="truncate">Uploaded</span>
                </div>
              ) : capturedPhotos.length > 0 ? (
                <button
                  onClick={uploadPhotos}
                  disabled={isUploading}
                  className="group relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 font-medium text-white shadow-lg transition-all duration-300 hover:from-blue-700 hover:to-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Upload photos"
                >
                  <div className="relative flex items-center justify-center gap-2">
                    {isUploading ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        <span>Uploading {uploadProgress}%</span>
                      </>
                    ) : (
                      <>
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                          <div className="h-2 w-2 rounded-full bg-white" />
                        </div>
                        <span>
                          Upload {capturedPhotos.length} Photo{capturedPhotos.length > 1 ? 's' : ''}
                        </span>
                      </>
                    )}
                  </div>
                  {isUploading && (
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
                      <div className="h-full bg-white/80" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}
                </button>
              ) : null}
            </div>

            {/* Capture Button (center) */}
            <button
              ref={captureButtonRef}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCapture();
              }}
              disabled={isCapturing || !stream || capturedPhotos.length >= maxPhotos || isUploading}
              className="flex h-16 w-16 transform items-center justify-center rounded-full bg-white transition-all duration-200 hover:scale-105 hover:bg-gray-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Capture photo"
            >
              {isCapturing ? (
                <Loader2 className="animate-spin" size={32} />
              ) : (
                <Camera size={32} className="text-black" />
              )}
            </button>

            {/* Zoom Control (right) */}
            <div className="flex min-w-[180px] items-center justify-end gap-3 text-white">
              <span className="text-xs opacity-80" aria-hidden="true">
                Zoom
              </span>
              <input
                id="camera-zoom"
                type="range"
                aria-label="Camera zoom"
                min={
                  (supportedFeatures?.zoom && capabilities?.zoom
                    ? capabilities.zoom.min
                    : undefined) ?? 1
                }
                max={
                  (supportedFeatures?.zoom && capabilities?.zoom
                    ? capabilities.zoom.max
                    : undefined) ?? 3
                }
                step={
                  (supportedFeatures?.zoom && capabilities?.zoom
                    ? capabilities.zoom.step || 0.1
                    : undefined) ?? 0.1
                }
                value={
                  supportedFeatures?.zoom && currentZoom != null ? currentZoom : previewZoomScale
                }
                onChange={async (e) => {
                  const value = parseFloat(e.target.value);
                  if (supportedFeatures?.zoom && capabilities?.zoom) {
                    await setZoom(value);
                  } else {
                    setPreviewZoomScale(value);
                  }
                }}
                className="w-40 accent-blue-500"
              />
              <span className="w-10 text-right text-xs tabular-nums" aria-live="polite">
                {supportedFeatures?.zoom && currentZoom != null
                  ? `${(currentZoom / (capabilities?.zoom?.min || 1)).toFixed(1)}x`
                  : `${previewZoomScale.toFixed(1)}x`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // Use portal to render at document root for true full-screen
  return createPortal(modalContent, document.body);
};
