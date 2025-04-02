import { FilePondInitialFile } from 'filepond';

export const DEFAULT_FILE_POND_CONFIG = {
  maxFiles: 10,
  allowMultiple: true,
  acceptedFileTypes: ['image/*'] as const,
  instantUpload: true,
  allowImagePreview: true,
  imagePreviewHeight: 100,
  allowImageResize: true,
  imageResizeTargetWidth: 1200,
  imageResizeTargetHeight: 1200,
  imageResizeMode: 'contain' as const,
  imageTransformOutputQuality: 80,
  imageTransformOutputMimeType: 'image/jpeg',
  allowImageTransform: true,
  imageTransformVariants: {
    thumbnail_: (transforms: any) => ({
      ...transforms,
      resize: {
        size: {
          width: 200,
          height: 200,
        },
      },
    }),
    medium_: (transforms: any) => ({
      ...transforms,
      resize: {
        size: {
          width: 800,
          height: 800,
        },
      },
    }),
  },
  labels: {
    tapToRetry: 'Tap to retry upload',
    fileProcessing: 'Uploading...',
    fileProcessingComplete: 'Upload complete',
    fileProcessingAborted: 'Upload cancelled',
    fileLoadError: 'Error loading file',
    fileProcessingError: (error: any) => error?.body || 'Upload failed, tap to retry',
  },
} as const;

export interface FilePondConfig {
  maxFiles?: number;
  allowMultiple?: boolean;
  acceptedFileTypes?: string[];
  instantUpload?: boolean;
  allowImagePreview?: boolean;
  imagePreviewHeight?: number;
  allowImageResize?: boolean;
  imageResizeTargetWidth?: number;
  imageResizeTargetHeight?: number;
  imageResizeMode?: 'contain' | 'cover';
  imageTransformOutputQuality?: number;
  imageTransformOutputMimeType?: string;
  allowImageTransform?: boolean;
  imageTransformVariants?: Record<string, (transforms: any) => any>;
  labels?: {
    tapToRetry?: string;
    fileProcessing?: string;
    fileProcessingComplete?: string;
    fileProcessingAborted?: string;
    fileLoadError?: string;
    fileProcessingError?: (error: any) => string;
  };
} 