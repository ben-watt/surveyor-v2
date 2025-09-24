import { X, Archive, Pencil, Camera } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { FileWithPath, useDropzone } from "react-dropzone";
import { enhancedImageStore } from "@/app/home/clients/enhancedImageMetadataStore";
import { ImageMetadataDialog } from "./ImageMetadataDialog";
import { CameraModalWrapper } from "./CameraModalWrapper";
import { useDynamicDrawer } from "@/app/home/components/Drawer";
import { resizeImage } from "@/app/home/utils/imageResizer";
import { join } from "path";
import toast from "react-hot-toast";
import { processFileWithHash, renameFile } from "@/app/home/utils/imageHashUtils";
import { ProgressiveImage } from "../ProgressiveImage";
import { ImageMetadata } from "../../clients/Database";

interface DropZoneInputImageEnhancedProps {
  path: string;
  maxFiles?: number;
  minFiles?: number;
  onChange?: (imageIds: string[]) => void;
  features?: {
    archive?: boolean;
    metadata?: boolean;
  };
}

export type { DropZoneInputImageEnhancedProps };

interface ThumbnailEnhancedProps {
  imageId: string;
  onDelete: (imageId: string) => void;
  onArchive: (imageId: string) => void;
  features?: DropZoneInputImageEnhancedProps['features'];
  onMetadataChange: (imageId: string) => void;
}

const ThumbnailEnhanced = ({
  imageId,
  onDelete,
  onArchive,
  features,
  onMetadataChange
}: ThumbnailEnhancedProps) => {
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

    openDrawer(<ImageMetadataDialog
      imagePath={image.imagePath}
      initialCaption={image.caption}
      initialNotes={image.notes}
      onSave={async (caption, notes) => {
        await enhancedImageStore.update({
          id: imageId,
          caption,
          notes
        });
        setHasMetadata(true);
        onMetadataChange(imageId);
        closeDrawer();
      }}
      onClose={closeDrawer}
    />);
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
          onDelete(imageId);
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
            onArchive(imageId);
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

export const DropZoneInputImageEnhanced = ({
  path,
  maxFiles,
  minFiles,
  onChange,
  features = { archive: false, metadata: false }
}: DropZoneInputImageEnhancedProps) => {
  const [imageIds, setImageIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Load existing images for this path
  useEffect(() => {
    const loadExistingImages = async () => {
      try {
        const result = await enhancedImageStore.getActiveImages();

        if (result.ok) {
          // Filter images for this specific path
          const pathImages = result.val.filter(img =>
            img.imagePath.startsWith(path) && !img.isArchived
          );

          const ids = pathImages.map(img => img.id);
          setImageIds(ids);
          onChange?.(ids);
        }
      } catch (error) {
        console.error("Error loading existing images:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingImages();
  }, [path]);

  const handleUpload = async (file: File, fileName: string) => {
    const finalPath = join(path, fileName);
    const id = crypto.randomUUID();

    setIsUploading(true);
    try {
      const uploadResult = await enhancedImageStore.uploadImage(
        file,
        finalPath,
        {
          id,
          onProgress: (progress) => {
            console.debug(`Upload progress for ${fileName}: ${progress}%`);
          }
        }
      );

      if (uploadResult.ok) {
        setImageIds(prev => [...prev, uploadResult.val]);
        onChange?.([...imageIds, uploadResult.val]);
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
      console.log("[DropZoneInputImageEnhanced] Processing files");

      // Get existing files for duplicate detection
      const existingImages = await enhancedImageStore.getActiveImages();
      const existingFileData = existingImages.ok ? existingImages.val.map(img => ({
        name: img.fileName || '',
        isArchived: img.isArchived || false,
        file: null // We'll use content hash for comparison
      })) : [];

      const newImageIds: string[] = [];

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
                newImageIds.push(existingImage.id);
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
          const finalFileName = hashResult.fileName;
          const uploadedId = await handleUpload(resizedFile, finalFileName);

          if (uploadedId) {
            newImageIds.push(uploadedId);
            existingFileData.push({
              name: finalFileName,
              isArchived: false,
              file: resizedFile
            });
          }
        } catch (error) {
          console.error("Error processing file:", error);
          toast.error(`Failed to process ${originalFile.name}`);
        }
      }

      if (newImageIds.length > 0) {
        const updatedIds = [...imageIds, ...newImageIds];
        setImageIds(updatedIds);
        onChange?.(updatedIds);
      }
    },
  });

  const handleDelete = async (imageId: string) => {
    try {
      // For now, we'll archive instead of hard delete
      await enhancedImageStore.archiveImage(imageId);
      const updatedIds = imageIds.filter(id => id !== imageId);
      setImageIds(updatedIds);
      onChange?.(updatedIds);
      toast.success("Image deleted");
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Failed to delete image");
    }
  };

  const handleArchive = async (imageId: string) => {
    try {
      await enhancedImageStore.archiveImage(imageId);
      const updatedIds = imageIds.filter(id => id !== imageId);
      setImageIds(updatedIds);
      onChange?.(updatedIds);
      toast.success("Image archived");
    } catch (error) {
      console.error("Error archiving image:", error);
      toast.error("Failed to archive image");
    }
  };

  const handleMetadataChange = (imageId: string) => {
    // Trigger re-render if needed
    console.debug("Metadata updated for:", imageId);
  };

  const handleCameraCapture = async (capturedFiles: File[]) => {
    setIsCameraOpen(false);

    const newImageIds: string[] = [];
    for (const file of capturedFiles) {
      const uploadedId = await handleUpload(file, file.name);
      if (uploadedId) {
        newImageIds.push(uploadedId);
      }
    }

    if (newImageIds.length > 0) {
      const updatedIds = [...imageIds, ...newImageIds];
      setImageIds(updatedIds);
      onChange?.(updatedIds);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  const showDropzone = !maxFiles || imageIds.length < maxFiles;

  return (
    <>
      <div className="space-y-4">
        <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {imageIds.map((imageId) => (
            <ThumbnailEnhanced
              key={imageId}
              imageId={imageId}
              onDelete={handleDelete}
              onArchive={handleArchive}
              features={features}
              onMetadataChange={handleMetadataChange}
            />
          ))}
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
                  {imageIds.length}/{maxFiles} images
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
          onCapture={handleCameraCapture}
          currentImageCount={imageIds.length}
        />
      )}
    </>
  );
};