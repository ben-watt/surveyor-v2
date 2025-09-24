import { X, Archive, Pencil, Camera } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { FileWithPath, useDropzone } from "react-dropzone";
import { enhancedImageStore } from "@/app/home/clients/enhancedImageMetadataStore";
import { SimpleImageMetadataDialog } from "./SimpleImageMetadataDialog";
import { CameraModalWrapper } from "./CameraModalWrapper";
import { useDynamicDrawer } from "@/app/home/components/Drawer";
import { resizeImage } from "@/app/home/utils/imageResizer";
import toast from "react-hot-toast";
import { processFileWithHash } from "@/app/home/utils/imageHashUtils";
import { ProgressiveImage } from "../ProgressiveImage";

// Custom path join to avoid leading slashes for AWS Amplify
const joinPath = (...parts: string[]) => {
  return parts.filter(Boolean).join('/').replace(/^\/+/, '');
};

export interface DropZoneInputImageV2Props {
  path: string;
  maxFiles?: number;
  minFiles?: number;
  onChange?: (filePaths: DropZoneInputFile[]) => void;
  features?: {
    archive?: boolean;
    metadata?: boolean;
  };
}

export type DropZoneInputFile = {
  path: string;
  isArchived: boolean;
  hasMetadata: boolean;
  preview?: string;
};

interface ThumbnailProps {
  imageId: string;
  filePath: string;
  onDelete: (filePath: string) => void;
  onArchive: (filePath: string) => void;
  features?: DropZoneInputImageV2Props['features'];
  onMetadataChange: (filePath: string) => void;
}

