import { Archive } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileWithPath, useDropzone } from "react-dropzone";
import { enhancedImageStore } from "@/app/home/clients/enhancedImageMetadataStore";
import { ImageMetadata } from "@/app/home/clients/Database";
import { resizeImage } from "@/app/home/utils/imageResizer";
import { generateImageHash } from "@/app/home/utils/imageHashUtils";
import toast from "react-hot-toast";
import { Thumbnail } from "./Thumbnail";
import { joinPath, sanitizeFileName } from "@/app/home/utils/path";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  value?: DropZoneInputFile[];
  onReorder?: (filePaths: DropZoneInputFile[]) => void;
  enableReorder?: boolean;
  dragHandleAriaLabel?: string;
}

export type DropZoneInputFile = {
  path: string;
  isArchived: boolean;
  hasMetadata: boolean;
  preview?: string;
};

// Memoized sortable thumbnail to avoid unnecessary re-renders
const SortableThumb = React.memo(function SortableThumb({
  filePath,
  imageId,
  enableReorder,
  dragHandleAriaLabel,
  features,
  onDelete,
  onArchive,
  onMetadataChange,
  isSingle,
}: {
  filePath: string;
  imageId: string;
  enableReorder: boolean;
  dragHandleAriaLabel: string;
  features: { archive?: boolean; metadata?: boolean } | undefined;
  onDelete: (filePath: string) => void;
  onArchive: (filePath: string) => void;
  onMetadataChange: (filePath: string) => void;
  isSingle: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: filePath });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: 'none',
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      aria-roledescription="sortable-item"
      className={isSingle ? 'w-full max-w-md' : undefined}
    >
      <div
        aria-label={dragHandleAriaLabel}
        style={{ cursor: enableReorder ? 'grab' as const : 'default' }}
        {...(enableReorder ? { ...attributes, ...listeners } : {})}
      >
        <Thumbnail
          imageId={imageId}
          filePath={filePath}
          onDelete={onDelete}
          onArchive={onArchive}
          features={features}
          onMetadataChange={onMetadataChange}
        />
      </div>
    </li>
  );
});

