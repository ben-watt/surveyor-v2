'use client';

import { useState, useEffect, useCallback } from 'react';
import { enhancedImageStore } from '../clients/enhancedImageMetadataStore';
import { cn } from '@/lib/utils';

interface ProgressiveImageProps {
  imageId: string;
  className?: string;
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
  onClick
}: ProgressiveImageProps) {
  const [imageUrl, setImageUrl] = useState<string>();
  const [isLoadingFull, setIsLoadingFull] = useState(false);
  const [error, setError] = useState<string>();
  const [fullImageLoaded, setFullImageLoaded] = useState(false);
  const [hydrated, image] = enhancedImageStore.useGet(imageId);

  // Load thumbnail immediately when available
  useEffect(() => {
    if (image?.thumbnailDataUrl) {
      setImageUrl(image.thumbnailDataUrl);
    }
  }, [image?.thumbnailDataUrl]);

  // Load full image from S3
  const loadFullImage = useCallback(async () => {
    if (!image?.imagePath || isLoadingFull || fullImageLoaded) return;

    setIsLoadingFull(true);
    setError(undefined);

    try {
      const urlResult = await enhancedImageStore.getFullImageUrl(image.imagePath);

      if (urlResult.ok) {
        // Preload the image to ensure smooth transition
        const img = new Image();
        img.onload = () => {
          setImageUrl(urlResult.val);
          setFullImageLoaded(true);
          onLoad?.();
        };
        img.onerror = () => {
          setError('Failed to load full image');
        };
        img.src = urlResult.val;
      } else {
        setError(urlResult.val.message);
      }
    } catch (err) {
      setError('Failed to load full image');
    } finally {
      setIsLoadingFull(false);
    }
  }, [image?.imagePath, isLoadingFull, fullImageLoaded, onLoad]);

  // Auto-load full image if upload is complete
  useEffect(() => {
    if (image?.uploadStatus === 'uploaded' && !fullImageLoaded && !image.thumbnailDataUrl) {
      loadFullImage();
    }
  }, [image?.uploadStatus, fullImageLoaded, image?.thumbnailDataUrl, loadFullImage]);

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

  return (
    <div className="relative group">
      {/* Main image */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={alt || image.fileName || 'Image'}
          className={cn(
            "cursor-pointer transition-opacity duration-300",
            className || "w-full h-auto",
            isLoadingFull && "opacity-75"
          )}
          onClick={() => {
            if (!fullImageLoaded && image.uploadStatus === 'uploaded') {
              loadFullImage();
            }
            onClick?.();
          }}
        />
      ) : (
        <div className={cn(
          "flex items-center justify-center bg-gray-100",
          className || "h-48 w-full"
        )}>
          {image.uploadStatus === 'pending' ? (
            <div className="text-gray-500">Uploading...</div>
          ) : (
            <button
              onClick={loadFullImage}
              className="text-blue-500 hover:text-blue-600"
            >
              Load Image
            </button>
          )}
        </div>
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

      {/* Archive status badge */}
      {image.isArchived && (
        <div className="absolute top-2 right-2 bg-gray-800/75 text-white px-2 py-1 rounded text-xs">
          Archived
        </div>
      )}

      {/* Load full image button (if not loaded) */}
      {!fullImageLoaded && image.uploadStatus === 'uploaded' && imageUrl && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            loadFullImage();
          }}
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            "bg-black/20 opacity-0 group-hover:opacity-100",
            "transition-opacity duration-200"
          )}
        >
          <span className="bg-white/90 px-3 py-2 rounded shadow-lg">
            {isLoadingFull ? 'Loading...' : 'Load Full Image'}
          </span>
        </button>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute bottom-2 left-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs">
          {error}
        </div>
      )}

      {/* Metadata overlay on hover */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0",
        "bg-gradient-to-t from-black/60 to-transparent",
        "opacity-0 group-hover:opacity-100",
        "transition-opacity duration-200",
        "p-2 text-white text-xs"
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
        <ProgressiveImage
          key={id}
          imageId={id}
          className="aspect-square object-cover rounded"
        />
      ))}
    </div>
  );
}