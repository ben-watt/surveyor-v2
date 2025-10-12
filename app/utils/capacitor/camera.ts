import { Camera, CameraResultType, CameraSource, CameraDirection, Photo } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { isNativePlatform } from './platform';

export interface CapturePhotoOptions {
  quality?: number;
  width?: number;
  height?: number;
  allowEditing?: boolean;
  saveToGallery?: boolean;
  direction?: CameraDirection;
}

export interface CapturedPhotoResult {
  blob: Blob;
  uri: string;
  format?: string;
  width?: number;
  height?: number;
}

export const capturePhoto = async (
  options: CapturePhotoOptions = {},
): Promise<CapturedPhotoResult> => {
  if (!isNativePlatform()) {
    throw new Error('Native camera not available on this platform');
  }

  try {
    const photo: Photo = await Camera.getPhoto({
      quality: options.quality ?? 90,
      allowEditing: options.allowEditing ?? false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      saveToGallery: options.saveToGallery ?? false,
      width: options.width,
      height: options.height,
      direction: options.direction ?? CameraDirection.Rear,
    });

    // Convert to blob for consistency with existing pipeline
    if (!photo.webPath) {
      throw new Error('Photo capture failed - no path returned');
    }

    const response = await fetch(photo.webPath);
    const blob = await response.blob();

    return {
      blob,
      uri: photo.webPath,
      format: photo.format,
    };
  } catch (error) {
    console.error('Native camera capture error:', error);
    throw error;
  }
};

export const pickFromGallery = async (
  options: {
    quality?: number;
    limit?: number;
    width?: number;
    height?: number;
  } = {},
): Promise<CapturedPhotoResult[]> => {
  if (!isNativePlatform()) {
    throw new Error('Native gallery not available on this platform');
  }

  try {
    const result = await Camera.pickImages({
      quality: options.quality ?? 90,
      limit: options.limit ?? 1,
      width: options.width,
      height: options.height,
    });

    const photos: CapturedPhotoResult[] = [];

    for (const photo of result.photos) {
      if (photo.webPath) {
        const response = await fetch(photo.webPath);
        const blob = await response.blob();

        photos.push({
          blob,
          uri: photo.webPath,
          format: photo.format,
        });
      }
    }

    return photos;
  } catch (error) {
    console.error('Native gallery picker error:', error);
    throw error;
  }
};

export const convertUriToBlob = async (uri: string): Promise<Blob> => {
  try {
    const response = await fetch(uri);
    return await response.blob();
  } catch (error) {
    console.error('Error converting URI to blob:', error);
    throw error;
  }
};

export const savePhotoToDevice = async (blob: Blob, filename: string): Promise<string> => {
  if (!isNativePlatform()) {
    throw new Error('File system access not available on this platform');
  }

  try {
    // Convert blob to base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:type;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // Save to device filesystem
    const savedFile = await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory: Directory.Cache,
    });

    return savedFile.uri;
  } catch (error) {
    console.error('Error saving photo to device:', error);
    throw error;
  }
};
