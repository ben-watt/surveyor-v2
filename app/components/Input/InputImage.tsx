// 1. Group and organize imports
// React and FilePond
import React, { useEffect } from 'react';
import { FilePond, registerPlugin } from 'react-filepond';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
import FilePondPluginImageExifOrientation from 'filepond-plugin-image-exif-orientation';
import FilePondPluginFilePoster from 'filepond-plugin-file-poster';
import {
    ProcessServerConfigFunction,
    LoadServerConfigFunction,
    RestoreServerConfigFunction,
    FetchServerConfigFunction,
    RemoveServerConfigFunction,
    FileStatus
} from 'filepond';

// AWS Amplify
import { TransferProgressEvent, uploadData, getUrl, remove, list } from "aws-amplify/storage";

// Form handling
import { FieldValues, useController, UseControllerProps } from "react-hook-form";
import { ErrorMessage } from "@hookform/error-message";

// Components
import { Label } from "./Label";
import InputError from "../InputError";

// Styles
import 'filepond/dist/filepond.min.css';
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css';
import 'filepond-plugin-file-poster/dist/filepond-plugin-file-poster.css';

// Utils
import { join } from 'path';

// 2. Register plugins at the top level
registerPlugin(
    FilePondPluginFilePoster,
    FilePondPluginImagePreview,
    FilePondPluginImageExifOrientation
);

// 3. Type definitions
interface InputImageProps {
    id?: string;
    path: string;
    initFiles?: string[];
    onUploaded?: (file: { name: string }) => void;
    onDeleted?: (file: { name: string }) => void;
    minNumberOfFiles?: number;
    maxNumberOfFiles?: number;
}

interface InputImagePropsWithRegister extends InputImageProps {
    rhfProps: UseControllerProps<FieldValues>;
    labelText?: string;
}

interface CreateServerConfigProps {
    path: string;
}

// 4. Extract server configuration to a separate function for better readability
const createServerConfig = ({ path }: CreateServerConfigProps) => ({
    process: ((fieldName, file, metadata, load, error, progress, abort) => {
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
    }) as ProcessServerConfigFunction,
    load: ((source, load, error, progress, abort, headers) => {
        try {
            getUrl({ path: source })
            .then(({ url }) => {
                const finalUrl = source.includes('amazonaws.com') ? source : url.href;
                fetch(finalUrl)
                .then(response => {
                    if (!response.ok) throw new Error('Network response was not ok');
                    return response;
                })
                .then((response) => {
                    response.blob().then((value) => load(value));
                });
            });
        } catch (err) {
            console.error("[Load Err] Could not load image:", err);
            error('Could not load image');
        }
    }) as LoadServerConfigFunction,
    restore: ((uniqueFileId, load, error, progress, abort, headers) => {
        try {
            getUrl({ path: uniqueFileId })
            .then(({ url }) => {
                fetch(url.href)
                .then(response => {
                    if (!response.ok) throw new Error('Network response was not ok');
                    return response;
                })
                .then((response) => {
                    response.blob().then((value) => load(value as File));
                });
            });
        } catch (err) {
            console.error("[Restore Err] Could not restore file:", err);
            error('Could not restore file');
        }
    }) as RestoreServerConfigFunction,
    fetch: ((url, load, error, progress, abort, headers) => {
        try {
            fetch(url)
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response;
            })
            .then((response) => {
                response.blob().then((value) => load(value));
            });
        } catch (err) {
            console.error("[Fetch Err] Could not fetch file:", err);
            error('Could not fetch file');
        }
    }) as FetchServerConfigFunction,
    revert: null,
    remove: ((source, load, error) => {
        console.debug("[FilePond Remove] Removing file:", source);
        remove({
            path: path,
        }).then(
            () => load()
        )
    }) as RemoveServerConfigFunction
});

// 5. Export the component
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
            setPondFiles(current => current.filter(f => f.source !== path));
            onDeleted?.({ name: path.split('/').pop() || '' });
        } catch (error) {
            console.error("[InputImage] Failed to delete file:", error);
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
            server={createServerConfig({ path })}
            files={pondFiles}
            onupdatefiles={(fileItems) => {
                console.debug('[FilePond] Files updated:', fileItems);

                // Get the current files in pond
                const currentFiles = fileItems.map(fileItem => fileItem.source);
                
                // Find removed files by comparing with previous pondFiles
                pondFiles.forEach(prevFile => {
                    if (!currentFiles.includes(prevFile.source)) {
                        console.debug('[FilePond] File removed:', prevFile.source);
                        onDeleted?.({ name: prevFile.source.split('/').pop() || '' });
                    }
                });

                // Find new files and trigger onUploaded
                fileItems.forEach(fileItem => {
                    if (fileItem.status === FileStatus.PROCESSING_COMPLETE) {
                        const fileName = fileItem.filename || fileItem.file.name;
                        console.debug('[FilePond] File uploaded:', fileName);
                        onUploaded?.({ name: fileName });
                    }
                });

                // Update the pondFiles state
                setPondFiles(fileItems.map(fileItem => ({
                    source: fileItem.source
                })));
            }}
            labelFileProcessingError={(error) => {
                return error?.body || 'Upload failed';
            }}
        />
    );
};

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