export const DropZoneInputImageV2 = ({
  path,
  maxFiles,
  minFiles,
  onChange,
  features = { archive: false, metadata: false },
  value,
  onReorder,
  enableReorder = true,
  dragHandleAriaLabel = "Drag to reorder",
}: DropZoneInputImageV2Props) => {
  const [files, setFiles] = useState<DropZoneInputFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const activeCount = useMemo(() => files.filter(f => !f.isArchived).length, [files]);
  const isSingle = maxFiles === 1;


  // Map of imagePath -> imageId for tracking
  const [pathToIdMap, setPathToIdMap] = useState<Map<string, string>>(new Map());

  // Refs to stabilize callback identities
  const pathToIdMapRef = useRef(pathToIdMap);
  const filesRef = useRef(files);
  const activeFilesOrderedRef = useRef<DropZoneInputFile[]>([]);
  const onChangeRef = useRef(onChange);
  const onReorderRef = useRef(onReorder);
  const refreshFilesRef = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => { pathToIdMapRef.current = pathToIdMap; }, [pathToIdMap]);
  useEffect(() => { filesRef.current = files; }, [files]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onReorderRef.current = onReorder; }, [onReorder]);

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
      // If the component is uncontrolled (no value provided) or value is empty, seed parent
      const nextActive = nextFiles.filter(f => !f.isArchived);
      if (!value || value.length === 0) {
        onChange?.(nextActive);
      }
    } catch (error) {
      console.error("Error loading images:", error);
    }
  }, [path, onChange, value]);
  useEffect(() => { refreshFilesRef.current = refreshFiles; }, [refreshFiles]);

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

  const handleDelete = useCallback(async (filePath: string) => {
    try {
      const imageId = pathToIdMapRef.current.get(filePath);
      if (imageId) {
        await enhancedImageStore.markDeleted(imageId);
      }
      await (refreshFilesRef.current?.() ?? Promise.resolve());
      toast.success("Image deleted");
      const ordered = activeFilesOrderedRef.current;
      const next = ordered.filter(f => f.path !== filePath);
      onChangeRef.current?.(next);
      onReorderRef.current?.(next);
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Failed to delete image");
    }
  }, []);

  const handleArchive = useCallback(async (filePath: string) => {
    try {
      const imageId = pathToIdMapRef.current.get(filePath);
      if (imageId) {
        await enhancedImageStore.archiveImage(imageId);
      }
      await (refreshFilesRef.current?.() ?? Promise.resolve());
      toast.success("Image archived");
      const ordered = activeFilesOrderedRef.current;
      const next = ordered.filter(f => f.path !== filePath);
      onChangeRef.current?.(next);
      onReorderRef.current?.(next);
    } catch (error) {
      console.error("Error archiving image:", error);
      toast.error("Failed to archive image");
    }
  }, []);

  const handleMetadataChange = useCallback((filePath: string) => {
    setFiles(prev => prev.map(f => (f.path === filePath ? { ...f, hasMetadata: true } : f)));
  }, []);

  // Compute active files ordering (controlled vs internal)
  const activeFilesInternal = useMemo(() => files.filter(f => !f.isArchived), [files]);
  const activeFilesOrdered = useMemo(() => {
    if (value && Array.isArray(value)) {
      const byPath = new Map(activeFilesInternal.map(f => [f.path, f] as const));
      const ordered = value
        .map(v => byPath.get(v.path))
        .filter(Boolean) as DropZoneInputFile[];
      const leftovers = activeFilesInternal.filter(f => !value.some(v => v.path === f.path));
      return [...ordered, ...leftovers];
    }
    return activeFilesInternal;
  }, [value, activeFilesInternal]);
  useEffect(() => { activeFilesOrderedRef.current = activeFilesOrdered; }, [activeFilesOrdered]);

  // DnD setup
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const source = activeFilesOrderedRef.current;
    const oldIndex = source.findIndex(f => f.path === active.id);
    const newIndex = source.findIndex(f => f.path === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(source, oldIndex, newIndex);
    // Keep internal order in sync for uncontrolled usage
    setFiles(prev => {
      const act = prev.filter(f => !f.isArchived);
      const arc = prev.filter(f => f.isArchived);
      const byPath = new Map(prev.map(f => [f.path, f] as const));
      const reorderedActive = next.map(f => byPath.get(f.path) || f);
      return [...reorderedActive, ...arc];
    });
    onReorderRef.current?.(next);
    onChangeRef.current?.(next);
  }, []);

  const activeFiles = activeFilesOrdered;
  const archivedFiles = files.filter((f) => f.isArchived);
  const featuresStable = useMemo(() => ({
    archive: !!features?.archive,
    metadata: !!features?.metadata,
  }), [features?.archive, features?.metadata]);


  if (isLoading) {
    return (
      <div className="container border border-gray-300 rounded-md p-4 bg-gray-100">
        Loading...
      </div>
    );
  }

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
          {enableReorder ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={activeFiles.map(f => f.path)} strategy={rectSortingStrategy}>
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
                  <SortableThumb
                    key={file.path}
                    filePath={file.path}
                    imageId={imageId}
                    enableReorder={enableReorder}
                    dragHandleAriaLabel={dragHandleAriaLabel}
                    features={featuresStable}
                    onDelete={handleDelete}
                    onArchive={handleArchive}
                    onMetadataChange={handleMetadataChange}
                    isSingle={!!isSingle}
                  />
                );
              })}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
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
                  <div key={imageId} className={isSingle ? 'w-full max-w-md' : undefined}>
                    <Thumbnail
                      imageId={imageId}
                      filePath={file.path}
                      onDelete={handleDelete}
                      onArchive={handleArchive}
                      features={featuresStable}
                      onMetadataChange={handleMetadataChange}
                    />
                  </div>
                );
              })}
            </ul>
          )}
        </aside>
        {features?.archive && archivedFiles.length > 0 && (
          <div className="mt-4 flex items-center justify-start gap-2 text-gray-500">
            <Archive size={16} />
            <span className="text-sm">{archivedFiles.length} archived</span>
          </div>
        )}
      </section>
    </>
  );
};
