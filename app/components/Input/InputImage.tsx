// Import React FilePond
import React, { useEffect } from 'react';
import { FilePond, registerPlugin } from 'react-filepond';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
import { TransferProgressEvent, uploadData } from "aws-amplify/storage";
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
    initFiles,
    onUploaded,
    onDeleted,
    minNumberOfFiles = 0,
    maxNumberOfFiles = 10
}: InputImageProps) => {
    const [files, setFiles] = React.useState<FileState[]>([]);

    useEffect(() => {
        if (initFiles) {
            const initialStates = initFiles.map(filename => ({
                id: uuidv4(),
                file: new File([], filename),
                status: "uploaded" as const
            }));
            setFiles(initialStates);
        }
    }, [initFiles]);

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
                path: join(path, fileState.file.name),
                options: {
                    onProgress: (progress: TransferProgressEvent) => {
                        console.debug("[Filepond uploadFile] Progress:", progress);

                        const progressPercent = progress.transferredBytes / (progress.totalBytes || 1) * 100;
                        onProgress(true, progress.transferredBytes, Math.floor(progress.totalBytes || 0));
                        setFiles(current => current.map(f => f.id === fileState.id
                            ? { ...f, status: "uploading", progress: progressPercent }
                            : f
                        ));
                    },
                },
            }).result;

            console.debug("[Filepond uploadFile] Completed:", uploadedFile)

            setFiles(current =>
                current.map(f =>
                    f.id === fileState.id
                        ? { ...f, status: "uploaded" }
                        : f
                )
            );

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
        
        // Return abort function that FilePond can call
        return uploadFile(
            fileState,
            () => load(file),
            error,
            progress,
            abort
        ).catch(error);
    };

    const handleRemoveFile = (file: FilePondFile) => {
        onDeleted?.({ name: file.filename });
        return true;
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
                }
            }}

           /*  files={initFiles?.map(filename => ({
                source: filename,
                options: {
                    type: 'local'
                }
            }))}  */
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
    const fileNames = field.value?.map((f: string) => f.split("/").reverse()[0]) || [];

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
                initFiles={fileNames}
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