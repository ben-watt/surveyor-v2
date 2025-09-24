import { X, Archive, Pencil, Camera } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { FileWithPath, useDropzone } from "react-dropzone";
import { enhancedImageStore } from "@/app/home/clients/enhancedImageMetadataStore";
import { ImageMetadata } from "@/app/home/clients/Database";
import { SimpleImageMetadataDialog } from "./SimpleImageMetadataDialog";
import { CameraModalWrapper } from "./CameraModalWrapper";
import { useDynamicDrawer } from "@/app/home/components/Drawer";
import { resizeImage } from "@/app/home/utils/imageResizer";
import { generateImageHash } from "@/app/home/utils/imageHashUtils";
import toast from "react-hot-toast";
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

  const toFileSize = useCallback((size: number): [number, string] => {
    if (size < 1024) {
      return [size, "B"];
    } else if (size < 1024 * 1024) {
      return [Math.round(size / 1024), "KB"];
    } else if (size < 1024 * 1024 * 1024) {
      return [Math.round(size / 1024 / 1024), "MB"];
    } else {
      return [Math.round(size / 1024 / 1024 / 1024), "GB"];
    }
  }, []);

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
      <div className="animate-pulse bg-gray-200 rounded aspect-[3/2]" />
    );
  }

  return (
    <div className="relative rounded-md overflow-hidden" key={image.fileName}>
      <div>
        <ProgressiveImage
          imageId={imageId}
          className="aspect-[3/2] object-cover"
          alt={image.fileName}
        />
      </div>
      <aside className="absolute top-0 left-0 right-0 bottom-0 from-black/70 to-black/0 bg-gradient-to-b"></aside>
      <aside className="absolute top-0 left-9 right-9 text-white p-2 text-xs">
        <p className="truncate">{image.fileName}</p>
        <p className="text-background/50 text-[0.6rem]">
          {image.fileSize ? (() => {
            const [size, unit] = toFileSize(image.fileSize);
            return `${size} ${unit}`;
          })() : 'Unknown size'}
        </p>
      </aside>
      <aside className="absolute top-0 left-0">
        <button
          className="text-white p-1 m-2 rounded-full bg-black/50 transition border border-white/50 hover:border-white"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete(filePath);
          }}
        >
          <X />
        </button>
      </aside>
      {features?.metadata && (
        <aside className="absolute top-0 right-0">
          <button
            className={`p-1 m-2 rounded-full bg-black/50 transition border border-white/50 hover:border-white ${
              hasMetadata ? 'text-green-500 border-green-500' : 'text-white'
            }`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              handleEdit();
            }}
          >
            <Pencil size={16} />
          </button>
        </aside>
      )}
      {features?.archive && (
        <aside className="absolute bottom-0 left-0">
          <button
            className="text-white p-1 m-2 rounded-full bg-black/50 transition border border-white/50 hover:border-white"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onArchive(filePath);
            }}
          >
            <Archive size={16} />
          </button>
        </aside>
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
        // Load both active and archived images
        const [activeResult, archivedResult] = await Promise.all([
          enhancedImageStore.getActiveImages(),
          enhancedImageStore.getArchivedImages()
        ]);

        let allImages: ImageMetadata[] = [];
        if (activeResult.ok) {
          allImages = [...allImages, ...activeResult.val];
        }
        if (archivedResult.ok) {
          allImages = [...allImages, ...archivedResult.val];
        }

        // Deduplicate by ID to avoid duplicate keys
        const deduplicatedImages = allImages.reduce((unique, img) => {
          if (!unique.find(existing => existing.id === img.id)) {
            unique.push(img);
          }
          return unique;
        }, [] as ImageMetadata[]);

        // Filter images for this specific path
        const pathImages = deduplicatedImages.filter(img =>
          img.imagePath.startsWith(path)
        );

        // Create path->id mapping and deduplicate files by path
        const newPathToIdMap = new Map<string, string>();
        const filesByPath = new Map<string, DropZoneInputFile>();

        pathImages.forEach(img => {
          // Only keep the first occurrence of each path to avoid duplicates
          if (!filesByPath.has(img.imagePath)) {
            newPathToIdMap.set(img.imagePath, img.id);
            filesByPath.set(img.imagePath, {
              path: img.imagePath,
              isArchived: img.isArchived || false,
              hasMetadata: !!(img.caption || img.notes)
            });
          }
        });

        const existingFiles: DropZoneInputFile[] = Array.from(filesByPath.values());

        setPathToIdMap(newPathToIdMap);
        setFiles(existingFiles);
        onChange?.(existingFiles.filter(f => !f.isArchived));
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
        // Don't update state immediately - let the reload logic handle UI updates
        // This prevents duplicate keys from race conditions
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

      // Get existing images for immediate duplicate detection
      const [activeImages, archivedImages] = await Promise.all([
        enhancedImageStore.getActiveImages(),
        enhancedImageStore.getArchivedImages()
      ]);

      let allExistingImages: ImageMetadata[] = [];
      if (activeImages.ok) allExistingImages.push(...activeImages.val);
      if (archivedImages.ok) allExistingImages.push(...archivedImages.val);

      // Filter to images in this path
      const pathImages = allExistingImages.filter(img => img.imagePath.startsWith(path));

      for (const originalFile of acceptedFiles) {
        try {
          // Resize the image first
          const resizedFile = await resizeImage(originalFile);

          // Generate content hash for duplicate detection
          const contentHash = await generateImageHash(resizedFile);

          // Check for immediate duplicate
          const existingImage = pathImages.find(img => img.contentHash === contentHash);
          if (existingImage) {
            if (existingImage.isArchived) {
              // Unarchive existing image
              await enhancedImageStore.unarchiveImage(existingImage.id);
              toast(`Restored archived image: ${existingImage.fileName}`, {
                icon: '📤',
                duration: 3000,
              });
            } else {
              // Skip duplicate active image
              toast(`Image already exists: ${existingImage.fileName}`, {
                icon: '📋',
                duration: 3000,
              });
            }
            continue; // Skip this file
          }

          // Upload the new file with original filename
          const uploadResult = await enhancedImageStore.uploadImage(
            resizedFile,
            joinPath(path, resizedFile.name),
            {
              onProgress: (progress) => {
                console.debug(`Upload progress for ${resizedFile.name}: ${progress}%`);
              }
            }
          );

          if (uploadResult.ok) {
            console.log(`Successfully processed ${originalFile.name}`);
          } else {
            console.error(`Failed to upload ${originalFile.name}:`, uploadResult.val);
            toast.error(`Failed to upload ${originalFile.name}`);
          }
        } catch (error) {
          console.error("Error processing file:", error);
          toast.error(`Failed to process ${originalFile.name}`);
        }
      }

      // Reload files after processing to ensure UI is updated
      try {
        const [activeResult, archivedResult] = await Promise.all([
          enhancedImageStore.getActiveImages(),
          enhancedImageStore.getArchivedImages()
        ]);

        let allImages: ImageMetadata[] = [];
        if (activeResult.ok) {
          allImages = [...allImages, ...activeResult.val];
        }
        if (archivedResult.ok) {
          allImages = [...allImages, ...archivedResult.val];
        }

        // Deduplicate by ID to avoid duplicate keys
        const deduplicatedImages = allImages.reduce((unique, img) => {
          if (!unique.find(existing => existing.id === img.id)) {
            unique.push(img);
          }
          return unique;
        }, [] as ImageMetadata[]);

        const pathImages = deduplicatedImages.filter(img =>
          img.imagePath.startsWith(path)
        );

        const newPathToIdMap = new Map<string, string>();
        const updatedFiles: DropZoneInputFile[] = pathImages.map(img => {
          newPathToIdMap.set(img.imagePath, img.id);

          return {
            path: img.imagePath,
            isArchived: img.isArchived || false,
            hasMetadata: !!(img.caption || img.notes)
          };
        });

        setPathToIdMap(newPathToIdMap);
        setFiles(updatedFiles);
        onChange?.(updatedFiles.filter(f => !f.isArchived));
      } catch (error) {
        console.error("Error reloading images after upload:", error);
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
      onChange?.(updatedFiles.filter(f => !f.isArchived));
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
      <div className="container border border-gray-300 rounded-md p-4 bg-gray-100">
        Loading...
      </div>
    );
  }

  const activeFiles = files.filter((f) => !f.isArchived);
  const archivedFiles = files.filter((f) => f.isArchived);

  return (
    <>
      <section className="container border border-gray-300 rounded-md p-4 bg-gray-100">
        <div {...getRootProps({ className: "dropzone" })}>
          {maxFiles !== activeFiles.length && (
            <div className="flex flex-col items-center justify-center">
              <input {...getInputProps()} />
              <p className="text-sm text-gray-500 m-2 text-center">
                Drag & drop files, {" or "}
                <u className="cursor-pointer">fetch from device</u>
              </p>
            </div>
          )}
        </div>
        <aside>
          <ul
            className={`${
              maxFiles && maxFiles > 1
                ? "grid grid-cols-2 gap-2"
                : "flex flex-wrap gap-2 justify-center"
            }`}
          >
            {activeFiles.map((file) => {
              const imageId = pathToIdMap.get(file.path);
              if (!imageId) return null;

              return (
                <Thumbnail
                  key={imageId}
                  imageId={imageId}
                  filePath={file.path}
                  onDelete={handleDelete}
                  onArchive={handleArchive}
                  features={features}
                  onMetadataChange={handleMetadataChange}
                />
              );
            })}
          </ul>
        </aside>
        {features?.archive && archivedFiles.length > 0 && (
          <div className="mt-4 flex items-center justify-start gap-2 text-gray-500">
            <Archive size={16} />
            <span className="text-sm">{archivedFiles.length} archived</span>
          </div>
        )}
      </section>

      {/* Camera Modal */}
      <CameraModalWrapper
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        path={path}
        onPhotoCaptured={async (filePath: string) => {
          // Reload files to include newly captured photos
          try {
            const [activeResult, archivedResult] = await Promise.all([
              enhancedImageStore.getActiveImages(),
              enhancedImageStore.getArchivedImages()
            ]);

            let allImages: ImageMetadata[] = [];
            if (activeResult.ok) {
              allImages = [...allImages, ...activeResult.val];
            }
            if (archivedResult.ok) {
              allImages = [...allImages, ...archivedResult.val];
            }

            const pathImages = allImages.filter(img =>
              img.imagePath.startsWith(path)
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
            onChange?.(existingFiles.filter(f => !f.isArchived));
          } catch (error) {
            console.error("Error reloading files after camera capture:", error);
          }
          setIsCameraOpen(false);
        }}
        maxPhotos={maxFiles}
      />

      {isUploading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
            <p className="mt-4">Uploading images...</p>
          </div>
        </div>
      )}
    </>
  );
};