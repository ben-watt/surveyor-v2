import React, { useCallback, useEffect, useState } from "react";
import {
  FilePondInitialFile,
  FilePondFile,
  FileOrigin,
} from "filepond";

// Utils
import { join } from "path";
import { imageUploadStore } from "@/app/app/clients/ImageUploadStore";
import { createServerConfig } from "./createServerConfig";
import { FilePondWrapper } from './FilePondWrapper';
import { DEFAULT_FILE_POND_CONFIG } from './filePondConfig';
import { imageUploadStatusStore } from './imageUploadStatusStore';


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
    if(file.origin === FileOrigin.INPUT) {
      imageUploadStatusStore.setUploaded(path);
    }
  }, [path]);

  const handleAddFile = useCallback((file: FilePondFile) => {
    if(file.origin === FileOrigin.INPUT) {
      console.log('[InputImage][handleAddFile] Adding file:', file);
      imageUploadStatusStore.setUploading(path, true);
    } 
  }, [path]);

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
      {...DEFAULT_FILE_POND_CONFIG}
      maxFiles={maxNumberOfFiles}
      acceptedFileTypes={['image/*']}
    />
  );
};

export const MemoizedInputImage = React.memo(InputImage);

export default MemoizedInputImage;
