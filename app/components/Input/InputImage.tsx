// Import React FilePond
import React, { useEffect } from 'react';
import { FilePond, registerPlugin } from 'react-filepond';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
import { TransferProgressEvent, uploadData, getUrl, remove, list } from "aws-amplify/storage";
import { v4 as uuidv4 } from 'uuid';
import {
  FieldValues,
  useController,
  UseControllerProps,
} from "react-hook-form";
import { Label } from "./Label";
import { ErrorMessage } from "@hookform/error-message";
import InputError from "../InputError";

// Import FilePond styles
import 'filepond/dist/filepond.min.css';
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css';

import FilePondPluginImageExifOrientation from 'filepond-plugin-image-exif-orientation';

import FilePondPluginFilePoster from 'filepond-plugin-file-poster';
import 'filepond-plugin-file-poster/dist/filepond-plugin-file-poster.css';
import { join } from 'path';

// Register the plugin with FilePond
registerPlugin(FilePondPluginFilePoster);
registerPlugin(FilePondPluginImagePreview);
registerPlugin(FilePondPluginImageExifOrientation);

interface InputImageProps {
    id?: string;
    path: string;
    initFiles?: string[];
    onUploaded?: (file: { name: string }) => void;
    onDeleted?: (file: { name: string }) => void;
    minNumberOfFiles?: number;
    maxNumberOfFiles?: number;
}

