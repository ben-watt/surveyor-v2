import { useCallback, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Camera, RotateCcw, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { useCameraStream } from '@/app/home/hooks/useCameraStream';
import { enhancedImageStore } from '@/app/home/clients/enhancedImageMetadataStore';
import { join } from 'path';
import Resizer from 'react-image-file-resizer';

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
  maxPhotos = 10 
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
    setZoom
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

  // Resize image using existing pipeline
  const resizeImage = useCallback((file: File): Promise<File> => {
    return new Promise((resolve) => {
      Resizer.imageFileResizer(
        file,
        500, // maxWidth
        400, // maxHeight (for 3:2 aspect ratio)
        'JPEG', // output format
        100, // quality
        0, // rotation
        (uri) => {
          // Convert the base64 URI to a File object
          fetch(uri as string)
            .then((res) => res.blob())
            .then((blob) => {
              const resizedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(resizedFile);
            });
        },
        'base64',
      );
    });
  }, []);

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
      setCapturedPhotos(prev => {
        prev.forEach(photo => URL.revokeObjectURL(photo.preview));
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
      '[role="button"]'
    ].join(',');

    const getFocusable = (): HTMLElement[] => {
      const root = modalRef.current;
      if (!root) return [];
      const nodes = root.querySelectorAll<HTMLElement>(focusableSelectors);
      return Array.from(nodes).filter(el => !el.hasAttribute('aria-hidden'));
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
        const isFormControl = target.isContentEditable || ['input', 'select', 'textarea', 'button'].includes(tag);
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
        try { previouslyFocusedElementRef.current.focus(); } catch {}
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
      hasPermission 
    });
    
    if (isCapturing || capturedPhotos.length >= maxPhotos) return;

    setIsCapturing(true);
    
    // Trigger flash animation
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 200);
    
    try {
      const photoBlob = await capturePhoto({
        // Always pass preview zoom; it is ignored when not needed
        previewZoomScale: previewZoomScale > 1 ? previewZoomScale : 1
      });
      if (photoBlob) {
        const photo: CapturedPhoto = {
          id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          blob: photoBlob,
          preview: URL.createObjectURL(photoBlob),
          timestamp: Date.now()
        };

        setCapturedPhotos(prev => [...prev, photo]);
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

  const adjustZoom = useCallback(async (delta: number) => {
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
  }, [supportedFeatures?.zoom, capabilities?.zoom, currentZoom, setZoom, previewZoomScale, clamp]);

  // Remove captured photo
  const removePhoto = useCallback((photoId: string) => {
    setCapturedPhotos(prev => {
      const photo = prev.find(p => p.id === photoId);
      if (photo) {
        URL.revokeObjectURL(photo.preview);
      }
      return prev.filter(p => p.id !== photoId);
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
          lastModified: photo.timestamp 
        });

        // Resize image using existing pipeline
        const resizedFile = await resizeImage(originalFile);
        const filePath = join(path, fileName);

        // Upload using enhanced image store
        await enhancedImageStore.uploadImage(
          resizedFile,
          filePath,
          {
            caption: `Camera photo captured at ${new Date(photo.timestamp).toLocaleString()}`,
            notes: JSON.stringify({
              filename: fileName,
              size: resizedFile.size.toString(),
              type: resizedFile.type,
              captureMethod: 'camera',
              captureTime: new Date(photo.timestamp).toISOString(),
            }),
          }
        );

        // Notify parent component
        onPhotoCaptured?.(filePath);

        // Update progress after each file
        const nextIndex = index + 1;
        setUploadingIndex(nextIndex < total ? nextIndex : null);
        setUploadProgress(Math.round((nextIndex / total) * 100));
      }

      // Clear captured photos and show success
      setCapturedPhotos(prev => {
        prev.forEach(photo => URL.revokeObjectURL(photo.preview));
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
  }, [capturedPhotos, isUploading, path, resizeImage, onPhotoCaptured, onClose, maxPhotos]);

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
  const buttonDisabled = isCapturing || !stream || capturedPhotos.length >= maxPhotos || isUploading;
  console.log('🔵 Modal render - button state:', { 
    buttonDisabled,
    isCapturing, 
    hasStream: !!stream, 
    capturedPhotosLength: capturedPhotos.length, 
    maxPhotos, 
    isUploading 
  });

  const modalContent = (
    <>
      <style jsx>{`
        @keyframes flash {
          0% { opacity: 0; }
          50% { opacity: 0.8; }
          100% { opacity: 0; }
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
        className="fixed inset-0 bg-black overflow-hidden"
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
          pointerEvents: 'auto'
        }}
        onClick={(e) => {
          console.log('🟡 Modal background clicked!', e.target);
          e.stopPropagation();
          e.preventDefault();
        }}
      >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-black/50 backdrop-blur-md text-white border-b border-white/10 pt-[env(safe-area-inset-top)]">
        <button
          ref={closeButtonRef}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          className="p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
          disabled={isUploading}
        >
          <X size={24} />
        </button>
        
        <div className="text-center">
          <p id="camera-title" className="text-sm font-medium">Camera</p>
          <p className="text-xs text-gray-300">
            {capturedPhotos.length}/{maxPhotos} photos
          </p>
        </div>

        {devices.length > 1 && (
          <button
            onClick={handleCameraSwitch}
            className="p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            disabled={isLoading || isUploading}
          >
            <RotateCcw size={24} />
          </button>
        )}
      </div>

      {/* Camera View */}
      <div
        className="relative w-full h-full flex items-center justify-center"
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
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
            <div className="text-center text-white">
              <Loader2 className="animate-spin mx-auto mb-2" size={32} />
              <p>Starting camera...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
            <div className="text-center text-white p-6 max-w-sm">
              <AlertCircle className="mx-auto mb-4 text-red-400" size={48} />
              <h3 className="text-lg font-medium mb-2">Camera Error</h3>
              <p className="text-sm text-gray-300 mb-4">{error}</p>
              <button
                onClick={() => startCamera()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
              className="w-full h-full object-cover"
              style={{ 
                width: '100vw', 
                height: '100vh',
                objectFit: 'cover',
                // Apply CSS zoom scaling when hardware zoom is unavailable
                transform: !(supportedFeatures?.zoom) && previewZoomScale > 1 ? `scale(${previewZoomScale})` : undefined,
                transformOrigin: !(supportedFeatures?.zoom) && previewZoomScale > 1 ? 'center center' : undefined
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
            <div className="absolute inset-0 pointer-events-none">
              {/* Rule of thirds grid */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                {[...Array(9)].map((_, i) => (
                  <div 
                    key={i} 
                    className="border border-white/20" 
                    style={{
                      borderWidth: i % 3 === 2 ? '0 0 1px 0' : i > 5 ? '0 1px 0 0' : '0 1px 1px 0'
                    }}
                  />
                ))}
              </div>
              
              {/* Center focus indicator */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-8 h-8 border-2 border-white/60 rounded-full">
                  <div className="w-full h-full border-2 border-white/30 rounded-full animate-ping" />
                </div>
              </div>
              
              {/* Corner frame indicators */}
              <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-white/70" />
              <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-white/70" />
              <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-white/70" />
              <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-white/70" />
            </div>
            
            {/* Camera Flash Effect */}
            {showFlash && (
              <div className="absolute inset-0 bg-white animate-pulse pointer-events-none" 
                style={{
                  animation: 'flash 0.2s ease-out'
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
            <div className="flex gap-3 px-6 py-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
              {capturedPhotos.map((photo, index) => (
                <div 
                  key={photo.id} 
                  className="relative flex-shrink-0 group snap-center"
                  style={{
                    animation: `slideIn 0.3s ease-out ${index * 0.1}s both`
                  }}
                >
                  <div className="relative overflow-hidden rounded-xl shadow-lg backdrop-blur-sm bg-white/10 p-1 hover:bg-white/15 transition-all duration-300 group-hover:scale-105">
                    <img
                      src={photo.preview}
                      alt={`Captured ${photo.id}`}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="absolute inset-1 bg-gradient-to-t from-black/30 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </div>
                  
                  <button
                    onClick={() => removePhoto(photo.id)}
                    className="absolute -top-1 -right-1 w-7 h-7 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full flex items-center justify-center text-xs hover:from-red-600 hover:to-red-700 transition-all duration-200 transform hover:scale-110 active:scale-95 shadow-lg z-20"
                  >
                    <X size={14} className="drop-shadow-sm" />
                  </button>
                  
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-6 bg-black/50 backdrop-blur-md rounded-t-2xl border-t border-white/10"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
      >
        <div className="max-w-screen-lg mx-auto flex items-center justify-between gap-4">
          {/* Upload CTA / Success (left) */}
          <div className="min-w-[180px]">
            {uploadSuccess ? (
              <div role="status" aria-live="polite" className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium shadow-lg">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <CheckCircle size={16} className="text-white" />
                </div>
                <span className="truncate">Uploaded</span>
              </div>
            ) : capturedPhotos.length > 0 ? (
              <button
                onClick={uploadPhotos}
                disabled={isUploading}
                className="group relative overflow-hidden px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg w-full"
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
                      <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                      <span>
                        Upload {capturedPhotos.length} Photo{capturedPhotos.length > 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </div>
                {isUploading && (
                  <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
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
            className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
            aria-label="Capture photo"
          >
            {isCapturing ? (
              <Loader2 className="animate-spin" size={32} />
            ) : (
              <Camera size={32} className="text-black" />
            )}
          </button>

          {/* Zoom Control (right) */}
          <div className="flex items-center justify-end gap-3 text-white min-w-[180px]">
            <span className="text-xs opacity-80" aria-hidden="true">Zoom</span>
            <input
              id="camera-zoom"
              type="range"
              aria-label="Camera zoom"
              min={(supportedFeatures?.zoom && capabilities?.zoom ? capabilities.zoom.min : undefined) ?? 1}
              max={(supportedFeatures?.zoom && capabilities?.zoom ? capabilities.zoom.max : undefined) ?? 3}
              step={(supportedFeatures?.zoom && capabilities?.zoom ? (capabilities.zoom.step || 0.1) : undefined) ?? 0.1}
              value={(supportedFeatures?.zoom && currentZoom != null) ? currentZoom : previewZoomScale}
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
            <span className="text-xs tabular-nums w-10 text-right" aria-live="polite">
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