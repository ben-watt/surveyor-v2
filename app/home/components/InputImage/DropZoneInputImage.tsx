import { X } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { FileWithPath, useDropzone } from 'react-dropzone';

interface DropZoneInputImageProps {
  path: string;
  maxFiles?: number;
  minFiles?: number;
}

interface ThumbnailProps {
  file: FileWithPath;
  onDelete: (file: FileWithPath) => void;
}

const Thumbnail = ({file, onDelete}: ThumbnailProps) => {
  const toFileSize = useCallback((size: number) : [number, string] => {
    if (size < 1024) {
      return [size, 'B'];
    } else if (size < 1024 * 1024) {
      return [Math.round(size / 1024), 'KB'];
    } else if (size < 1024 * 1024 * 1024) {
      return [Math.round(size / 1024 / 1024), 'MB'];
    } else {
      return [Math.round(size / 1024 / 1024 / 1024), 'GB'];
    }
  }, []);
  
  return (
    <div className="relative rounded-md overflow-hidden" key={file.name}>
      <div>
        <img
          className="aspect-[3/2] object-cover"
          src={file.preview}
          alt={file.name}
          onLoad={() => { URL.revokeObjectURL(file.preview) }}
      />
    </div>
    <aside className="absolute top-0 left-0 right-0 bottom-0 from-black/70 to-black/0 bg-gradient-to-b">
    </aside>
    <aside className="absolute top-0 left-9 right-9 text-white p-2 text-xs">
      <p className="truncate">{file.name}</p>
      <p className="text-background/50">{toFileSize(file.size)[0]} {toFileSize(file.size)[1]}</p>
    </aside>
    <aside className="absolute top-0 left-0">
      <button className="text-white p-1 m-2 rounded-full bg-black/50 transition border border-white/50 hover:border-white" onClick={() => onDelete(file)}>
        <X />
      </button>
    </aside>
  </div>
  )
}

export const DropZoneInputImage = (props: DropZoneInputImageProps) => {
  const [files, setFiles] = useState<FileWithPath[]>([]);
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.ico', '.webp'],
    },
    minFiles: props.minFiles,
    maxFiles: props.maxFiles,
    onDrop: (acceptedFiles: FileWithPath[]) => {
      setFiles(acceptedFiles.map(file => Object.assign(file, {
        preview: URL.createObjectURL(file)
      })));
    }
  });

  const handleDelete = (file: FileWithPath) => {
    setFiles(files.filter(f => f !== file));
  }

  const thumbs = files.map((file: FileWithPath) =>
    <Thumbnail key={file.name} file={file} onDelete={handleDelete} />
  );

  return (
    <section className="container border border-gray-300 rounded-md p-4 bg-gray-100">
      <div {...getRootProps({className: 'dropzone'})}>
        <div className="flex flex-col items-center justify-center">
          <input {...getInputProps()} />
          <p className="text-sm text-gray-500 m-2">Drag & drop files, or <u className="cursor-pointer">fetch from device</u></p>
        </div>
      </div>
      <aside>
        <ul className={`${props.maxFiles && props.maxFiles > 1 ? 'grid grid-cols-2 gap-2' : 'flex flex-wrap gap-2'}`}>{thumbs}</ul>
      </aside>
    </section>
  );
}