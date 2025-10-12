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
  maxPhotos = 10,
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
    checkPermissions,
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
          lastModified: photo.timestamp,
        });

        // Resize image using existing pipeline
        const resizedFile = await resizeForUpload(originalFile);
        const filePath = join(path, fileName);

        // Upload using enhanced image store
        await enhancedImageStore.uploadImage(resizedFile, filePath, {
          caption: `Native camera photo captured at ${new Date(photo.timestamp).toLocaleString()}`,
          notes: JSON.stringify({
            filename: fileName,
            size: resizedFile.size.toString(),
            type: resizedFile.type,
            captureMethod: 'native-camera',
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
  }, [
    photos,
    isUploading,
    path,
    resizeForUpload,
    onPhotoCaptured,
    onClose,
    maxPhotos,
    clearPhotos,
  ]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999999] overflow-hidden bg-black"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'auto',
      }}
    >
      {/* Header */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between border-b border-white/10 bg-black/50 p-4 text-white backdrop-blur-md">
        <button
          onClick={onClose}
          className="rounded-full bg-black/50 p-2 transition-colors hover:bg-black/70"
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
      <div className="relative flex h-full w-full items-center justify-center">
        {cameraError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70">
            <div className="max-w-sm p-6 text-center text-white">
              <AlertCircle className="mx-auto mb-4 text-red-400" size={48} />
              <h3 className="mb-2 text-lg font-medium">Camera Error</h3>
              <p className="mb-4 text-sm text-gray-300">{cameraError}</p>
              <button
                onClick={() => requestPermissions()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                Grant Permission
              </button>
            </div>
          </div>
        )}

        {!canUseNative && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70">
            <div className="max-w-sm p-6 text-center text-white">
              <AlertCircle className="mx-auto mb-4 text-yellow-400" size={48} />
              <h3 className="mb-2 text-lg font-medium">Native Camera Unavailable</h3>
              <p className="mb-4 text-sm text-gray-300">
                Native camera is not available on this platform. Please use the web camera instead.
              </p>
            </div>
          </div>
        )}

        {hasPermission === false && !cameraError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70">
            <div className="max-w-sm p-6 text-center text-white">
              <Camera className="mx-auto mb-4 text-blue-400" size={48} />
              <h3 className="mb-2 text-lg font-medium">Camera Permission Required</h3>
              <p className="mb-4 text-sm text-gray-300">
                This app needs camera permission to take photos.
              </p>
              <button
                onClick={requestPermissions}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                Grant Permission
              </button>
            </div>
          </div>
        )}

        {/* Success message overlay */}
        {canUseNative && hasPermission && !cameraError && (
          <div className="p-8 text-center text-white">
            <div className="mx-auto max-w-sm">
              <Camera className="mx-auto mb-6 text-white" size={64} />
              <h3 className="mb-4 text-xl font-medium">Ready to Capture</h3>
              <p className="mb-8 text-sm text-gray-300">
                Use the camera button below to take photos or select from your gallery.
              </p>

              {photos.length > 0 && (
                <div className="mb-6">
                  <p className="mb-4 text-sm text-gray-300">Recently captured:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {photos.slice(-5).map((photo) => (
                      <div key={photo.id} className="relative">
                        <img
                          src={photo.uri}
                          alt="Captured"
                          className="h-16 w-16 rounded-lg border border-white/20 object-cover"
                        />
                        <button
                          onClick={() => removePhoto(photo.id)}
                          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white"
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
      <div className="absolute bottom-0 left-0 right-0 z-10 rounded-t-2xl border-t border-white/10 bg-black/50 p-6 backdrop-blur-md">
        <div className="mx-auto max-w-screen-lg">
          {/* Upload Section */}
          {photos.length > 0 && (
            <div className="mb-4">
              {uploadSuccess ? (
                <div className="flex items-center justify-center gap-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2 font-medium text-white shadow-lg">
                  <CheckCircle size={16} />
                  <span>Upload Complete</span>
                </div>
              ) : (
                <button
                  onClick={uploadPhotos}
                  disabled={isUploading}
                  className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 font-medium text-white shadow-lg transition-all duration-300 hover:from-blue-700 hover:to-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex items-center justify-center gap-2">
                    {isUploading ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        <span>Uploading {uploadProgress}%</span>
                      </>
                    ) : (
                      <span>
                        Upload {photos.length} Photo{photos.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {isUploading && (
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
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
              className="flex h-16 w-16 transform items-center justify-center rounded-full bg-gray-600 transition-all duration-200 hover:scale-105 hover:bg-gray-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ImageIcon size={24} className="text-white" />
            </button>

            {/* Capture Button */}
            <button
              onClick={handleNativeCapture}
              disabled={
                !canUseNative ||
                hasPermission === false ||
                isCapturing ||
                photos.length >= maxPhotos ||
                isUploading
              }
              className="flex h-20 w-20 transform items-center justify-center rounded-full bg-white transition-all duration-200 hover:scale-105 hover:bg-gray-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
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
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400">
              {photos.length >= maxPhotos
                ? `Maximum ${maxPhotos} photos reached`
                : `${maxPhotos - photos.length} more photo${maxPhotos - photos.length !== 1 ? 's' : ''} allowed`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Use portal to render at document root for true full-screen
  return createPortal(modalContent, document.body);
};
