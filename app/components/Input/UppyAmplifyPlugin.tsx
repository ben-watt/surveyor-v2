"use client";

import { Meta, Uppy, UppyFile, BasePlugin, Body } from "@uppy/core";
import { PluginOpts } from "@uppy/core/lib/BasePlugin";
import { TransferProgressEvent, uploadData } from "aws-amplify/storage";

interface UppyAmplifyPluginOptions extends PluginOpts {
    path: string;
}

export default class UppyAmplifyPlugin extends BasePlugin<UppyAmplifyPluginOptions, Meta, Body, Record<string, unknown>> {
  type: string;
  id: string;
  title: string;
  path: string;

  constructor(uppy : Uppy<Meta, Body>, opts: UppyAmplifyPluginOptions) {
    super(uppy, opts);
    this.type = "uploader";
    this.id = "AmplifyPlugin";
    this.title = "Amplify Plugin";
    this.uppy = uppy;
    this.path = opts.path;
  }

  onProgress = (progress: TransferProgressEvent, file : UppyFile<Meta, Body>) => {
    console.log("[AwsAmplify] Progress:", progress, file);
    this.uppy.emit("upload-progress", file,
      {
        uploadStarted: progress.transferredBytes / (progress.totalBytes ?? 1) * 100,
        uploadComplete: progress.transferredBytes == progress.totalBytes,
        bytesUploaded: progress.transferredBytes,
        bytesTotal: progress.totalBytes ?? null,
      });
  }

  uploadFile = async (file: UppyFile<Meta, Body>) : Promise<any> => {
    console.debug("[AwsAmplify] Uploading file:", file);
    const uploadedFile = await uploadData({
        path: this.path + file.name,
        data: file.data,
        options: {
            onProgress: (progress) => this.onProgress(progress, file)
        }
    }).result;

    console.debug("[AwsAmplify] File uploaded:", uploadedFile);

    this.uppy.emit("upload-success", file, { status: 100, uploadURL: uploadedFile.path });
    return Promise.resolve(uploadedFile);
  };

  handleUpload = async (fileIDs: string[]): Promise<unknown> => {
    if (fileIDs.length === 0) {
      this.uppy.log("[AwsAmplify] No files to upload!");
      Promise.reject();
    }

    this.uppy.log("[AwsAmplify] Uploading...");
    const filesToUpload = fileIDs.map((fileID) => this.uppy.getFile(fileID));
    this.uppy.emit("upload-start", filesToUpload);

    // Upload each file but ensure we dond't do it in parrallel otherwise we get
    // an upload error from Amplify
    for (const file of filesToUpload) {
      await this.uploadFile(file);
      this.uppy.emit("upload-success", file, { status: 100 });
    }

    return Promise.resolve();
  };

  install() {
    this.uppy.addUploader(this.handleUpload);
  }

  uninstall() {
    this.uppy.removeUploader(this.handleUpload);
  }
}
