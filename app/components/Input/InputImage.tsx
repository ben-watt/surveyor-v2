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
import { FilePondFile, ProgressServerConfigFunction } from 'filepond';
import FilePondPluginImageExifOrientation from 'filepond-plugin-image-exif-orientation';
import { join } from 'path';

// Register the plugin with FilePond
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

interface FileState {
    id: string;
    file: File;
    status: "pending" | "uploading" | "uploaded" | "error";
    progress?: number;
}

export const InputImage = ({ 
    id,
    path,
    onUploaded,
    onDeleted,
    minNumberOfFiles = 0,
    maxNumberOfFiles = 10
}: InputImageProps) => {
    const [files, setFiles] = React.useState<FileState[]>([]);
    const [pondFiles, setPondFiles] = React.useState<any[]>([]);

    useEffect(() => {
        const loadInitialFiles = async () => {
            try {
                const cleanPath = path.startsWith('public/') ? path.substring(7) : path;
                console.debug('[InputImage] Listing files in path:', cleanPath);
                const { items } = await list({
                    path: cleanPath
                }); 
                
                if (items.length > 0) {
                    const signedUrls = await Promise.all(
                        items.map(async (item) => {
                            const filename = item.path.split('/').pop() || '';
                            console.debug('[InputImage] Getting URL for:', item.path);
                            const { url } = await getUrl({
                                path: item.path
                            });
                            console.debug('[InputImage] Got signed URL:', url);
                            return {
                                source: url.href,
                                options: {
                                    type: 'limbo',
                                    metadata: {
                                        filename,
                                        poster: url.href
                                    },
                                    file: {
                                        name: filename,
                                        size: item.size,
                                        type: 'image/*'
                                    },
                                    load: url.href
                                },
                                poster: url.href
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

    const uploadFile = async (
        fileState: FileState, 
        onComplete: () => void,
        onError: (error: any) => void,
        onProgress: ProgressServerConfigFunction,
        onAbort: () => void
    ): Promise<void> => {
        try {
            console.debug("[Filepond uploadFile] Uploading file:", fileState.file);
            
            const uploadedFile = await uploadData({
                data: fileState.file,
                path: path,
                options: {
                    onProgress: (progress: TransferProgressEvent) => {
                        const progressPercent = progress.transferredBytes / (progress.totalBytes || 1) * 100;
                        onProgress(true, progress.transferredBytes, Math.floor(progress.totalBytes || 0));
                        setFiles(current => current.map(f => f.id === fileState.id
                            ? { ...f, status: "uploading", progress: progressPercent }
                            : f
                        ));
                    },
                },
            }).result;

            console.debug("[Filepond uploadFile] Completed:", uploadedFile);

            setFiles(current =>
                current.map(f =>
                    f.id === fileState.id
                        ? { ...f, status: "uploaded" }
                        : f
                )
            );

            onUploaded?.({ name: fileState.file.name });
            onComplete();

        } catch (error) {
            console.error("[AwsAmplify] Upload failed:", error);
            setFiles(current =>
                current.map(f =>
                    f.id === fileState.id
                        ? { ...f, status: "error" }
                        : f
                )
            );
            onError(error);
        }
    };

    const handleRemoveFile = async (file: FilePondFile) => {
        try {
            const filename = file.getMetadata('filename') || file.filename;
            await remove({
                path: join(path, filename),
            });
            setPondFiles(current => current.filter(f => 
                f.options?.metadata?.filename !== filename
            ));
            onDeleted?.({ name: filename });
            return true;
        } catch (error) {
            console.error("[InputImage] Failed to delete file:", error);
            return false;
        }
    };

    const process = async (
        fieldName: string,
        file: File,
        metadata: any,
        load: (file: File) => void,
        error: (error: any) => void,
        progress: ProgressServerConfigFunction,
        abort: () => void
    ) => {
        const fileState: FileState = {
            id: uuidv4(),
            file,
            status: "pending"
        };

        setFiles(current => [...current, fileState]);
        
        try {
            await uploadFile(
                fileState,
                () => {
                    const previewUrl = URL.createObjectURL(file);
                    setPondFiles(current => [...current, {
                        source: previewUrl,
                        options: {
                            type: 'local',
                            metadata: {
                                filename: file.name,
                                poster: previewUrl
                            }
                        }
                    }]);
                    load(file);
                },
                error,
                progress,
                abort
            );
            
            return {
                abort: () => {
                    abort();
                }
            };
        } catch (err) {
            error(err);
            return {
                abort: () => {
                    abort();
                }
            };
        }
    };

    return (
        <FilePond
            name={id || 'filepond'}
            allowMultiple={true}
            maxFiles={maxNumberOfFiles}
            allowRevert={true}
            acceptedFileTypes={['image/*']}
            onremovefile={(error, file) => handleRemoveFile(file)}
            server={{
                process: (fieldName, file, metadata, load, error, progress, abort) => {
                    process(fieldName, file as File, metadata, load, error, progress, abort);
                    return {}
                },
                load: async (source, load, error, progress, abort, headers) => {
                    try {
                        const response = await fetch(source);
                        const blob = await response.blob();
                        load(blob);
                        
                        return {
                            abort: () => {
                                // Abort fetch if needed
                            }
                        };
                    } catch (err) {
                        error('Could not load image');
                    }
                }
            }}
            files={pondFiles}
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
        if(field.value) {
            field.onChange([...field.value, path + file.name || ""]);
        } else {
            field.onChange([path + file.name || ""]);
        }
    };

    const onDeleted = (file: { name: string }) => {
        field.onChange(field.value?.filter((fk: string) => fk !== path + file.name) || []);
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