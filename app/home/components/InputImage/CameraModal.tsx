import { useCallback, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Camera, RotateCcw, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { useCameraStream } from '@/app/home/hooks/useCameraStream';
import { imageUploadStore } from '@/app/home/clients/ImageUploadStore';
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
    setVideoRef
  } = useCameraStream();

  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const cameraStartedRef = useRef(false);

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
    try {
      const photoBlob = await capturePhoto();
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
  }, [capturePhoto, isCapturing, capturedPhotos.length, stream, hasPermission]); // maxPhotos is stable prop

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
    try {
      for (const photo of capturedPhotos) {
        // Create file from blob
        const fileName = `camera-${photo.timestamp}.jpg`;
        const originalFile = new File([photo.blob], fileName, { 
          type: 'image/jpeg',
          lastModified: photo.timestamp 
        });

        // Resize image using existing pipeline
        const resizedFile = await resizeImage(originalFile);
        const filePath = join(path, fileName);

        // Upload using existing image upload store
        await imageUploadStore.create({
          id: filePath,
          path: filePath,
          file: resizedFile,
          href: URL.createObjectURL(resizedFile),
          metadata: {
            filename: fileName,
            size: resizedFile.size.toString(),
            type: resizedFile.type,
            captureMethod: 'camera',
            captureTime: new Date(photo.timestamp).toISOString(),
          },
        });

        // Notify parent component
        onPhotoCaptured?.(filePath);
      }

      // Clear captured photos and show success
      setCapturedPhotos(prev => {
        prev.forEach(photo => URL.revokeObjectURL(photo.preview));
        return [];
      });
      setUploadSuccess(true);
      
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
    <div 
      className="fixed inset-0 bg-black overflow-hidden"
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
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-black/50 text-white">
        <button
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
          <p className="text-sm font-medium">Camera</p>
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
      <div className="relative w-full h-full flex items-center justify-center">
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
          <video
            ref={setVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ 
              width: '100vw', 
              height: '100vh',
              objectFit: 'cover'
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
        )}
      </div>

      {/* Photo Thumbnails */}
      {capturedPhotos.length > 0 && (
        <div className="absolute bottom-20 left-0 right-0 z-10">
          <div className="flex gap-2 px-4 overflow-x-auto scrollbar-hide">
            {capturedPhotos.map((photo) => (
              <div key={photo.id} className="relative flex-shrink-0">
                <img
                  src={photo.preview}
                  alt={`Captured ${photo.id}`}
                  className="w-16 h-16 object-cover rounded-lg border-2 border-white/50"
                />
                <button
                  onClick={() => removePhoto(photo.id)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-6 bg-black/50">
        <div className="flex items-center justify-center gap-6">
          {/* Capture Button */}
          <button
            onClick={(e) => {
              console.log('🟡 BUTTON CLICKED!');
              e.preventDefault();
              e.stopPropagation();
              handleCapture();
            }}
            disabled={isCapturing || !stream || capturedPhotos.length >= maxPhotos || isUploading}
            className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCapturing ? (
              <Loader2 className="animate-spin" size={32} />
            ) : (
              <Camera size={32} className="text-black" />
            )}
          </button>

          {/* Upload Button or Success Message */}
          {uploadSuccess ? (
            <div className="flex items-center gap-2 px-6 py-3 bg-green-100 text-green-800 rounded-lg font-medium">
              <CheckCircle size={20} />
              Photos uploaded successfully!
            </div>
          ) : capturedPhotos.length > 0 ? (
            <button
              onClick={uploadPhotos}
              disabled={isUploading}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isUploading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} />
                  Uploading...
                </div>
              ) : (
                `Upload ${capturedPhotos.length} Photo${capturedPhotos.length > 1 ? 's' : ''}`
              )}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );

  // Use portal to render at document root for true full-screen
  return createPortal(modalContent, document.body);
};