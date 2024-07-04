import { UseFormRegisterReturn, useFormContext } from "react-hook-form";
import { StorageManager } from '@aws-amplify/ui-react-storage';
import { useEffect, useState } from "react";


interface InputImageProps {
  path: string;
  label?: string;
  maxFileCount?: number;
  register: () => UseFormRegisterReturn<string>
}

const InputImage = ({ path, label, maxFileCount = 10, register }: InputImageProps) => {
  const reg = register();
  const { setValue, getValues, watch } = useFormContext();
  const fileName = watch(reg.name);

  return (
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
  );
};

export default InputImage;
