"use client";

import React, { MouseEventHandler, useCallback, useEffect, useState } from "react";
import Uppy, { Meta, Body, UppyFile } from "@uppy/core";
import { useUppyState } from "@uppy/react";
import ImageEditor from "@uppy/image-editor";
import GoldenRetriever from "@uppy/golden-retriever";
import UppyAmplifyPlugin from "./UppyAmplifyPlugin";

import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";
import "@uppy/webcam/dist/style.min.css";
import "@uppy/image-editor/dist/style.min.css";


import dynamic from "next/dynamic";
import {
  FieldPath,
  FieldValues,
  Path,
  useController,
  UseControllerProps,
} from "react-hook-form";
import { Label } from "./Label";

interface InputImageUppyProps {
  path: string;
  initFiles?: string[];
  onUploaded?: (file: UppyFile<Meta, Body>) => void;
  onDeleted?: (file: UppyFile<Meta, Body>) => void;
  minNumberOfFiles?: number;
  maxNumberOfFiles?: number;
}

const Dashboard = dynamic(
  () => import("@uppy/react").then((x) => x.Dashboard),
  { ssr: false }
);

// Could be good to explore totally custom UI with
// cropper js for editing
function InputImageUppy({
  path,
  initFiles,
  onUploaded,
  onDeleted,
  minNumberOfFiles,
  maxNumberOfFiles
}: InputImageUppyProps) {
  if(!path.endsWith("/")) {
    console.warn("Path should end with a '/'");
  }

  // IMPORTANT: passing an initializer function to prevent Uppy from being reinstantiated on every render.
  const [uppy] = useState(() =>
    new Uppy<Meta, Body>({
      autoProceed: true,
      restrictions: {
        allowedFileTypes: ["image/*"],
        minNumberOfFiles: minNumberOfFiles,
        maxNumberOfFiles: maxNumberOfFiles,
      },
    })
    .use(ImageEditor)
    .use(GoldenRetriever)
    .use(UppyAmplifyPlugin, { path })
  );

  useEffect(() => {
    uppy.setOptions({
      onBeforeFileAdded: (file, files) => {
        return Object.getOwnPropertyNames(files)
          .map(k => {
            const isDuplicate = files[k].name == file.name;
            if(isDuplicate) {
              uppy.info(`Can't add file '${file.name}'. File with the same name already exists`);
            }
  
            return isDuplicate;
          })
          .every((m) => m == false);
      }
    })
  }, [uppy]);

  const fileCount = useUppyState(
    uppy,
    (state) => Object.keys(state.files).length
  );

  const [showEdit, setShowEdit] = useState(false);

  const metaFields = [
    {
      id: "altText",
      name: "Label",
      placeholder: "a description of the image",
    }
  ];

  useEffect(() => {
    if (initFiles) {
      uppy.setOptions({
        autoProceed: false,
      });

      initFiles.map((fileName) => {
        const exists = uppy.getFiles().find((f) => f.name === fileName);
        if (!exists) {
          try {
            uppy.addFile({
              name: fileName,
              type: "image/*",
              data: new Blob(),
              isRemote: true,
            });
          } catch(e) {
            console.warn("Failed to add file", fileName, e);
          }
        } else {
            uppy.setFileState(exists.id, {
              progress: {
                uploadComplete: true,
                uploadStarted: 100,
                bytesTotal: 100,
                bytesUploaded: 100,
              },
          });
        }
      });

      uppy.setOptions({
        autoProceed: true,
      });
    }
  }, [initFiles, uppy]);

  const allowEditForFile = useCallback((file: UppyFile<Meta, Body>) => {
    if (!file.isRemote) {
      uppy.setFileState(file.id, {
        progress: {
          uploadComplete: false,
          uploadStarted: 0,
          bytesTotal: 0,
          bytesUploaded: 0,
        },
      });
      console.log("Editing file", file);
    } else {
      console.warn("Can't edit remote files... yet");
    }
  }, [uppy]);

  const allowEditForAllFiles = useCallback(() => {
    const files = uppy.getFiles();
    uppy.setOptions({
      autoProceed: false,
    });

    // Ensures for now we can edit the files that are not remote
    files.map((f) => {
      allowEditForFile(f);
    });

    setShowEdit(false);
  }, [allowEditForFile, uppy]);


  useEffect(() => {
    uppy.on("file-removed", (file) => {
      onDeleted && onDeleted(file);
    });

    uppy.on("upload-success", (file, response) => {
      if (file) {
        onUploaded && onUploaded(file);
        setShowEdit(true);
      }
    });
  }, [allowEditForAllFiles, allowEditForFile, onDeleted, onUploaded, uppy]);

  // Need to figure out how to handle
  // editing of files that aren't downloaded
  // do we just upload the thumbnails... that'd be rubbish
  // probably need to store in state when we get the initial set of values
  const handleEdit: MouseEventHandler = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    allowEditForAllFiles();
  };

  return (
    <div className="relative">
      <Dashboard
        showLinkToFileUploadResult={true}
        singleFileFullScreen={false}        
        showRemoveButtonAfterComplete={true}
        doneButtonHandler={() => {}}
        hideCancelButton={true}
        height={fileCount > 0 ? 500 : 100}
        uppy={uppy}
        showProgressDetails={true}
        proudlyDisplayPoweredByUppy={false}
        metaFields={metaFields}
      />
      {/* <div className="absolute bottom-1 left-1 text-sm">
        {fileCount} files
      </div> */}
      {showEdit &&  (
        <div className="absolute top-4 left-4 z-[1005]">
          <button onClick={handleEdit}>Edit</button>
        </div>
      )}
    </div>
  );
}

