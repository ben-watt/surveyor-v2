/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable react-hooks/exhaustive-deps */
// 1. Group and organize imports
// React and FilePond
import React, { useEffect, useMemo } from 'react';
import { FilePond, registerPlugin } from 'react-filepond';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
import FilePondPluginImageExifOrientation from 'filepond-plugin-image-exif-orientation';
import FilePondPluginFilePoster from 'filepond-plugin-file-poster';
import FilePondPluginImageResize from 'filepond-plugin-image-resize';
import FilePondPluginImageTransform from 'filepond-plugin-image-transform';
import {
    ProcessServerConfigFunction,
    LoadServerConfigFunction,
    RestoreServerConfigFunction,
    FetchServerConfigFunction,
    RemoveServerConfigFunction,
    FilePondInitialFile,
    FilePondFile
} from 'filepond';

// AWS Amplify
import { getUrl, remove, list } from "aws-amplify/storage";

// Form handling
import { FieldValues, UseControllerProps, useFormContext } from "react-hook-form";
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
import { useImageUpload } from '@/app/hooks/useImageUpload';
import { db } from '@/app/clients/Dexie';
import { ImageUpload } from '@/app/clients/Dexie';

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

// Add this type near other interfaces
interface ExtendedImageUpload extends ImageUpload {
    progress?: number;
}

// Add this type near other interfaces
interface RhfInputImageProps extends InputImageProps {
    rhfProps: UseControllerProps<FieldValues>;
    labelText?: string;
}

