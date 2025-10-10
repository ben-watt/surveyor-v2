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
    return (
      <div className={cn(
        "animate-pulse bg-gray-200 rounded",
        className || "h-48 w-full"
      )} />
    );
  }

  if (!image) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-gray-100 text-gray-500 rounded",
        className || "h-48 w-full"
      )}>
        Image not found
      </div>
    );
  }

  // Default wrapper size if none provided to prevent layout jumping
  const wrapperClass = className && className.trim().length > 0 ? className : 'h-48 w-full rounded';

  return (
    <div
      className={cn('relative overflow-hidden group w-full', wrapperClass)}
      onClick={() => onClick?.()}
    >
      {/* Main image (thumbnail) */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt={alt || image.fileName || 'Image'}
          className={cn('block w-full h-full object-cover')}
          loading="lazy"
          decoding="async"
        />
      )}
      {!imageUrl && (
        <div className="absolute inset-0 animate-pulse bg-gray-200" />
      )}

      {/* Upload progress overlay */}
      {image.uploadStatus === 'pending' && image.uploadProgress !== undefined && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
          <div className="text-white text-center">
            <div className="text-sm mb-2">Uploading...</div>
            <div className="w-32 bg-white/20 rounded-full h-2 overflow-hidden">
              <div
                className="bg-white h-full transition-all duration-300"
                style={{ width: `${image.uploadProgress}%` }}
              />
            </div>
            <div className="text-xs mt-1">{image.uploadProgress}%</div>
          </div>
        </div>
      )}

      {/* Failed upload indicator */}
      {image.uploadStatus === 'failed' && (
        <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
          <div className="bg-red-500 text-white px-3 py-1 rounded text-sm">
            Upload Failed
          </div>
        </div>
      )}

      {/* Archive status badge (optional, kept for context) */}
      {image.isArchived && (
        <div className="absolute top-2 right-2 bg-gray-800/75 text-white px-2 py-1 rounded text-xs">
          Archived
        </div>
      )}

      {/* Metadata overlay on hover (kept; wrapper is the hover group) */}
      <div className={cn(
        'absolute bottom-0 left-0 right-0',
        'bg-gradient-to-t from-black/60 to-transparent',
        'opacity-0 group-hover:opacity-100',
        'transition-opacity duration-200',
        'p-2 text-white text-xs'
      )}>
        {image.caption && <div className="font-medium">{image.caption}</div>}
        {image.fileName && <div className="opacity-75">{image.fileName}</div>}
        {image.width && image.height && (
          <div className="opacity-75">{image.width} × {image.height}</div>
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {imageIds.map((id) => (
        <ProgressiveImage key={id} imageId={id} className="aspect-square rounded" />
      ))}
    </div>
  );
}
