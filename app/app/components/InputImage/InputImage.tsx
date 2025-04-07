import React, { useCallback, useEffect, useState } from "react";
import { registerPlugin } from "react-filepond";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import FilePondPluginImageExifOrientation from "filepond-plugin-image-exif-orientation";
import FilePondPluginFilePoster from "filepond-plugin-file-poster";
import FilePondPluginImageResize from "filepond-plugin-image-resize";
import FilePondPluginImageTransform from "filepond-plugin-image-transform";
import {
  FilePondInitialFile,
  FilePondFile,
  FileOrigin,
} from "filepond";

// Styles
import "filepond/dist/filepond.min.css";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";
import "filepond-plugin-file-poster/dist/filepond-plugin-file-poster.css";

// Utils
import { join } from "path";
import { imageUploadStore } from "@/app/app/clients/ImageUploadStore";
import { createServerConfig } from "./createServerConfig";
import { FilePondWrapper } from './FilePondWrapper';
import { DEFAULT_FILE_POND_CONFIG } from './filePondConfig';

// 2. Register plugins at the top level
registerPlugin(
  FilePondPluginFilePoster,
  FilePondPluginImagePreview,
  FilePondPluginImageExifOrientation,
  FilePondPluginImageResize,
  FilePondPluginImageTransform
);

// 3. Type definitions
export interface InputImageProps {
  id?: string;
  path: string;
  onChange?: (fileSources: string[]) => void;
  minNumberOfFiles?: number;
  maxNumberOfFiles?: number;
}

const InputImage: React.FC<InputImageProps> = ({
  id,
  path,
  onChange,
  minNumberOfFiles = 0,
  maxNumberOfFiles = DEFAULT_FILE_POND_CONFIG.maxFiles,
}) => {
  const [initialFiles, setInitialFiles] = useState<FilePondInitialFile[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadInitialFiles = useCallback(async (): Promise<void> => {
    console.debug('[InputImage][loadInitialFiles] Loading files for path:', path);

    try {
      const trailingPath = path.endsWith('/') ? path : path + '/';
      const images = await imageUploadStore.list(trailingPath);
      if (!images.ok) return;

      const filePondFiles = await Promise.all(
        images.val.map(async (image) => {
          const result = await imageUploadStore.get(image.fullPath);
          if (!result.ok) return null;

          const fileData = result.val;
          return {
            source: result.val.path,
            options: {
              type: 'local',
              metadata: {
                filename: fileData.path.split('/').pop() || '',
                poster: fileData.href,
                status: fileData.syncStatus,
                uploadId: image.fullPath,
              },
              file: {
                name: fileData.path.split('/').pop() || '',
                size: fileData.file.size,
                type: fileData.file.type,
              },
            },
          } as FilePondInitialFile;
        })
      );

      const validFiles = filePondFiles.filter((file): file is FilePondInitialFile => file !== null);
      setInitialFiles(validFiles);
      setHasLoaded(true);
      onChange?.(validFiles.map((file) => file.source));
    } catch (error) {
      console.error('[InputImage][loadInitialFiles] Error loading files:', error);
      setInitialFiles([]);
      setHasLoaded(true);
      onChange?.([]);
    }
  }, [path, onChange]);

  useEffect(() => {
    loadInitialFiles();
  }, [loadInitialFiles]);

  const handleRemoveFile = useCallback((file: FilePondFile) => {
    if (typeof file.source === 'string' && file.source.startsWith('blob:')) {
      URL.revokeObjectURL(file.source);
    }

    const uploadId = file.getMetadata('uploadId');
    if (uploadId) {
      imageUploadStore.remove(uploadId).catch(console.error);
    }

    setInitialFiles((prev) =>
      prev.filter((f) => f.options?.metadata?.uploadId !== uploadId)
    );
  }, []);

  const handleUpdateFiles = useCallback((files: FilePondFile[]) => {
    const fileSources = files.map((file) =>
      join(path, file.file.name.replace('.png', '.jpg').replace('.jpeg', '.jpg'))
    );
    onChange?.(fileSources);
  }, [path, onChange]);

  const handleProcessFile = useCallback((file: FilePondFile) => {
    console.log('[InputImage][handleProcessFile] Processing file:', file);
  }, []);

  const handleAddFile = useCallback((file: FilePondFile) => {
    if(file.origin === FileOrigin.INPUT) {
      console.log('[InputImage][handleAddFile] Adding file:', file);
    } 
  }, []);

  const handleAddFileComplete = useCallback((file: FilePondFile) => {
    if(file.origin === FileOrigin.INPUT) {
      console.log('[InputImage][handleAddFileComplete] Adding file:', file);
    }
  }, []);

  if (!hasLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <FilePondWrapper
      id={id}
      files={initialFiles}
      server={createServerConfig({ path })}
      onRemoveFile={handleRemoveFile}
      onUpdateFiles={handleUpdateFiles}
      onProcessFile={handleProcessFile}
      onAddFile={handleAddFile}
      onAddFileComplete={handleAddFileComplete}
      {...DEFAULT_FILE_POND_CONFIG}
      maxFiles={maxNumberOfFiles}
      acceptedFileTypes={['image/*']}
    />
  );
};

export const MemoizedInputImage = React.memo(InputImage);

export default MemoizedInputImage;
