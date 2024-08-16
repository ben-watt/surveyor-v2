import { UseFormRegisterReturn, useFormContext } from "react-hook-form";
import { StorageManager } from "@aws-amplify/ui-react-storage";
import { Label } from "./Label";
import { CameraIcon, CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useRef, useState } from "react";
import { uploadData } from "aws-amplify/storage";

interface InputImageProps {
  path: string;
  labelTitle?: string;
  maxFileCount?: number;
  register: () => UseFormRegisterReturn<string>;
}

const InputImage = ({
  path,
  labelTitle,
  maxFileCount = 10,
  register,
}: InputImageProps) => {
  const { name } = register();
  const { setValue, getValues } = useFormContext();
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [cameraFiles, setCameraFiles] = useState<File[]>([]);

  // handle capture get a picture from the camera facing environment
  const handleCaptureClick = (ev: React.MouseEvent<HTMLElement>) => {
    console.debug("handleCaptureClick");
    if(cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const handleSuccessfulUpload = (fileKey: string) => {
    console.debug("handleSuccessfulUpload", fileKey);

    const currentVal = getValues(name) || [];
    setValue(name, currentVal.concat(fileKey));
  }

  const handleCaptureOnChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.item(0) as File;
    console.debug("handleCaptureOnChange", file);

    uploadData({
      path,
      data: file,
      options: {
        onProgress: (progress) => {
          if(progress.totalBytes === progress.transferredBytes) {
            handleSuccessfulUpload(path + file.name);
            setCameraFiles((prev) => [...prev, file]);
          }
        }
      }
    })
  }

  return (
    <>
      <Label text={labelTitle}></Label>
      <StorageManager
        displayText={{
          browseFilesText: "Upload Images",
        }}
        defaultFiles={[{ key: "report-images/16a0caad-fb89-458f-81b4-87040ea0a760/frontElevationImages/nathan-duck-KnLj3o9A66E-unsplash.jpg" }]}
        acceptedFileTypes={["image/*"]}
        path={path}
        maxFileCount={maxFileCount}
        components={{
          DropZone({ children, displayText, inDropZone, ...rest }) {
            const dropBackgroundColor = "bg-gray-100";
            const css = inDropZone ? dropBackgroundColor : "";

            return (
              <div className={`flex flex-col space-y-2 items-center justify-center p-2 border-2 border-gray-300 border-dashed rounded-md ${css}`} {...rest}>
                <CloudUpload className="w-8 h-8 text-gray-400" />
                <Separator className="max-w-40" />
                {children}
              </div>
            );
          },
          FilePicker({ onClick }) {
            return (
              <div className="flex space-x-2">
                <Button type="button" variant="outline" onClick={onClick}>
                  Browse Files
                </Button>
                <Button type="button" variant="outline" onClick={handleCaptureClick} disabled>
                  <CameraIcon size={16} />
                    <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleCaptureOnChange} hidden />
                </Button>
              </div>
            );
          },
        }}
        onUploadSuccess={(file) => {
          if(file.key) {
            handleSuccessfulUpload(file.key);
          }
        }}
        onFileRemove={(file) => {
          const currentVal = getValues(name) || [];
          setValue(
            name,
            currentVal.filter((v: string) => v !== file.key)
          );
        }}
        isResumable
      />
    </>
  );
};

export default InputImage;
