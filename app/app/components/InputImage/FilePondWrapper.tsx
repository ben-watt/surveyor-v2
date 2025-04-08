import React, { useCallback, useRef } from 'react';
import { FilePond, registerPlugin } from 'react-filepond';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
import FilePondPluginImageExifOrientation from 'filepond-plugin-image-exif-orientation';
import FilePondPluginFilePoster from 'filepond-plugin-file-poster';
import FilePondPluginImageResize from 'filepond-plugin-image-resize';
import FilePondPluginImageTransform from 'filepond-plugin-image-transform';
import FilePondPluginImageCrop from 'filepond-plugin-image-crop'
import { FilePondInitialFile, FilePondFile } from 'filepond';

// Styles
import 'filepond/dist/filepond.min.css';
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css';
import 'filepond-plugin-file-poster/dist/filepond-plugin-file-poster.css';

// Register plugins
registerPlugin(
  FilePondPluginFilePoster,
  FilePondPluginImagePreview,
  FilePondPluginImageExifOrientation,
  FilePondPluginImageResize,
  FilePondPluginImageTransform,
  FilePondPluginImageCrop
);

export interface FilePondWrapperProps {
  id?: string;
  files: FilePondInitialFile[];
  server: any; // TODO: Add proper type
  onRemoveFile?: (file: FilePondFile) => void;
  onUpdateFiles?: (files: FilePondFile[]) => void;
  onAddFile?: (file: FilePondFile) => void;
  onAddFileComplete?: (file: FilePondFile) => void;
  onProcessFile?: (file: FilePondFile) => void;
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
  labelTapToRetry?: string;
  labelFileProcessing?: string;
  labelFileProcessingComplete?: string;
  labelFileProcessingAborted?: string;
  labelFileLoadError?: string;
  allowImageCrop?: boolean;
  imageCropAspectRatio?: string;
  labelFileProcessingError?: (error: any) => string;
}

export const FilePondWrapper: React.FC<FilePondWrapperProps> = ({
  id,
  files,
  server,
  onRemoveFile,
  onUpdateFiles,
  onAddFile,
  onAddFileComplete,
  onProcessFile,
  maxFiles = 10,
  allowMultiple = true,
  acceptedFileTypes = ['image/*'],
  instantUpload = true,
  allowImagePreview = true,
  imagePreviewHeight = 100,
  allowImageResize = true,
  imageResizeTargetWidth = 1200,
  imageResizeTargetHeight = 1200,
  imageResizeMode = 'contain',
  imageTransformOutputQuality = 80,
  imageTransformOutputMimeType = 'image/jpeg',
  allowImageTransform = true,
  allowImageCrop = true,
  imageCropAspectRatio = '4:3',
  imageTransformVariants = {
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
  labelTapToRetry = 'Tap to retry upload',
  labelFileProcessing = 'Uploading...',
  labelFileProcessingComplete = 'Upload complete',
  labelFileProcessingAborted = 'Upload cancelled',
  labelFileLoadError = 'Error loading file',
  labelFileProcessingError = (error: any) => error?.body || 'Upload failed, tap to retry',
}) => {
  const filepond = useRef<FilePond | null>(null);
  return (
    <div className="relative" data-testid="filepond-wrapper" data-max-files={maxFiles} data-accepted-file-types={acceptedFileTypes.join(',')}>
      <FilePond
        ref={filepond}
        name={id || 'filepond'}
        allowMultiple={allowMultiple}
        maxFiles={maxFiles}
        allowRevert={true}
        acceptedFileTypes={acceptedFileTypes}
        instantUpload={instantUpload}
        allowImagePreview={allowImagePreview}
        imagePreviewHeight={imagePreviewHeight}
        allowImageResize={allowImageResize}
        imageResizeTargetWidth={imageResizeTargetWidth}
        imageResizeTargetHeight={imageResizeTargetHeight}
        imageResizeMode={imageResizeMode}
        imageTransformOutputQuality={imageTransformOutputQuality}
        imageTransformOutputMimeType={imageTransformOutputMimeType}
        allowImageTransform={allowImageTransform}
        imageTransformVariants={imageTransformVariants}
        credits={false}
        onremovefile={(err, file) => onRemoveFile?.(file)}
        onupdatefiles={(files) => onUpdateFiles?.(files)}
        onaddfilestart={(file) => onAddFile?.(file)}
        onaddfile={(err, file) => onAddFileComplete?.(file)}
        onprocessfile={(err, file) => onProcessFile?.(file)}
        server={server}
        files={files}
        labelTapToRetry={labelTapToRetry}
        labelFileProcessing={labelFileProcessing}
        labelFileProcessingComplete={labelFileProcessingComplete}
        labelFileProcessingAborted={labelFileProcessingAborted}
        labelFileLoadError={labelFileLoadError}
        labelFileProcessingError={labelFileProcessingError}
        allowImageCrop={allowImageCrop}
        imageCropAspectRatio={imageCropAspectRatio}
      />
    </div>
  );
}; 