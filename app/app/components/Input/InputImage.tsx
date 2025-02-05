/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable react-hooks/exhaustive-deps */
// 1. Group and organize imports
// React and FilePond
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { FilePond, registerPlugin } from "react-filepond";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import FilePondPluginImageExifOrientation from "filepond-plugin-image-exif-orientation";
import FilePondPluginFilePoster from "filepond-plugin-file-poster";
import FilePondPluginImageResize from "filepond-plugin-image-resize";
import FilePondPluginImageTransform from "filepond-plugin-image-transform";
import {
  ProcessServerConfigFunction,
  LoadServerConfigFunction,
  RestoreServerConfigFunction,
  FetchServerConfigFunction,
  RemoveServerConfigFunction,
  FilePondInitialFile,
  FilePondFile,
} from "filepond";

// Form handling
import {
  FieldValues,
  useController,
  UseControllerProps,
  useFormContext,
} from "react-hook-form";
import { ErrorMessage } from "@hookform/error-message";

// Components
import { Label } from "./Label";
import InputError from "../InputError";

// Styles
import "filepond/dist/filepond.min.css";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";
import "filepond-plugin-file-poster/dist/filepond-plugin-file-poster.css";

// Utils
import { join } from "path";
import { imageUploadStore } from "@/app/app/clients/ImageUploadStore";

// 2. Register plugins at the top level
registerPlugin(
  FilePondPluginFilePoster,
  FilePondPluginImagePreview,
  FilePondPluginImageExifOrientation,
  FilePondPluginImageResize,
  FilePondPluginImageTransform
);

// 3. Type definitions
interface InputImageProps {
  id?: string;
  path: string;
  onChange?: (fileSources: string[]) => void;
  minNumberOfFiles?: number;
  maxNumberOfFiles?: number;
}

interface CreateServerConfigProps {
  path: string;
}

// 4. Extract server configuration to a separate function for better readability
const createServerConfig = ({ path }: CreateServerConfigProps) => {
  return {
    process: ((fieldName, file, metadata, load, error, progress, abort) => {
      console.debug("[FilePond Process] Uploading file:", file);

      // We're using the transform plugin to create a thumbnail and medium version of the image
      // So we need to upload the medium version if the file is an array
      let fileToUpload = file;
      if (Array.isArray(file)) {
        fileToUpload = file.find((x) => x.name == "medium_")?.file ?? file[0];
      }

      console.debug("[FilePond Process] Uploading file:", fileToUpload);

      const fullPath = join(path, fileToUpload.name);

      const upload = async () => {
        await imageUploadStore.create({
          id: fullPath,
          path: fullPath,
          file: fileToUpload,
          href: "",
          metadata: {
            ...metadata,
            filename: fileToUpload.name,
          },
        });

        console.debug("[FilePond Process] Upload queued:", fullPath);

        progress(true, 0, 100);

        console.debug("[FilePond Process] Syncing images");
        imageUploadStore.sync();
        return fullPath;
      };

      upload()
        .then((id) => {
          load(fileToUpload.name);
          console.debug("[FilePond Process] Upload queued:", id);
        })
        .catch((err) => {
          error("Failed to queue upload");
          console.error("[FilePond Process] Upload failed:", err);
        });

      return {
        abort: () => {
          imageUploadStore.remove(fullPath).catch(console.error);
          abort();
        },
      };
    }) as ProcessServerConfigFunction,
    load: ((source, load, error, progress, abort, headers) => {
      try {
        imageUploadStore.get(source).then((result) => {
          if (!result.ok) return;
          load(result.val.file);
        });
      } catch (err) {
        console.error("[Load Err] Could not load image:", err);
        error("Could not load image");
      }
    }) as LoadServerConfigFunction,
    restore: ((uniqueFileId, load, error, progress, abort, headers) => {
      console.debug(
        "[FilePond Restore] Restoring file has not been implemented:",
        uniqueFileId
      );
    }) as RestoreServerConfigFunction,
    fetch: ((url, load, error, progress, abort, headers) => {
      console.debug("[FilePond Fetch] Fetching file:", url);
      try {
        imageUploadStore.get(url).then((result) => {
          if (!result.ok) return;
          load(result.val.file);
        });
      } catch (err) {
        console.error("[Fetch Err] Could not fetch file:", err);
        error("Could not fetch file");
      }
    }) as FetchServerConfigFunction,
    revert: null,
    remove: ((source, load, error) => {
      console.debug("[FilePond Remove] Removing file:", source);
      imageUploadStore.remove(source).catch(console.error);
      load();
    }) as RemoveServerConfigFunction,
  };
};