// 4. Extract server configuration to a separate function for better readability
const createServerConfig = ({ path, initialFiles, onCancel }: CreateServerConfigProps & {
    initialFiles: FilePondInitialFile[];
    onCancel: (uploadId: string) => Promise<boolean>;
}) => {
    const { queueUpload, cancelUpload } = useImageUpload();

    return {
        process: ((fieldName, file, metadata, load, error, progress, abort) => {
            console.debug("[FilePond Process] Uploading file:", file);

            // We're using the transform plugin to create a thumbnail and medium version of the image
            // So we need to upload the medium version if the file is an array
            let fileToUpload = file;
            if (Array.isArray(file)) {
                fileToUpload = file.find(x => x.name == "medium_").file ?? file;
            }

            console.debug("[FilePond Process] Uploading file:", fileToUpload);

            const uploadTask = queueUpload(fileToUpload, {
                path: join(path, fileToUpload.name),
                metadata: {
                    ...metadata,
                    filename: fileToUpload.name
                },
                onProgress: (percentage) => {
                    progress(true, percentage, 100);
                }
            });

            uploadTask.then((id) => {
                // Store the upload ID in the file metadata
                metadata.uploadId = id;
                load(fileToUpload.name);
                console.debug("[FilePond Process] Upload queued:", id);
            }).catch((err) => {
                error('Failed to queue upload');
                console.error("[FilePond Process] Upload failed:", err);
            });

            return {
                abort: () => {
                    // If we have an upload ID, try to cancel it
                    if (metadata.uploadId) {
                        cancelUpload(metadata.uploadId).then((cancelled) => {
                            if (cancelled) {
                                console.debug("[FilePond Process] Upload cancelled:", metadata.uploadId);
                            }
                        });
                    }
                    abort();
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
            console.debug("[FilePond Restore] Restoring file:", uniqueFileId);
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
            console.debug("[FilePond Fetch] Fetching file:", url);
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
            
            // First check if this is a queued upload that needs to be cancelled
            const metadata = initialFiles.find((f: FilePondInitialFile) => 
                f.source === source || f.options?.file?.name === source
            )?.options?.metadata;

            if (metadata?.uploadId) {
                // This is a queued upload, cancel it
                onCancel(metadata.uploadId).then((cancelled) => {
                    if (cancelled) {
                        load();
                        console.debug("[FilePond Remove] Upload cancelled:", metadata.uploadId);
                    } else {
                        error('Failed to cancel upload');
                    }
                }).catch((err) => {
                    console.error("[FilePond Err] Failed to cancel upload:", err);
                    error('Failed to cancel upload');
                });
            } else {
                // This is a remote file, remove it from S3
                remove({
                    path: source,
                }).then(() => {
                    load();
                    console.debug("[FilePond Remove] File deleted:", source);
                }).catch((err) => {
                    console.error("[FilePond Err] Failed to delete file:", err);
                    error('Failed to delete file');
                });
            }
        }) as RemoveServerConfigFunction
    };
};

// 5. Export the component
export const InputImage = ({ 
    id,
    path,
    onChange,
    minNumberOfFiles = 0,
    maxNumberOfFiles = 10
}: InputImageProps) => {
    const [initialFiles, setInitialFiles] = React.useState<FilePondInitialFile[]>([]);
    const { cancelUpload } = useImageUpload();

    useEffect(() => {
        const loadInitialFiles = async (): Promise<void> => {
            console.debug("[FilePond] loadInitialFiles");
            try {
                // Load remote files from S3
                const trailingPath = path.endsWith('/') ? path : path + '/';
                const { items } = await list({
                    path: trailingPath,
                    options: { listAll: true }
                });

                // Load local pending uploads from IndexedDB
                const pendingUploads = await db.imageUploads
                    .where('path')
                    .startsWith(trailingPath)
                    .toArray() as ExtendedImageUpload[];

                const files: FilePondInitialFile[] = [];

                // Add remote files
                if (items.length > 0) {
                    const remoteFiles = await Promise.all(
                        items.map(async (item) => {
                            const filename = item.path.split('/').pop() || '';
                            const { url } = await getUrl({ path: item.path });
                            return {
                                source: item.path,
                                options: {
                                    type: 'local' as const,
                                    metadata: {
                                        filename,
                                        poster: url.href,
                                        status: 'synced'
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
                    files.push(...remoteFiles);
                }

                // Add pending uploads
                if (pendingUploads.length > 0) {
                    const pendingFiles = await Promise.all(pendingUploads.map(async (upload) => {
                        // Convert Blob to object URL for FilePond
                        const objectUrl = URL.createObjectURL(upload.file);
                        return {
                            source: objectUrl,
                            options: {
                                type: 'local' as const,
                                metadata: {
                                    ...upload.metadata,
                                    status: upload.syncStatus,
                                    error: upload.syncError,
                                    progress: upload.progress,
                                    originalFile: upload.file // Store original file for later use
                                },
                                file: {
                                    name: upload.path.split('/').pop() || '',
                                    size: (upload.file as File).size,
                                    type: 'image/*'
                                }
                            }
                        };
                    }));
                    files.push(...pendingFiles);
                }

                setInitialFiles(files);
                const validFileSources = files
                    .map(file => {
                        if (typeof file.source === 'string') return file.source;
                        const name = file.options?.file?.name;
                        return name || null;
                    })
                    .filter((source): source is string => source !== null);
                
                onChange?.(validFileSources);
            } catch (error) {
                console.error('[InputImage] Error loading files:', error);
                setInitialFiles([]);
                onChange?.([]);
            }
        };

        loadInitialFiles();

        // Cleanup object URLs on unmount
        return () => {
            initialFiles.forEach(file => {
                if (typeof file.source === 'string' && file.source.startsWith('blob:')) {
                    URL.revokeObjectURL(file.source);
                }
            });
        };
    }, [onChange, path]);

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
            allowImageResize={true}
            imageResizeTargetWidth={1200}
            imageResizeTargetHeight={1200}
            imageResizeMode="contain"
            imageTransformOutputQuality={80}
            imageTransformOutputMimeType="image/jpeg"
            allowImageTransform={true}
            imageTransformVariants={{
                'thumbnail_': (transforms: any) => {
                    transforms.resize = {
                        size: {
                            width: 200,
                            height: 200,
                        },
                    };
                    return transforms;
                },
                'medium_': (transforms: any) => {
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
                if (typeof file.source === 'string' && file.source.startsWith('blob:')) {
                    URL.revokeObjectURL(file.source);
                }

                // Try to cancel upload if it's still pending
                const uploadId = file.getMetadata('uploadId');
                if (uploadId) {
                    cancelUpload(uploadId).catch(console.error);
                }

                setInitialFiles(prev => prev.filter(f => {
                    if (typeof f.source === 'string') {
                        return f.source !== file.source;
                    }
                    const name = f.options?.file?.name;
                    return name ? name !== file.filename : false;
                }));
            }}
            onupdatefiles={(files) => {
                // Convert file names to full paths to update the form
                const fileSources = files.map(file => join(path, file.filename))
                onChange?.(fileSources);
            }}
            server={createServerConfig({ 
                path,
                initialFiles,
                onCancel: cancelUpload
            })}
            files={initialFiles}
            labelTapToRetry="Tap to retry upload"
            labelFileProcessing="Uploading..."
            labelFileProcessingComplete="Upload complete"
            labelFileProcessingAborted="Upload cancelled"
            labelFileLoadError="Error loading file"
            labelFileProcessingError={(error) => error?.body || 'Upload failed, tap to retry'}
        />
    );
};

export const RhfInputImage = ({
    path,
    rhfProps,
    labelText,
    ...props
}: RhfInputImageProps) => {
    const { setValue, register, formState } = useFormContext();

    useEffect(() => {
        register(rhfProps.name, rhfProps.rules);
    }, [register, rhfProps.name, rhfProps.rules]);

    const onChange = useMemo(() => (fileSources: string[]) => {
        console.debug("[RhfInputImage] onLoad", fileSources);
        setValue(rhfProps.name, fileSources, { shouldDirty: true });
    }, [rhfProps.name, setValue]);

    return (
        <div>
            {labelText && <Label text={labelText} />}
            <InputImage
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