'use client';

import { useState, useEffect } from 'react';
import { enhancedImageStore } from '../clients/enhancedImageMetadataStore';
import { cn } from '@/lib/utils';

interface ProgressiveImageProps {
  imageId: string;
  className?: string; // wrapper classes (rounding/size). Defaults applied if missing.
  alt?: string;
  onLoad?: () => void;
  onClick?: () => void;
}

/**
 * Progressive image component that:
 * - Shows thumbnail immediately from IndexedDB
 * - Loads full image on demand
 * - Displays upload progress
 * - Shows archive status
 */
export function ProgressiveImage({
  imageId,
  className,
  alt,
  onLoad,
  onClick,
}: ProgressiveImageProps) {
  const [imageUrl, setImageUrl] = useState<string>();
  const [hydrated, image] = enhancedImageStore.useGet(imageId);

  // Load thumbnail immediately when available. Also react to record updates.
  useEffect(() => {
    if (image?.thumbnailDataUrl) {
      const cacheBusted = `${image.thumbnailDataUrl}#v=${encodeURIComponent(image.updatedAt || '')}`;
      setImageUrl(cacheBusted);
    }
  }, [image?.thumbnailDataUrl, image?.updatedAt, imageId]);

  // No full-image loading here; this component shows thumbnail only

  if (!hydrated) {
    return <div className={cn('animate-pulse rounded bg-gray-200', className || 'h-48 w-full')} />;
  }

  if (!image) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded bg-gray-100 text-gray-500',
          className || 'h-48 w-full',
        )}
      >
        Image not found
      </div>
    );
  }

  // Default wrapper size if none provided to prevent layout jumping
  const wrapperClass = className && className.trim().length > 0 ? className : 'h-48 w-full rounded';

  return (
    <div
      className={cn('group relative w-full overflow-hidden', wrapperClass)}
      onClick={() => onClick?.()}
    >
      {/* Main image (thumbnail) */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt={alt || image.fileName || 'Image'}
          className={cn('block h-full w-full object-cover')}
          loading="lazy"
          decoding="async"
        />
      )}
      {!imageUrl && <div className="absolute inset-0 animate-pulse bg-gray-200" />}

      {/* Upload progress overlay */}
      {image.uploadStatus === 'pending' && image.uploadProgress !== undefined && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center text-white">
            <div className="mb-2 text-sm">Uploading...</div>
            <div className="h-2 w-32 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${image.uploadProgress}%` }}
              />
            </div>
            <div className="mt-1 text-xs">{image.uploadProgress}%</div>
          </div>
        </div>
      )}

      {/* Failed upload indicator */}
      {image.uploadStatus === 'failed' && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-500/20">
          <div className="rounded bg-red-500 px-3 py-1 text-sm text-white">Upload Failed</div>
        </div>
      )}

      {/* Archive status badge (optional, kept for context) */}
      {image.isArchived && (
        <div className="absolute right-2 top-2 rounded bg-gray-800/75 px-2 py-1 text-xs text-white">
          Archived
        </div>
      )}

      {/* Metadata overlay on hover (kept; wrapper is the hover group) */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0',
          'bg-gradient-to-t from-black/60 to-transparent',
          'opacity-0 group-hover:opacity-100',
          'transition-opacity duration-200',
          'p-2 text-xs text-white',
        )}
      >
        {image.caption && <div className="font-medium">{image.caption}</div>}
        {image.fileName && <div className="opacity-75">{image.fileName}</div>}
        {image.width && image.height && (
          <div className="opacity-75">
            {image.width} × {image.height}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Progressive image gallery component
 */
export function ProgressiveImageGallery({ imageIds }: { imageIds: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {imageIds.map((id) => (
        <ProgressiveImage key={id} imageId={id} className="aspect-square rounded" />
      ))}
    </div>
  );
}
