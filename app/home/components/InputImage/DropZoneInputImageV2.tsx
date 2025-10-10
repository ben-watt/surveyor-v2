import { Archive } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FileWithPath, useDropzone } from "react-dropzone";
import { enhancedImageStore } from "@/app/home/clients/enhancedImageMetadataStore";
import { ImageMetadata } from "@/app/home/clients/Database";
import { resizeImage } from "@/app/home/utils/imageResizer";
import { generateImageHash } from "@/app/home/utils/imageHashUtils";
import toast from "react-hot-toast";
import { Thumbnail } from "./Thumbnail";
import { joinPath, sanitizeFileName } from "@/app/home/utils/path";

// Path helpers are provided by utils/path

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

 

export const DropZoneInputImageV2 = ({
  path,
  maxFiles,
  minFiles,
  onChange,
  features = { archive: false, metadata: false }
}: DropZoneInputImageV2Props) => {
  const [files, setFiles] = useState<DropZoneInputFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const activeCount = useMemo(() => files.filter(f => !f.isArchived).length, [files]);


  // Map of imagePath -> imageId for tracking
  const [pathToIdMap, setPathToIdMap] = useState<Map<string, string>>(new Map());

  // Unified loader to populate files + mapping for the given path
  const refreshFiles = useCallback(async (): Promise<void> => {
    try {
      const [activeResult, archivedResult] = await Promise.all([
        enhancedImageStore.getActiveImages(),
        enhancedImageStore.getArchivedImages()
      ]);

      let allImages: ImageMetadata[] = [];
      if (activeResult.ok) allImages = allImages.concat(activeResult.val);
      if (archivedResult.ok) allImages = allImages.concat(archivedResult.val);

      // Deduplicate by id
      const byId = new Map<string, ImageMetadata>();
      for (const img of allImages) {
        if (!byId.has(img.id)) byId.set(img.id, img);
      }

      // Filter to current path and exclude deleted
      const pathImages = Array.from(byId.values()).filter(img =>
        img.imagePath.startsWith(path) && (img as any).isDeleted !== true
      );

      // Build path->id map and one DropZoneInputFile per path
      const newPathToId = new Map<string, string>();
      const filesByPath = new Map<string, DropZoneInputFile>();
      for (const img of pathImages) {
        if (!filesByPath.has(img.imagePath)) {
          newPathToId.set(img.imagePath, img.id);
          filesByPath.set(img.imagePath, {
            path: img.imagePath,
            isArchived: !!img.isArchived,
            hasMetadata: !!(img.caption || img.notes),
          });
        }
      }

      const nextFiles = Array.from(filesByPath.values());
      setPathToIdMap(newPathToId);
      setFiles(nextFiles);
      onChange?.(nextFiles.filter(f => !f.isArchived));
    } catch (error) {
      console.error("Error loading images:", error);
    }
  }, [path, onChange]);

  // Load existing images for this path
  useEffect(() => {
    (async () => {
      await refreshFiles();
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]); // Intentionally exclude onChange to prevent loops

  const { getRootProps, getInputProps } = useDropzone({
    maxFiles,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.ico', '.webp'],
    },
    onDrop: async (acceptedFiles: FileWithPath[]) => {
      console.log("[DropZoneInputImageV2] Processing files");

      
      const remaining = typeof maxFiles === 'number' ? Math.max(0, maxFiles - activeCount) : acceptedFiles.length;
      const queue = acceptedFiles.slice(0, remaining);
      const skipped = acceptedFiles.length - queue.length;
      if (skipped > 0) {
        toast(`Skipped ${skipped} file(s): max ${maxFiles} images allowed.`);
      }

      for (const originalFile of queue) {
        try {
          // Resize the image first
          const resizedFile = await resizeImage(originalFile);

          // Generate content hash for duplicate detection
          const contentHash = await generateImageHash(resizedFile);

          // Centralized duplicate check via store
          const dupResult = await enhancedImageStore.findDuplicate({ contentHash, pathPrefix: path });
          if (dupResult.ok && dupResult.val) {
            const existingImage = dupResult.val;
            if ((existingImage as any).isDeleted) {
              // Replace the deleted record with this upload (keeps same ID)
              const replaceResult = await enhancedImageStore.replaceDeletedImage(
                existingImage.id,
                resizedFile,
                joinPath(path, sanitizeFileName(resizedFile.name)),
                {
                  onProgress: (progress: number) => {
                    console.debug(`Upload progress for ${resizedFile.name}: ${progress}%`);
                  }
                }
              );
              if (replaceResult.ok) {
                toast.success(`Replaced deleted image: ${existingImage.fileName ?? existingImage.imagePath}`);
              } else {
                toast.error(`Failed to replace deleted image: ${replaceResult.val.message}`);
              }
              continue;
            }
            if (existingImage.isArchived) {
              const restoreResult = await enhancedImageStore.unarchiveImage(existingImage.id);
              if (restoreResult.ok) {
                toast(`Restored archived image: ${existingImage.fileName ?? existingImage.imagePath}`, { duration: 3000 });
              } else {
                toast.error(`Cannot restore image: ${restoreResult.val.message}`);
              }
            } else {
              toast(`Image already exists: ${existingImage.fileName ?? existingImage.imagePath}`, { duration: 3000 });
            }
            continue; // Skip this file
          }

          // Upload the new file with original filename
          const uploadResult = await enhancedImageStore.uploadImage(
            resizedFile,
            joinPath(path, sanitizeFileName(resizedFile.name)),
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
      await refreshFiles();
    },
  });

  const handleDelete = async (filePath: string) => {
    try {
      const imageId = pathToIdMap.get(filePath);
      if (imageId) {
        await enhancedImageStore.markDeleted(imageId);
      }
      await refreshFiles();
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
      await refreshFiles();
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
              <input {...getInputProps({ capture: 'environment' })} />
              <p className="text-sm text-gray-500 m-2 text-center">
                Drag & drop files, {" or "}
                <u className="cursor-pointer">fetch from device</u>
                {" or "}
                <span className="text-sm text-gray-500 underline cursor-pointer hover:text-gray-700">
                  take photo
                </span>
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
