import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Camera, Image as ImageIcon, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { useNativeCamera } from '@/app/home/hooks/useNativeCamera';
import { enhancedImageStore } from '@/app/home/clients/enhancedImageMetadataStore';
import { join } from 'path';
import { resizeImage } from '@/app/home/utils/imageResizer';

interface NativeCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  path: string;
  onPhotoCaptured?: (filePath: string) => void;
  maxPhotos?: number;
}

export const NativeCameraModal = ({ 
  isOpen, 
  onClose, 
  path, 
  onPhotoCaptured,
  maxPhotos = 10 
}: NativeCameraModalProps) => {
  const {
    photos,
    isCapturing,
    hasPermission,
    error: cameraError,
    canUseNative,
    capturePhoto,
    pickFromGallery,
    removePhoto,
    clearPhotos,
    requestPermissions,
    checkPermissions
  } = useNativeCamera({ maxPhotos, path });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  // Initialize permissions when modal opens
  useEffect(() => {
    if (isOpen && canUseNative) {
      checkPermissions();
    }
  }, [isOpen, canUseNative, checkPermissions]);

  // Cleanup when modal closes
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      clearPhotos();
      setUploadSuccess(false);
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, clearPhotos]);

  // Use shared high-quality resizer
  const resizeForUpload = useCallback((file: File) => resizeImage(file), []);

  // Handle native camera capture
  const handleNativeCapture = useCallback(async () => {
    if (!canUseNative) return;

    // Request permissions if not granted
    if (hasPermission === false) {
      const granted = await requestPermissions();
      if (!granted) return;
    }

    await capturePhoto();
  }, [canUseNative, hasPermission, requestPermissions, capturePhoto]);

  // Handle gallery picker
  const handleGalleryPick = useCallback(async () => {
    if (!canUseNative) return;

    const remaining = maxPhotos - photos.length;
    await pickFromGallery(Math.min(5, remaining));
  }, [canUseNative, maxPhotos, photos.length, pickFromGallery]);

  // Upload all captured photos
  const uploadPhotos = useCallback(async () => {
    if (photos.length === 0 || isUploading) return;

    setIsUploading(true);
    setUploadSuccess(false);
    setUploadingIndex(0);
    setUploadProgress(0);

    try {
      const total = photos.length;
      for (let index = 0; index < total; index++) {
        const photo = photos[index];
        
        // Create file from blob
        const fileName = `native-camera-${photo.timestamp}.jpg`;
        const originalFile = new File([photo.blob], fileName, { 
          type: 'image/jpeg',
          lastModified: photo.timestamp 
        });

        // Resize image using existing pipeline
        const resizedFile = await resizeForUpload(originalFile);
        const filePath = join(path, fileName);

        // Upload using enhanced image store
        await enhancedImageStore.uploadImage(
          resizedFile,
          filePath,
          {
            caption: `Native camera photo captured at ${new Date(photo.timestamp).toLocaleString()}`,
            notes: JSON.stringify({
              filename: fileName,
              size: resizedFile.size.toString(),
              type: resizedFile.type,
              captureMethod: 'native-camera',
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
      clearPhotos();
      setUploadSuccess(true);
      setUploadingIndex(null);
      setUploadProgress(100);
      
      // Auto-close if max photos reached, otherwise show success briefly
      if (photos.length >= maxPhotos) {
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
  }, [photos, isUploading, path, resizeForUpload, onPhotoCaptured, onClose, maxPhotos, clearPhotos]);

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black overflow-hidden z-[9999999]"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'auto'
      }}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-black/50 backdrop-blur-md text-white border-b border-white/10">
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
          disabled={isUploading}
        >
          <X size={24} />
        </button>
        
        <div className="text-center">
          <p className="text-sm font-medium">Native Camera</p>
          <p className="text-xs text-gray-300">
            {photos.length}/{maxPhotos} photos
          </p>
        </div>

        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Main Content */}
      <div className="relative w-full h-full flex items-center justify-center">
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
            <div className="text-center text-white p-6 max-w-sm">
              <AlertCircle className="mx-auto mb-4 text-red-400" size={48} />
              <h3 className="text-lg font-medium mb-2">Camera Error</h3>
              <p className="text-sm text-gray-300 mb-4">{cameraError}</p>
              <button
                onClick={() => requestPermissions()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Grant Permission
              </button>
            </div>
          </div>
        )}

        {!canUseNative && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
            <div className="text-center text-white p-6 max-w-sm">
              <AlertCircle className="mx-auto mb-4 text-yellow-400" size={48} />
              <h3 className="text-lg font-medium mb-2">Native Camera Unavailable</h3>
              <p className="text-sm text-gray-300 mb-4">
                Native camera is not available on this platform. Please use the web camera instead.
              </p>
            </div>
          </div>
        )}

        {hasPermission === false && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
            <div className="text-center text-white p-6 max-w-sm">
              <Camera className="mx-auto mb-4 text-blue-400" size={48} />
              <h3 className="text-lg font-medium mb-2">Camera Permission Required</h3>
              <p className="text-sm text-gray-300 mb-4">
                This app needs camera permission to take photos.
              </p>
              <button
                onClick={requestPermissions}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Grant Permission
              </button>
            </div>
          </div>
        )}

        {/* Success message overlay */}
        {canUseNative && hasPermission && !cameraError && (
          <div className="text-center text-white p-8">
            <div className="max-w-sm mx-auto">
              <Camera className="mx-auto mb-6 text-white" size={64} />
              <h3 className="text-xl font-medium mb-4">Ready to Capture</h3>
              <p className="text-sm text-gray-300 mb-8">
                Use the camera button below to take photos or select from your gallery.
              </p>
              
              {photos.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm text-gray-300 mb-4">Recently captured:</p>
                  <div className="flex gap-2 justify-center flex-wrap">
                    {photos.slice(-5).map((photo) => (
                      <div key={photo.id} className="relative">
                        <img
                          src={photo.uri}
                          alt="Captured"
                          className="w-16 h-16 object-cover rounded-lg border border-white/20"
                        />
                        <button
                          onClick={() => removePhoto(photo.id)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-6 bg-black/50 backdrop-blur-md rounded-t-2xl border-t border-white/10">
        <div className="max-w-screen-lg mx-auto">
          {/* Upload Section */}
          {photos.length > 0 && (
            <div className="mb-4">
              {uploadSuccess ? (
                <div className="flex items-center justify-center gap-3 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium shadow-lg">
                  <CheckCircle size={16} />
                  <span>Upload Complete</span>
                </div>
              ) : (
                <button
                  onClick={uploadPhotos}
                  disabled={isUploading}
                  className="w-full px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg"
                >
                  <div className="flex items-center justify-center gap-2">
                    {isUploading ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        <span>Uploading {uploadProgress}%</span>
                      </>
                    ) : (
                      <span>Upload {photos.length} Photo{photos.length > 1 ? 's' : ''}</span>
                    )}
                  </div>
                  {isUploading && (
                    <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-white/80" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Camera Controls */}
          <div className="flex items-center justify-center gap-6">
            {/* Gallery Button */}
            <button
              onClick={handleGalleryPick}
              disabled={!canUseNative || hasPermission === false || photos.length >= maxPhotos}
              className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center hover:bg-gray-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
            >
              <ImageIcon size={24} className="text-white" />
            </button>

            {/* Capture Button */}
            <button
              onClick={handleNativeCapture}
              disabled={!canUseNative || hasPermission === false || isCapturing || photos.length >= maxPhotos || isUploading}
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
            >
              {isCapturing ? (
                <Loader2 className="animate-spin text-black" size={32} />
              ) : (
                <Camera size={32} className="text-black" />
              )}
            </button>

            {/* Spacer for balance */}
            <div className="w-16" />
          </div>

          {/* Status Text */}
          <div className="text-center mt-4">
            <p className="text-xs text-gray-400">
              {photos.length >= maxPhotos 
                ? `Maximum ${maxPhotos} photos reached`
                : `${maxPhotos - photos.length} more photo${maxPhotos - photos.length !== 1 ? 's' : ''} allowed`
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Use portal to render at document root for true full-screen
  return createPortal(modalContent, document.body);
};