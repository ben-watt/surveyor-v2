import { X, Archive, Pencil } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { FileWithPath, useDropzone } from "react-dropzone";
import { imageUploadStore } from "@/app/home/clients/ImageUploadStore";
import { imageUploadStatusStore } from "./imageUploadStatusStore";
import { useImageUploadStatus } from "./useImageUploadStatus";
import { ImageMetadataDialog } from "./ImageMetadataDialog";
import { useDynamicDrawer } from "@/app/home/components/Drawer";
import Resizer from "react-image-file-resizer";
import { join } from "path";

interface DropZoneInputImageProps {
  path: string;
  maxFiles?: number;
  minFiles?: number;
  onChange?: (filePaths: string[]) => void;
}

export type { DropZoneInputImageProps };

interface ThumbnailProps {
  file: DropZoneInputFile;
  onDelete: (file: FileWithPath) => void;
  onArchive: (file: FileWithPath) => void;
  onEdit: (file: FileWithPath) => void;
  isUploading?: boolean;
}

const Thumbnail = ({ file, onDelete, onArchive, onEdit, isUploading }: ThumbnailProps) => {
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
  
  return (
    <div className="relative rounded-md overflow-hidden" key={file.name}>
      <div>
        <img
          className="aspect-[3/2] object-cover"
          src={file.preview}
          alt={file.name}
          onLoad={() => {
            URL.revokeObjectURL(file.preview);
          }}
        />
      </div>
      <aside className="absolute top-0 left-0 right-0 bottom-0 from-black/70 to-black/0 bg-gradient-to-b"></aside>
      <aside className="absolute top-0 left-9 right-9 text-white p-2 text-xs">
        <p className="truncate">{file.name}</p>
        <p className="text-background/50 text-[0.6rem]">
          {toFileSize(file.size)[0]} {toFileSize(file.size)[1]}
        </p>
        {isUploading && <p className="text-yellow-400">Uploading...</p>}
      </aside>
      <aside className="absolute top-0 left-0">
        <button
          className="text-white p-1 m-2 rounded-full bg-black/50 transition border border-white/50 hover:border-white"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete(file);
          }}
        >
          <X />
        </button>
      </aside>
      <aside className="absolute top-0 right-0">
        <button
          className="text-white p-1 m-2 rounded-full bg-black/50 transition border border-white/50 hover:border-white"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onEdit(file);
          }}
        >
          <Pencil size={16} />
        </button>
      </aside>
      <aside className="absolute bottom-0 left-0">
        <button
          className="text-white p-1 m-2 rounded-full bg-black/50 transition border border-white/50 hover:border-white"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onArchive(file);
          }}
        >
          <Archive size={16} />
        </button>
      </aside>
    </div>
  );
};

type DropZoneInputFile = FileWithPath & { preview: string; isArchived: boolean };