// 5. Export the component
export const InputImage = ({
  id,
  path,
  onChange,
  minNumberOfFiles = 0,
  maxNumberOfFiles = 10,
}: InputImageProps) => {
  const [initialFiles, setInitialFiles] = React.useState<FilePondInitialFile[]>(
    []
  );
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const filepond = useRef<FilePond | null>(null);

  const loadInitialFiles = async (): Promise<void> => {
    console.debug(
      "[InputImage][InputImage][%s] loadInitialFiles for path",
      path
    );

    try {
      const trailingPath = path.endsWith("/") ? path : path + "/";
      const images = await imageUploadStore.list(trailingPath);
      if (!images.ok) return;

      console.debug("[InputImage][InputImage][%s] images", path, images.val);

      const filePondFiles = await Promise.all(
        images.val.map(async (image) => {
          const result = await imageUploadStore.get(image.fullPath);
          if (!result.ok) return null;

          console.debug("[InputImage][InputImage][%s] get image", path, result);

          const fileData = result.val;

          // ToDo could review adding limbo here for the local files that haven't been uploaded it gives
          // the user the ability to try the upload again.
          // If href is blank I could create a URL to the file locally.
          return {
            source: result.val.path,
            options: {
              type: "local",
              metadata: {
                filename: fileData.path.split("/").pop() || "",
                poster: fileData.href,
                status: fileData.syncStatus,
                uploadId: image.fullPath,
              },
              file: {
                name: fileData.path.split("/").pop() || "",
                size: fileData.file.size,
                type: fileData.file.type,
              },
            },
          } as FilePondInitialFile;
        })
      );

      console.debug(
        "[InputImage][InputImage][%s] filePondFiles",
        path,
        filePondFiles
      );
      setInitialFiles(filePondFiles.filter((file) => file !== null));
      setHasLoaded(true);
      onChange?.(
        filePondFiles.filter((file) => file !== null).map((file) => file.source)
      );
    } catch (error) {
      console.error(
        "[InputImage][InputImage][%s] Error loading files:",
        path,
        error
      );
      setInitialFiles([]);
      setHasLoaded(true);
      onChange?.([]);
    }
  };

  useEffect(() => {
    loadInitialFiles();
  }, [path]);

  return (
    <div className="relative">
      <FilePond
        ref={filepond}
        name={id || "filepond"}
        allowMultiple={true}
        maxFiles={maxNumberOfFiles}
        allowRevert={true}
        acceptedFileTypes={["image/*"]}
        instantUpload={true}
        allowImagePreview={true}
        imagePreviewHeight={100}
        allowImageResize={true}
        imageResizeTargetWidth={1200}
        imageResizeTargetHeight={1200}
        imageResizeMode="contain"
        imageTransformOutputQuality={80}
        imageTransformOutputMimeType="image/jpeg"
        allowImageTransform={true}
        imageTransformVariants={{
          thumbnail_: (transforms: any) => {
            transforms.resize = {
              size: {
                width: 200,
                height: 200,
              },
            };
            return transforms;
          },
          medium_: (transforms: any) => {
            transforms.resize = {
              size: {
                width: 800,
                height: 800,
              },
            };
            return transforms;
          },
        }}
        credits={false}
        onremovefile={(err, file) => {
          // Cleanup object URL if it exists
          if (
            typeof file.source === "string" &&
            file.source.startsWith("blob:")
          ) {
            URL.revokeObjectURL(file.source);
          }

          // Try to cancel upload if it's still pending
          const uploadId = file.getMetadata("uploadId");

          if (uploadId) {
            imageUploadStore.remove(uploadId).catch(console.error);
          }

          setInitialFiles((prev) =>
            prev.filter((f) => {
              return f.options?.metadata?.uploadId !== uploadId;
            })
          );
        }}
        onupdatefiles={(files) => {
          // Convert file names to full paths to update the form
          // Issue where this results in the form having a png file but
          // the uploaded file is a jpg file.
          // Hacked in a fix for now.
          const fileSources = files.map((file) => join(path, file.file.name.replace(".png", ".jpg").replace(".jpeg", ".jpg")));
          onChange?.(fileSources);
        }}
        onaddfile={(err, file) => {
          console.debug("[InputImage][InputImage][%s] onaddfile", path, file);
        }}
        onprocessfile={(err, file) => {
          console.debug("[InputImage][InputImage][%s] onprocessfile", path, file);
        }}
        server={createServerConfig({ path })}
        files={initialFiles}
        labelTapToRetry="Tap to retry upload"
        labelFileProcessing="Uploading..."
        labelFileProcessingComplete="Upload complete"
        labelFileProcessingAborted="Upload cancelled"
        labelFileLoadError="Error loading file"
        labelFileProcessingError={(error) =>
          error?.body || "Upload failed, tap to retry"
        }
      />
    </div>
  );
};

// This makes a huge difference in behaviour it solves
// the problem of re-renders and the latest uplaods disappearing
const MemoizedInputImage = React.memo(InputImage);

// Add this type near other interfaces
interface RhfInputImageProps extends InputImageProps {
  labelText?: string;
  rhfProps: UseControllerProps;
}

export const RhfInputImage = ({
  path,
  labelText,
  rhfProps,
  ...props
}: RhfInputImageProps) => {
  const { setValue, formState, register } = useFormContext();

  const onChange = (fileSources: string[]) => {
    setValue(rhfProps.name, fileSources);
  }

  useEffect(() => {
    register(rhfProps.name);
  }, [rhfProps.name, register]);

  return (
    <div>
      {labelText && <Label text={labelText} />}
      <MemoizedInputImage
        id={path}
        path={path}
        onChange={onChange}
        {...props}
      />
      <ErrorMessage
        errors={formState.errors}
        name={rhfProps.name}
        render={({ message }) => InputError({ message })}
      />
    </div>
  );
};

export const InputImageComponent = {
  image: InputImage,
  rhfImage: RhfInputImage,
};

export default InputImageComponent;