/// This is a type that will only include properties of T that are of type U
// This is useful for filtering out properties of a type that are not of a certain type
// You can break it down into three parts
// 1. [Property in keyof T] - This is a mapped type that iterates over all the properties of T
// 2. as T[Property] extends U ? Property : never - This is a conditional type that checks if the property is of type U
// 3. : T[Property] - Return the type of the property
// To fix we might need to
// 1. Make the type recursive
// 2. Make the type work with nested objects
// 3. Make the type work with arrays
type OnlyInludeTypes<T, U> = {
  [Property in keyof T as T[Property] extends U
    ? Property
    : never]: T[Property];
};

type Test = {
  a: string;
  b: string[];
  c: {
    d: string;
    e: string[];
  };
};

type P = Path<OnlyInludeTypes<Test, string[]>>;
//const x : P = "b";
//change FieldPath<TFieldValues> to Path<OnlyInludeTypes<TFieldValues, string[]>>
// However it is not recursive and will only work for the first level of the object

interface InputImageUppyPropsWithRegister<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>
> extends InputImageUppyProps {
  rhfProps: UseControllerProps<TFieldValues, TName>;
  labelText?: string;
}

/// fk = FileKey = path + file.name
function RhfInputImage<TFieldValues extends FieldValues>({
  path,
  rhfProps,
  labelText,
}: InputImageUppyPropsWithRegister<TFieldValues, FieldPath<TFieldValues>>) {
  const { field } = useController(rhfProps);
  const fileNames = field.value?.map((f: string) => f.split("/").reverse()[0]) || [];

  const onUploaded = (file: UppyFile<Meta, Body>) => {
    if(field.value) {
      field.onChange([...field.value, path + file.name]);
    } else {
      field.onChange([path + file.name]);
    }
  };

  const onDeleted = (file: UppyFile<Meta, Body>) => {
    field.onChange(field.value?.filter((fk: string) => fk == file.name) || []);
  };

  return (
    <div {...field}>
      {labelText && <Label text={labelText} />}
      <InputImageUppy
        path={path}
        initFiles={fileNames}
        onUploaded={onUploaded}
        onDeleted={onDeleted}
      />
    </div>
  );
}

export const input = {
  image: InputImageUppy,
  rhfImage: RhfInputImage,
};

// motion {}.div

// Generic approach + controller
// pass down pre-made render functions, have to manually handle the form data and watch for changes...