const Thumbnail = ({
  imageId,
  filePath,
  onDelete,
  onArchive,
  features,
  onMetadataChange
}: ThumbnailProps) => {
  const { openDrawer, closeDrawer } = useDynamicDrawer();
  const [hydrated, image] = enhancedImageStore.useGet(imageId);
  const [hasMetadata, setHasMetadata] = useState(false);

  useEffect(() => {
    if (image?.caption || image?.notes) {
      setHasMetadata(true);
    }
  }, [image]);

  const handleEdit = () => {
    if (!image) return;

    openDrawer({
      id: 'image-metadata',
      title: 'Edit Image Metadata',
      content: <SimpleImageMetadataDialog
        initialCaption={image.caption}
        initialNotes={image.notes}
        onSave={async (caption: string, notes: string) => {
          await enhancedImageStore.update(imageId, (draft) => {
            draft.caption = caption;
            draft.notes = notes;
          });
          setHasMetadata(true);
          onMetadataChange(filePath);
          closeDrawer();
        }}
        onClose={closeDrawer}
      />
    });
  };

  if (!hydrated || !image) {
    return (
      <div className="animate-pulse bg-gray-200 rounded aspect-square" />
    );
  }

  return (
    <div className="relative group overflow-hidden rounded-lg bg-gray-50">
      <ProgressiveImage
        imageId={imageId}
        className="aspect-square object-cover w-full"
        alt={image.fileName}
      />

      <button
        className="absolute top-2 right-2 p-2 bg-white/80 rounded-full hover:bg-white transition-colors"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete(filePath);
        }}
        title="Delete image"
      >
        <X className="h-4 w-4" />
      </button>

      {features?.archive && !image.isArchived && (
        <button
          className="absolute top-2 right-12 p-2 bg-white/80 rounded-full hover:bg-white transition-colors"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onArchive(filePath);
          }}
          title="Archive image"
        >
          <Archive className="h-4 w-4" />
        </button>
      )}

      {features?.metadata && (
        <button
          className={`absolute bottom-2 right-2 p-2 rounded-full hover:bg-white transition-colors ${
            hasMetadata ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-white/80'
          }`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleEdit();
          }}
          title="Edit metadata"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export const DropZoneInputImageV2 = ({
  path,
  maxFiles,
  minFiles,
  onChange,
  features = { archive: false, metadata: false }
}: DropZoneInputImageV2Props) => {
  const [files, setFiles] = useState<DropZoneInputFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Map of imagePath -> imageId for tracking
  const [pathToIdMap, setPathToIdMap] = useState<Map<string, string>>(new Map());

  // Load existing images for this path
  useEffect(() => {
    const loadExistingImages = async () => {
      try {
        const result = await enhancedImageStore.getActiveImages();
        if (!result.ok) {
          setIsLoading(false);
          return;
        }

        // Filter images for this specific path
        const pathImages = result.val.filter(img =>
          img.imagePath.startsWith(path) && !img.isArchived
        );

        const newPathToIdMap = new Map<string, string>();
        const existingFiles: DropZoneInputFile[] = pathImages.map(img => {
          newPathToIdMap.set(img.imagePath, img.id);

          return {
            path: img.imagePath,
            isArchived: img.isArchived || false,
            hasMetadata: !!(img.caption || img.notes)
          };
        });

        setPathToIdMap(newPathToIdMap);
        setFiles(existingFiles);
        onChange?.(existingFiles);
      } catch (error) {
        console.error("Error loading existing images:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingImages();
  }, [path]);

  const handleUpload = async (file: File, fileName: string) => {
    const finalPath = joinPath(path, fileName);

    setIsUploading(true);
    try {
      const uploadResult = await enhancedImageStore.uploadImage(
        file,
        finalPath,
        {
          onProgress: (progress) => {
            console.debug(`Upload progress for ${fileName}: ${progress}%`);
          }
        }
      );

      if (uploadResult.ok) {
        const newFile: DropZoneInputFile = {
          path: finalPath,
          isArchived: false,
          hasMetadata: false
        };

        // Update path to ID mapping
        setPathToIdMap(prev => new Map(prev.set(finalPath, uploadResult.val)));

        const updatedFiles = [...files, newFile];
        setFiles(updatedFiles);
        onChange?.(updatedFiles);

        return uploadResult.val;
      } else {
        throw uploadResult.val;
      }
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error(`Failed to upload ${fileName}`);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    maxFiles,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.ico', '.webp'],
    },
    onDrop: async (acceptedFiles: FileWithPath[]) => {
      console.log("[DropZoneInputImageV2] Processing files");

      // Get existing files for duplicate detection
      const existingImages = await enhancedImageStore.getActiveImages();
      const existingFileData = existingImages.ok ? existingImages.val.map(img => ({
        name: img.fileName || '',
        isArchived: img.isArchived || false,
        file: new Blob() // Placeholder for hash comparison
      })) : [];

      for (const originalFile of acceptedFiles) {
        try {
          // Resize the image
          const resizedFile = await resizeImage(originalFile);

          // Check for duplicates
          const hashResult = await processFileWithHash(resizedFile, existingFileData);

          if (hashResult.isDuplicate) {
            if (hashResult.isArchived) {
              // Unarchive the existing image
              const existingImage = existingImages.ok ?
                existingImages.val.find(img => img.fileName === hashResult.matchedFile) : null;

              if (existingImage) {
                await enhancedImageStore.unarchiveImage(existingImage.id);
                toast(`Restored archived image: ${hashResult.matchedFile}`, {
                  icon: '📤',
                  duration: 3000,
                });
              }
            } else {
              toast(`Skipping duplicate: ${hashResult.matchedFile}`, {
                icon: '⚠️',
                duration: 3000,
              });
            }
            continue;
          }

          // Upload the new file
          const finalFileName = hashResult.filename;
          await handleUpload(resizedFile, finalFileName);

          existingFileData.push({
            name: finalFileName,
            isArchived: false,
            file: resizedFile
          });
        } catch (error) {
          console.error("Error processing file:", error);
          toast.error(`Failed to process ${originalFile.name}`);
        }
      }
    },
  });

  const handleDelete = async (filePath: string) => {
    try {
      const imageId = pathToIdMap.get(filePath);
      if (imageId) {
        await enhancedImageStore.archiveImage(imageId);
      }

      const updatedFiles = files.filter(f => f.path !== filePath);
      setFiles(updatedFiles);
      onChange?.(updatedFiles);
      toast.success("Image deleted");
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Failed to delete image");
    }
  };

  const handleArchive = async (filePath: string) => {
    try {
      const imageId = pathToIdMap.get(filePath);
      if (imageId) {
        await enhancedImageStore.archiveImage(imageId);
      }

      const updatedFiles = files.filter(f => f.path !== filePath);
      setFiles(updatedFiles);
      onChange?.(updatedFiles);
      toast.success("Image archived");
    } catch (error) {
      console.error("Error archiving image:", error);
      toast.error("Failed to archive image");
    }
  };

  const handleMetadataChange = (filePath: string) => {
    // Update hasMetadata flag
    setFiles(prev => prev.map(f =>
      f.path === filePath ? { ...f, hasMetadata: true } : f
    ));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  const showDropzone = !maxFiles || files.length < maxFiles;

  return (
    <>
      <div className="space-y-4">
        <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {files.map((file) => {
            const imageId = pathToIdMap.get(file.path);
            if (!imageId) return null;

            return (
              <Thumbnail
                key={file.path}
                imageId={imageId}
                filePath={file.path}
                onDelete={handleDelete}
                onArchive={handleArchive}
                features={features}
                onMetadataChange={handleMetadataChange}
              />
            );
          })}
        </section>

        {showDropzone && (
          <div
            {...getRootProps()}
            className="p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
          >
            <input {...getInputProps()} />
            <div className="text-center">
              <p className="text-gray-600">
                Drag & drop images here, or click to select
              </p>
              {maxFiles && (
                <p className="text-sm text-gray-500 mt-1">
                  {files.length}/{maxFiles} images
                </p>
              )}
            </div>
          </div>
        )}

        {isUploading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
              <p className="mt-4">Uploading images...</p>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsCameraOpen(true)}
          className="w-full p-4 bg-blue-500 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors"
        >
          <Camera className="h-5 w-5" />
          Take Photo
        </button>
      </div>

      {isCameraOpen && (
        <CameraModalWrapper
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          path={path}
          onPhotoCaptured={async (filePath: string) => {
            // This would be called when a photo is captured via the existing modal
            setIsCameraOpen(false);
          }}
          maxPhotos={maxFiles ? maxFiles - files.length : undefined}
        />
      )}
    </>
  );
};