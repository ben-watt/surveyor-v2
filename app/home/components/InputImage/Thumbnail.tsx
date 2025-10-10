import { X, Archive, Pencil } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { enhancedImageStore } from '@/app/home/clients/enhancedImageMetadataStore';
import { SimpleImageMetadataDialog } from './SimpleImageMetadataDialog';
import { useDynamicDrawer } from '@/app/home/components/Drawer';
import { ProgressiveImage } from '../ProgressiveImage';
import { formatFileSize } from '@/app/home/utils/format';

export type ThumbnailFeatures = { archive?: boolean; metadata?: boolean };

export interface ThumbnailProps {
  imageId: string;
  filePath: string;
  onDelete: (filePath: string) => void;
  onArchive: (filePath: string) => void;
  features?: ThumbnailFeatures;
  onMetadataChange: (filePath: string) => void;
}

export const Thumbnail = ({
  imageId,
  filePath,
  onDelete,
  onArchive,
  features,
  onMetadataChange,
}: ThumbnailProps) => {
  const { openDrawer, closeDrawer } = useDynamicDrawer();
  const [hydrated, image] = enhancedImageStore.useGet(imageId);
  const [hasMetadata, setHasMetadata] = useState(false);

  useEffect(() => {
    if (image?.caption || image?.notes) {
      setHasMetadata(true);
    }
  }, [image]);

  const handleEdit = () => {
    if (!image) return;

    openDrawer({
      id: 'image-metadata',
      title: 'Edit Image Metadata',
      content: (
        <SimpleImageMetadataDialog
          initialCaption={image.caption || ''}
          initialNotes={image.notes || ''}
          onSave={async (caption: string, notes: string) => {
            await enhancedImageStore.update(imageId, (draft) => {
              draft.caption = caption;
              draft.notes = notes;
            });
            setHasMetadata(true);
            onMetadataChange(filePath);
            closeDrawer();
          }}
          onClose={closeDrawer}
        />
      ),
    });
  };

  if (!hydrated || !image) {
    return <div className="animate-pulse bg-gray-200 rounded aspect-[3/2]" />;
  }

  return (
    <div className="relative rounded-md overflow-hidden">
      <div>
        <ProgressiveImage
          imageId={imageId}
          className="aspect-[3/2] object-cover"
          alt={image.fileName || 'Image'}
        />
      </div>
      <aside className="absolute top-0 left-0 right-0 bottom-0 from-black/70 to-black/0 bg-gradient-to-b"></aside>
      <aside className="absolute top-0 left-9 right-9 text-white p-2 text-xs">
        <p className="truncate">{image.fileName}</p>
        <p className="text-background/50 text-[0.6rem]">{formatFileSize(image.fileSize || 0)}</p>
      </aside>
      <aside className="absolute top-0 left-0">
        <button
          className="text-white p-1 m-2 rounded-full bg-black/50 transition border border-white/50 hover:border-white"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete(filePath);
          }}
        >
          <X />
        </button>
      </aside>
      {features?.metadata && (
        <aside className="absolute top-0 right-0">
          <button
            className={`p-1 m-2 rounded-full bg-black/50 transition border border-white/50 hover:border-white ${
              hasMetadata ? 'text-green-500 border-green-500' : 'text-white'
            }`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              handleEdit();
            }}
          >
            <Pencil size={16} />
          </button>
        </aside>
      )}
      {features?.archive && (
        <aside className="absolute bottom-0 left-0">
          <button
            className="text-white p-1 m-2 rounded-full bg-black/50 transition border border-white/50 hover:border-white"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onArchive(filePath);
            }}
          >
            <Archive size={16} />
          </button>
        </aside>
      )}
    </div>
  );
};