export const DropZoneInputImage = (props: DropZoneInputImageProps) => {
  const [files, setFiles] = useState<DropZoneInputFile[]>([]);
  const [archivedFiles, setArchivedFiles] = useState<DropZoneInputFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isUploading } = useImageUploadStatus([props.path]);
  const { openDrawer, closeDrawer } = useDynamicDrawer();

  const resizeImage = useCallback((file: File): Promise<File> => {
    return new Promise((resolve) => {
      Resizer.imageFileResizer(
        file,
        500, // maxWidth
        400, // maxHeight (for 3:2 aspect ratio)
        "JPEG", // output format
        100, // quality
        0, // rotation
        (uri) => {
          // Convert the base64 URI to a File object
          fetch(uri as string)
            .then((res) => res.blob())
            .then((blob) => {
              const resizedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(resizedFile);
            });
        },
        "base64",
      );
    });
  }, []);

  // Load existing files
  useEffect(() => {
    const loadExistingFiles = async () => {
      try {
        const result = await imageUploadStore.list(props.path);
        if (result.ok) {
          const existingFiles = await Promise.all(
            result.val.map(async (item) => {
              const fileResult = await imageUploadStore.get(item.fullPath);
              if (fileResult.ok) {
                const fileData = fileResult.val;
                const file = new File(
                  [fileData.file],
                  fileData.path.split("/").pop() || "",
                  {
                    type: fileData.file.type,
                  }
                );
                return Object.assign(file, {
                  preview: fileData.href,
                  path: fileData.path,
                  isArchived: fileData.path.includes("archived")
                }) as DropZoneInputFile;
              }
              return null;
            })
          );
          
          const validFiles = existingFiles.filter(
            (file): file is DropZoneInputFile => file !== null && !file.isArchived
          );

          const archivedFiles = existingFiles.filter(
            (file): file is DropZoneInputFile => file !== null && file.isArchived
          );

          setFiles(validFiles);
          setArchivedFiles(archivedFiles);
          props.onChange?.(validFiles.map((f) => join(props.path, f.name)));
        }
      } catch (error) {
        console.error("Error loading existing files:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingFiles();
  }, [props.path, props.onChange]);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "image/*": [
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".bmp",
        ".tiff",
        ".ico",
        ".webp",
      ],
    },
    maxFiles: props.maxFiles,
    onDrop: async (acceptedFiles: FileWithPath[]) => {
      const processedFiles = await Promise.all(
        acceptedFiles.map(async (file) => {
          const resizedFile = await resizeImage(file);
          return Object.assign(resizedFile, {
            preview: URL.createObjectURL(resizedFile),
            path: file.path,
            isArchived: false,
          }) as DropZoneInputFile;
        })
      );

      setFiles((prevFiles) => [...prevFiles, ...processedFiles]);
      
      // Upload each file
      for (const file of processedFiles) {
        const filePath = join(props.path, file.name);

        await imageUploadStore.create({
          id: filePath,
          path: filePath,
          file: file,
          href: file.preview,
          metadata: {
            filename: file.name,
            size: file.size.toString(),
            type: file.type,
          },
        });

        props.onChange?.([
          ...files.map((f) => join(props.path, f.name)),
          ...processedFiles.map((f) => join(props.path, f.name)),
        ]);
      }
    },
  });

  const handleDelete = async (file: FileWithPath) => {
    const filePath = join(props.path, file.name);
    try {
      await imageUploadStore.remove(filePath);
      setFiles(files.filter((f) => f !== file));
      props.onChange?.(files.filter((f) => f !== file).map((f) => join(props.path, f.name)));
    } catch (error) {
      console.error("Error removing file:", error);
    }
  };

  const handleArchive = async (file: FileWithPath) => {
    const filePath = join(props.path, file.name);
    try {
      await imageUploadStore.archive(filePath);
      setFiles(files.filter((f) => f !== file));
      setArchivedFiles((prev) => [...prev, { ...file, isArchived: true, preview: "" }]);
      props.onChange?.(files.filter((f) => f !== file).map((f) => join(props.path, f.name)));
    } catch (error) {
      console.error("Error archiving file:", error);
    }
  };

  const handleEdit = (file: FileWithPath) => {
    openDrawer({
      id: `image-metadata-${file.name}`,
      title: `Image Metadata`,
      description: `${file.path}`,
      content: (
        <ImageMetadataDialog
          file={file}
          path={props.path}
          onClose={() => closeDrawer()}
        />
      ),
    });
  };

  if (isLoading) {
    return (
      <div className="container border border-gray-300 rounded-md p-4 bg-gray-100">
        Loading...
      </div>
    );
  }

  return (
    <section className="container border border-gray-300 rounded-md p-4 bg-gray-100">
      <div {...getRootProps({ className: "dropzone" })}>
        {props.maxFiles !== files.length && (
          <div className="flex flex-col items-center justify-center">
            <input {...getInputProps()} />
            <p className="text-sm text-gray-500 m-2">
              Drag & drop files, or{" "}
              <u className="cursor-pointer">fetch from device</u>
            </p>
          </div>
        )}
      </div>
      <aside>
        <ul
          className={`${
            props.maxFiles && props.maxFiles > 1
              ? "grid grid-cols-2 gap-2"
              : "flex flex-wrap gap-2 justify-center"
          }`}
        >
          {files.map((file: DropZoneInputFile) => (
            <Thumbnail
              key={file.name}
              file={file}
              onDelete={handleDelete}
              onArchive={handleArchive}
              onEdit={handleEdit}
              isUploading={isUploading}
            />
          ))}
        </ul>
      </aside>
      {archivedFiles.length > 0 && (
        <div className="mt-4 flex items-center justify-start gap-2 text-gray-500">
          <Archive size={16} />
          <span className="text-sm">{archivedFiles.length} archived</span>
        </div>
      )}
    </section>
  );
};