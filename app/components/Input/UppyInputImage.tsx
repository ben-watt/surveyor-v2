"use client";

import React, { useState } from "react";
import Uppy from "@uppy/core";
import Webcam from "@uppy/webcam";
import { Dashboard, useUppyState } from "@uppy/react";
import ImageEditor from "@uppy/image-editor";
import GoldenRetriever from "@uppy/golden-retriever";

import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";
import "@uppy/webcam/dist/style.min.css";
import "@uppy/image-editor/dist/style.min.css";

import UppyAmplifyPlugin from "./UppyAmplifyPlugin";

interface InputImageUppyProps {
  path: string;
}

export function InputImageUppy({ path }: InputImageUppyProps) {
  // IMPORTANT: passing an initializer function to prevent Uppy from being reinstantiated on every render.
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        allowedFileTypes: ["image/*"],
      },
    })
      .use(Webcam)
      .use(ImageEditor)
      .use(GoldenRetriever)
      .use(UppyAmplifyPlugin, { path })
  );

  const fileCount = useUppyState(
    uppy,
    (state) => Object.keys(state.files).length
  );

  const totalProgress = useUppyState(uppy, (state) => state.totalProgress);

  const metaFields = [
    {
      id: "altText",
      name: "Label",
      placeholder: "a description of the image",
    },
  ];

  uppy.on("file-removed", (file) => {
    console.log("File removed", file);
    // TODO: remove file from storage if it was already uploaded
  });

  return (
    <div>
      <div className="text-sm">
        {fileCount} files, {totalProgress}%
      </div>
      <Dashboard
        showNativePhotoCameraButton={false}
        showRemoveButtonAfterComplete={true}
        height={fileCount > 0 ? 500 : 150}
        uppy={uppy}
        showProgressDetails={true}
        metaFields={metaFields}
      />
    </div>
  );
}
