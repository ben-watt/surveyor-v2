import { X, Archive, Pencil } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { FileWithPath, useDropzone } from "react-dropzone";
import { imageUploadStore } from "@/app/home/clients/ImageUploadStore";
import { ImageMetadataDialog } from "./ImageMetadataDialog";
import { useDynamicDrawer } from "@/app/home/components/Drawer";
import Resizer from "react-image-file-resizer";
import { join } from "path";
import { imageMetadataStore } from "../../clients/Database";

interface DropZoneInputImageProps {
  path: string;
  maxFiles?: number;
  minFiles?: number;
  onChange?: (filePaths: DropZoneInputFile[]) => void;
  features?: {
    archive?: boolean;
    metadata?: boolean;
  };
}

export type { DropZoneInputImageProps };

interface ThumbnailProps {
  file: DropZoneInputFile;
  onDelete: (file: FileWithPath) => void;
  onArchive: (file: FileWithPath) => void;
  path: string;
  features?: DropZoneInputImageProps['features'];
}

export type DropZoneInputFile = FileWithPath & { preview: string; isArchived: boolean, hasMetadata: boolean };

const Thumbnail = ({ file, onDelete, onArchive, path, features }: ThumbnailProps) => {
  const { openDrawer, closeDrawer } = useDynamicDrawer();
  const [hasMetadata, setHasMetadata] = useState(false);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);

  useEffect(() => {
    if (!features?.metadata) return;
    
    const checkMetadata = async () => {
      try {
        const imagePath = join(path, file.name);
        const metadataResult = await imageMetadataStore.get(imagePath);
        setHasMetadata(!!metadataResult && !!metadataResult.caption);
      } catch (error) {
        console.error("Error checking metadata:", error);
      } finally {
        setIsLoadingMetadata(false);
      }
    };

    checkMetadata();
  }, [file, path, features?.metadata]);

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
    openDrawer({
      id: `image-metadata-${file.name}`,
      title: `Image Metadata`,
      description: `${file.path}`,
      content: (
        <ImageMetadataDialog
          file={file}
          path={path}
          onClose={() => {
            closeDrawer();
            // Refresh metadata status after dialog closes
            const checkMetadata = async () => {
              try {
                const imagePath = join(path, file.name);
                const metadataResult = await imageMetadataStore.get(imagePath);
                setHasMetadata(!!metadataResult && !!metadataResult.caption);
              } catch (error) {
                console.error("Error checking metadata:", error);
              }
            };
            checkMetadata();
          }}
        />
      ),
    });
  };
  
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
              onArchive(file);
            }}
          >
            <Archive size={16} />
          </button>
        </aside>
      )}
    </div>
  );
};

export const DropZoneInputImage = (props: DropZoneInputImageProps) => {
  const [files, setFiles] = useState<DropZoneInputFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const features = props.features ?? { archive: false, metadata: false };

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
        console.debug("[DropZoneInputImage] loadExistingFiles", result);
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
                  isArchived: fileData.path.includes("archived"),
                  hasMetadata: false // This will be managed by Thumbnail now
                }) as DropZoneInputFile;
              }
              return null;
            })
          );
          
          const validFiles = existingFiles.filter(
            (file): file is DropZoneInputFile => file !== null
          );

          setFiles(validFiles);
          props.onChange?.(validFiles);
        }
      } catch (error) {
        console.error("Error loading existing files:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingFiles();
  }, [props.path]);

  const { getRootProps, getInputProps } = useDropzone({
    maxFiles: props.maxFiles,
    onDrop: async (acceptedFiles: FileWithPath[]) => {

      const processedFiles = await Promise.all(
        acceptedFiles.map(async (file) => {
          const resizedFile = await resizeImage(file);
          return Object.assign(resizedFile, {
            preview: URL.createObjectURL(resizedFile),
            path: join(props.path, file.name),
            isArchived: false,
            hasMetadata: false
          }) as DropZoneInputFile;
        })
      );

      // Replace the files with the new ones if the file name matches
      const deDupedFiles = processedFiles.filter((file) => !files.some((f) => f.name === file.name));
      setFiles((prevFiles) => [...prevFiles, ...deDupedFiles]);
      
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
          ...files,
          ...deDupedFiles,
        ]);
      }
    },
  });

  const handleDelete = async (file: FileWithPath) => {
    const filePath = join(props.path, file.name);
    try {
      await imageUploadStore.remove(filePath);
      setFiles(files.filter((f) => f !== file));
      props.onChange?.(files.filter((f) => f !== file));
    } catch (error) {
      console.error("Error removing file:", error);
    }
  };

  const handleArchive = async (file: FileWithPath) => {
    const filePath = join(props.path, file.name);
    try {
      await imageUploadStore.archive(filePath);
      // Mark file as archived
      setFiles(files.map((f) => f === file ? { ...f, isArchived: true } : f));
      props.onChange?.(files.filter((f) => f !== file));
    } catch (error) {
      console.error("Error archiving file:", error);
    }
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
    <section className="container border border-gray-300 rounded-md p-4 bg-gray-100">
      <div {...getRootProps({ className: "dropzone" })}>
        {props.maxFiles !== activeFiles.length && (
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
          {activeFiles.map((file: DropZoneInputFile) => (
            <Thumbnail
              key={file.name}
              file={file}
              onDelete={handleDelete}
              onArchive={handleArchive}
              path={props.path}
              features={features}
            />
          ))}
        </ul>
      </aside>
      {features.archive && archivedFiles.length > 0 && (
        <div className="mt-4 flex items-center justify-start gap-2 text-gray-500">
          <Archive size={16} />
          <span className="text-sm">{archivedFiles.length} archived</span>
        </div>
      )}
    </section>
  );
};