export const InputImage = ({ 
    id,
    path,
    onUploaded,
    onDeleted,
    minNumberOfFiles = 0,
    maxNumberOfFiles = 10
}: InputImageProps) => {
    const [pondFiles, setPondFiles] = React.useState<any[]>([]);

    useEffect(() => {
        const loadInitialFiles = async () => {
            try {
                // Ensure the path ends with a slash so it matches all subpaths
                const trailingPath = path.endsWith('/') ? path : path + '/';
                const { items } = await list({
                    path: trailingPath,
                    options: {
                        listAll: true
                    }
                });

                console.debug("[InputImage] Fetched existing files:", items);
                
                if (items.length > 0) {
                    const signedUrls = await Promise.all(
                        items.map(async (item, i) => {
                            const filename = item.path.split('/').pop() || '';
                            console.debug('[InputImage] Getting URL for:', item.path);
                            const { url } = await getUrl({
                                path: item.path
                            });
                            console.debug('[InputImage] Got signed URL:', url);
                            return {
                                source: item.path,
                                options: {
                                    type: 'local',
                                    metadata: {
                                        filename,
                                        poster: url.href
                                    },
                                    file: {
                                        name: filename,
                                        size: item.size,
                                        type: 'image/*'
                                    }
                                }
                            };
                        })
                    );
                    console.debug('[InputImage] Setting pond files:', signedUrls);
                    setPondFiles(signedUrls);
                }
            } catch (error) {
                console.error('[InputImage] Error loading files:', error);
            }
        };

        loadInitialFiles();
    }, [path]);

    const handleRemoveFile = async (path: string) => {
        try {
            console.debug("[InputImage] handleRemoveFile", path);
            await remove({
                path: path,
            });
            setPondFiles(current => current.filter(f => f.source !== path));
            onDeleted?.({ name: path.split('/').pop() || '' });
            return true;
        } catch (error) {
            console.error("[InputImage] Failed to delete file:", error);
            return false;
        }
    };

    return (
        <FilePond
            name={id || 'filepond'}
            allowMultiple={true}
            maxFiles={maxNumberOfFiles}
            allowRevert={true}
            acceptedFileTypes={['image/*']}
            instantUpload={true}
            allowImagePreview={true}
            imagePreviewHeight={100}
            server={{
                process: (fieldName, file, metadata, load, error, progress, abort) => {
                        const uploadTask = uploadData({
                            data: file,
                            path: join(path, file.name),
                            options: {
                                onProgress: (p: TransferProgressEvent) => {
                                    progress(true, p.transferredBytes, Math.floor(p.totalBytes || 0))
                                },
                                metadata: {
                                    ...metadata,
                                    filename: file.name
                                }
                            },
                        });

                        uploadTask.result.then((uploadedFile) => {
                            load(file.name);
                            console.debug("[FilePond Process] Upload successful:", uploadedFile);
                        });

                    return {
                        abort: () => {
                            uploadTask.cancel("Upload cancelled");
                        }
                    }
                },
                load: async (source, load, error, progress, abort, headers) => {
                    try {
                        console.debug('[FilePond Load] Loading file from:', source);
                        
                        const url = source.includes('amazonaws.com') 
                            ? source 
                            : (await getUrl({ path: source })).url.href;

                        const response = await fetch(url);
                        if (!response.ok) throw new Error('Network response was not ok');
                        
                        const blob = await response.blob();
                        load(blob);

                        return {
                            abort: () => {
                                // Abort fetch if needed
                            }
                        };
                    } catch (err) {
                        console.error("[Load Err] Could not load image:", err);
                        error('Could not load image');
                    }
                },
                restore: async (uniqueFileId, load, error, progress, abort, headers) => {
                    try {
                        console.debug('[FilePond Restore] Restoring file:', uniqueFileId);
                        
                        const { url } = await getUrl({ path: uniqueFileId });
                        const response = await fetch(url.href);
                        
                        if (!response.ok) throw new Error('Network response was not ok');
                        
                        const blob = await response.blob();
                        load(blob as File);
                        
                        return {
                            abort: () => {
                                // Abort fetch if needed
                            }
                        };
                    } catch (err) {
                        console.error("[Restore Err] Could not restore file:", err);
                        error('Could not restore file');
                    }
                },
                fetch: async (url, load, error, progress, abort, headers) => {
                    try {
                        console.debug('[FilePond Fetch] Fetching file from:', url);
                        
                        const response = await fetch(url);
                        if (!response.ok) throw new Error('Network response was not ok');
                        
                        const blob = await response.blob();
                        load(blob);
                        
                        return {
                            abort: () => {
                                // Abort fetch if needed
                            }
                        };
                    } catch (err) {
                        console.error("[Fetch Err] Could not fetch file:", err);
                        error('Could not fetch file');
                    }
                },
                revert: null,
                remove: (source, load, error) => {
                    console.debug("[FilePond Remove] Removing file:", source);
                    handleRemoveFile(source);
                    load();
                },
            }}
            files={pondFiles}
            onupdatefiles={(fileItems) => {
                console.debug('[FilePond] Files updated:', fileItems);
            }}
            labelFileProcessingError={(error) => {
                return error?.body || 'Upload failed';
            }}
        />
    );
};

interface InputImagePropsWithRegister extends InputImageProps {
    rhfProps: UseControllerProps<FieldValues>;
    labelText?: string;
}

export const RhfInputImage = ({
    path,
    rhfProps,
    labelText,
    ...props
}: InputImagePropsWithRegister) => {
    const { field, formState } = useController(rhfProps);

    const onUploaded = (file: { name: string }) => {
        console.log("[RhfInputImage] onUploaded", file);
        // Initialize as empty array if field.value is undefined
        const currentFiles = Array.isArray(field.value) ? field.value : [];
        const newFile = path + file.name;
        
        // Only add if not already present
        if (!currentFiles.includes(newFile)) {
            field.onChange([...currentFiles, newFile]);
        }
    };

    const onDeleted = (file: { name: string }) => {
        const currentFiles = Array.isArray(field.value) ? field.value : [];
        field.onChange(currentFiles.filter((fk: string) => fk !== path + file.name));
    };

    return (
        <div {...field}>
            {labelText && <Label text={labelText} />}
            <InputImage
                id={path}
                path={path}
                onUploaded={onUploaded}
                onDeleted={onDeleted}
                {...props}
            />
            <ErrorMessage
                errors={formState.errors}
                name={field.name}
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