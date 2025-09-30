import Resizer from 'react-image-file-resizer';

/**
 * Resize an image to specified dimensions
 * Extracted from existing DropZoneInputImage.tsx implementation
 */
export const resizeImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    Resizer.imageFileResizer(
      file,
      2048, // maxWidth for high-quality uploads (longest edge)
      2048, // maxHeight for high-quality uploads (longest edge)
      'JPEG', // output format for broad compatibility
      90, // quality (85-92 is visually lossless for photos)
      0, // rotation
      (uri) => {
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
};

/**
 * Generate a small thumbnail for instant display
 * Returns base64 data URL that can be stored in IndexedDB
 */
export const generateThumbnail = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    Resizer.imageFileResizer(
      file,
      200, // smaller for thumbnails
      200,
      'JPEG',
      80, // reduced quality for smaller size
      0, // rotation
      (uri) => {
        if (typeof uri === 'string') {
          resolve(uri); // Returns base64 data URL
        } else {
          reject(new Error('Unexpected thumbnail format'));
        }
      },
      'base64'
    );
  });
};

/**
 * Get image dimensions from a file
 */
export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(url);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
};

/**
 * Convert File to ArrayBuffer for IndexedDB storage
 * Files can't be directly stored in IndexedDB in all browsers
 */
export const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to ArrayBuffer'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Convert ArrayBuffer back to File
 */
export const arrayBufferToFile = (
  buffer: ArrayBuffer,
  fileName: string,
  mimeType: string
): File => {
  return new File([buffer], fileName, {
    type: mimeType,
    lastModified: Date.now(),
  });
};

/**
 * Calculate estimated thumbnail size in bytes
 * Useful for monitoring IndexedDB usage
 */
export const estimateThumbnailSize = (base64DataUrl: string): number => {
  // Remove data URL prefix to get actual base64 content
  const base64 = base64DataUrl.split(',')[1] || '';
  // Base64 increases size by ~33%, so actual bytes = (base64.length * 3) / 4
  return Math.ceil((base64.length * 3) / 4);
};