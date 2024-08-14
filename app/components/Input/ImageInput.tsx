import { UseFormRegisterReturn, useFormContext } from "react-hook-form";
import { StorageManager } from '@aws-amplify/ui-react-storage';
import { useEffect, useState } from "react";
import { Label } from "./Label";


interface InputImageProps {
  path: string;
  labelTitle?: string;
  maxFileCount?: number;
  register: () => UseFormRegisterReturn<string>
}

const InputImage = ({ path, labelTitle, maxFileCount = 10, register }: InputImageProps) => {
  const reg = register();
  const { setValue, getValues, watch } = useFormContext();
  const fileName = watch(reg.name);

  return (
    <>
      <Label text={labelTitle}></Label>
      <StorageManager
          displayText={{
              browseFilesText: 'Upload Images',
          }}

          defaultFiles={fileName.map((fn : string) => ({ key: fn })) || []}
          acceptedFileTypes={['image/*']}
          path={path}
          maxFileCount={maxFileCount}

          components={{
            DropZone({ children, displayText, inDropZone, ...rest }) {
              return children;
            },
          }}

          onUploadSuccess={(file) => {
            const currentVal = getValues(reg.name) || [];
            setValue(reg.name, currentVal.concat(file.key)) 
          }}

          onFileRemove={(file) => {
            const currentVal = getValues(reg.name) || [];
            setValue(reg.name, currentVal.filter((v: string) => v !== file.key))
          }}

          isResumable
        />
    </>
      
  );
};

export default InputImage;
