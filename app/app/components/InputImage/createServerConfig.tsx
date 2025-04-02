import { ProcessServerConfigFunction, LoadServerConfigFunction, RestoreServerConfigFunction, FetchServerConfigFunction, RemoveServerConfigFunction } from "filepond";
import { join } from "path";
import { imageUploadStore } from "../../clients/ImageUploadStore";
import { getCurrentTenantId } from "../../utils/tenant-utils";

interface CreateServerConfigProps {
  path: string;
}

export const createServerConfig = ({ path }: CreateServerConfigProps) => {
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
        const tenantId = await getCurrentTenantId();
        await imageUploadStore.create({
          id: fullPath,
          tenantId: tenantId || "",
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
