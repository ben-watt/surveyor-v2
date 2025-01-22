// 1. Group and organize imports
// React and FilePond
import React, { useEffect, useMemo } from 'react';
import { FilePond, registerPlugin } from 'react-filepond';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
import FilePondPluginImageExifOrientation from 'filepond-plugin-image-exif-orientation';
import FilePondPluginFilePoster from 'filepond-plugin-file-poster';
import FilePondPluginImageResize from 'filepond-plugin-image-resize';
import {
    ProcessServerConfigFunction,
    LoadServerConfigFunction,
    RestoreServerConfigFunction,
    FetchServerConfigFunction,
    RemoveServerConfigFunction,
    FileStatus,
    FilePondFile,
    FilePondInitialFile
} from 'filepond';

// AWS Amplify
import { TransferProgressEvent, uploadData, getUrl, remove, list } from "aws-amplify/storage";

// Form handling
import { FieldValues, useController, UseControllerProps, useFormContext } from "react-hook-form";
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
    FilePondPluginImageExifOrientation,
    FilePondPluginImageResize
);

// 3. Type definitions
interface InputImageProps {
    id?: string;
    path: string;
    onChange?: (fileSources: string[]) => void;
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

// Add this type near other interfaces
interface RhfInputImageProps extends InputImageProps {
    rhfProps: UseControllerProps<FieldValues>;
    labelText?: string;
}

// 4. Extract server configuration to a separate function for better readability
const createServerConfig = ({ path }: CreateServerConfigProps) => ({
    process: ((fieldName, file, metadata, load, error, progress, abort) => {
        console.debug("[FilePond Process] Uploading file:", file);

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
            path: source,
        }).then(() => {
            load();
            console.debug("[FilePond Remove] File deleted:", source);
        }).catch((err) => {
            console.error("[FilePond Err] Failed to delete file:", err);
            error('Failed to delete file');
        })
    }) as RemoveServerConfigFunction
});

// 5. Export the component
export const InputImage = ({ 
    id,
    path,
    onChange,
    minNumberOfFiles = 0,
    maxNumberOfFiles = 10
}: InputImageProps) => {
    const [initialFiles, setInitialFiles] = React.useState<FilePondInitialFile[]>([]);

    useEffect(() => {
        const loadInitialFiles = async () => {
            try {
                const trailingPath = path.endsWith('/') ? path : path + '/';
                const { items } = await list({
                    path: trailingPath,
                    options: { listAll: true }
                });

                if (items.length > 0) {
                    const loadedFiles = await Promise.all(
                        items.map(async (item) => {
                            const filename = item.path.split('/').pop() || '';
                            const { url } = await getUrl({ path: item.path });
                            return {
                                source: item.path,
                                options: {
                                    type: 'local' as const,
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
                    setInitialFiles(loadedFiles);
                    onChange?.(loadedFiles.map(file => file.options.metadata.filename));
                } else {
                    setInitialFiles([]);
                    onChange?.([]);
                }
            } catch (error) {
                console.error('[InputImage] Error loading files:', error);
                setInitialFiles([]);
                onChange?.([]);
            }
        };

        loadInitialFiles();
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
            imageResizeTargetWidth={10}
            imageResizeTargetHeight={10}
            imageResizeMode="contain"
            credits={false}
            onupdatefiles={(files) => {
                console.debug("[FilePond] onupdatefiles", files);
                const fileSources = files.map(file => 
                    typeof file.serverId === 'string' ? file.serverId :
                    typeof file.source === 'string' ? file.source :
                    file.filename
                );
                onChange?.(fileSources);
            }}
            server={createServerConfig({ path })}
            files={initialFiles}
            labelFileProcessingError={(error) => error?.body || 'Upload failed'}
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