import { useState, useCallback } from 'react';
import { capturePhoto, pickFromGallery, CapturePhotoOptions } from '@/app/utils/capacitor/camera';
import {
  requestCameraPermissions,
  checkCameraPermissions,
} from '@/app/utils/capacitor/permissions';
import { canUseNativeCamera } from '@/app/utils/capacitor/platform';

interface NativeCameraOptions {
  quality?: number;
  maxPhotos: number;
  path: string;
}

interface CapturedPhoto {
  id: string;
  blob: Blob;
  uri: string;
  timestamp: number;
  format?: string;
}

export const useNativeCamera = ({ quality = 90, maxPhotos, path }: NativeCameraOptions) => {
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkPermissions = useCallback(async () => {
    try {
      const hasPermissions = await checkCameraPermissions();
      setHasPermission(hasPermissions);
      return hasPermissions;
    } catch (err) {
      console.error('Permission check failed:', err);
      setHasPermission(false);
      return false;
    }
  }, []);

  const requestPermissions = useCallback(async () => {
    try {
      const granted = await requestCameraPermissions();
      setHasPermission(granted);
      if (!granted) {
        setError('Camera permission denied');
      }
      return granted;
    } catch (err) {
      console.error('Permission request failed:', err);
      setHasPermission(false);
      setError('Failed to request camera permissions');
      return false;
    }
  }, []);

  const captureNativePhoto = useCallback(
    async (options: CapturePhotoOptions = {}) => {
      if (!canUseNativeCamera()) {
        setError('Native camera not available on this platform');
        return null;
      }

      if (photos.length >= maxPhotos) {
        setError(`Maximum of ${maxPhotos} photos allowed`);
        return null;
      }

      setIsCapturing(true);
      setError(null);

      try {
        // Check permissions first
        const hasPerms = hasPermission ?? (await checkPermissions());
        if (!hasPerms) {
          const granted = await requestPermissions();
          if (!granted) {
            throw new Error('Camera permission required');
          }
        }

        const result = await capturePhoto({
          quality,
          ...options,
        });

        const photo: CapturedPhoto = {
          id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          blob: result.blob,
          uri: result.uri,
          timestamp: Date.now(),
          format: result.format,
        };

        setPhotos((prev) => [...prev, photo]);
        return photo;
      } catch (err) {
        console.error('Native camera capture error:', err);
        setError(err instanceof Error ? err.message : 'Camera capture failed');
        return null;
      } finally {
        setIsCapturing(false);
      }
    },
    [quality, maxPhotos, photos.length, hasPermission, checkPermissions, requestPermissions],
  );

  const pickFromNativeGallery = useCallback(
    async (limit: number = 1) => {
      if (!canUseNativeCamera()) {
        setError('Native gallery not available on this platform');
        return [];
      }

      const remaining = maxPhotos - photos.length;
      const actualLimit = Math.min(limit, remaining);

      if (actualLimit <= 0) {
        setError(`Maximum of ${maxPhotos} photos allowed`);
        return [];
      }

      setError(null);

      try {
        const results = await pickFromGallery({
          quality,
          limit: actualLimit,
        });

        const newPhotos: CapturedPhoto[] = results.map((result, index) => ({
          id: `gallery-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
          blob: result.blob,
          uri: result.uri,
          timestamp: Date.now(),
          format: result.format,
        }));

        setPhotos((prev) => [...prev, ...newPhotos]);
        return newPhotos;
      } catch (err) {
        console.error('Native gallery picker error:', err);
        setError(err instanceof Error ? err.message : 'Gallery picker failed');
        return [];
      }
    },
    [quality, maxPhotos, photos.length],
  );

  const removePhoto = useCallback((photoId: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === photoId);
      if (photo) {
        // Revoke object URL to prevent memory leaks
        URL.revokeObjectURL(photo.uri);
      }
      return prev.filter((p) => p.id !== photoId);
    });
  }, []);

  const clearPhotos = useCallback(() => {
    setPhotos((prev) => {
      // Revoke all object URLs
      prev.forEach((photo) => URL.revokeObjectURL(photo.uri));
      return [];
    });
  }, []);

  return {
    // State
    photos,
    isCapturing,
    hasPermission,
    error,
    canUseNative: canUseNativeCamera(),

    // Actions
    capturePhoto: captureNativePhoto,
    pickFromGallery: pickFromNativeGallery,
    removePhoto,
    clearPhotos,
    checkPermissions,
    requestPermissions,

    // Utilities
    setError,
  };
};
