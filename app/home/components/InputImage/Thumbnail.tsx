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
    return <div className="aspect-[3/2] animate-pulse rounded bg-gray-200" />;
  }

  return (
    <div className="relative overflow-hidden rounded-md">
      <div>
        <ProgressiveImage
          imageId={imageId}
          className="aspect-[3/2]"
          alt={image.fileName || 'Image'}
        />
      </div>
      <aside className="absolute bottom-0 left-0 right-0 top-0 bg-gradient-to-b from-black/70 to-black/0"></aside>
      <aside className="absolute left-9 right-9 top-0 p-2 text-xs text-white">
        <p className="truncate">{image.fileName}</p>
        <p className="text-[0.6rem] text-background/50">{formatFileSize(image.fileSize || 0)}</p>
      </aside>
      <aside className="absolute left-0 top-0">
        <button
          className="m-2 rounded-full border border-white/50 bg-black/50 p-1 text-white transition hover:border-white"
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
        <aside className="absolute right-0 top-0">
          <button
            className={`m-2 rounded-full border border-white/50 bg-black/50 p-1 transition hover:border-white ${
              hasMetadata ? 'border-green-500 text-green-500' : 'text-white'
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
            className="m-2 rounded-full border border-white/50 bg-black/50 p-1 text-white transition hover:border-white"
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
