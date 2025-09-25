'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogClose, DialogTitle } from '@/components/ui/dialog';
import { enhancedImageStore } from '../clients/enhancedImageMetadataStore';
import { ChevronLeft, ChevronRight, X, Archive, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface Photo {
  id: string;
  url: string; // thumbnail URL
  isArchived: boolean;
  imagePath: string;
  fileName?: string;
}

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: Photo[];
  initialIndex: number;
  sectionName: string;
}

export function ImageViewerModal({
  isOpen,
  onClose,
  photos,
  initialIndex,
  sectionName
}: ImageViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [fullImageUrl, setFullImageUrl] = useState<string | null>(null);
  const [isLoadingFullImage, setIsLoadingFullImage] = useState(false);
  const [imageError, setImageError] = useState(false);

  const currentPhoto = photos[currentIndex];

  // Load full resolution image from authenticated S3
  const loadFullImage = useCallback(async (photo: Photo) => {
    if (!photo) return;

    setIsLoadingFullImage(true);
    setImageError(false);
    setFullImageUrl(null);

    try {
      const result = await enhancedImageStore.getFullImageUrl(photo.imagePath);

      if (result.ok) {
        // Preload the image to ensure it loads properly
        const img = new window.Image();
        img.onload = () => {
          setFullImageUrl(result.val);
          setIsLoadingFullImage(false);
        };
        img.onerror = () => {
          setImageError(true);
          setIsLoadingFullImage(false);
        };
        img.src = result.val;
      } else {
        console.error('Failed to get full image URL:', result.val);
        setImageError(true);
        setIsLoadingFullImage(false);
      }
    } catch (error) {
      console.error('Error loading full image:', error);
      setImageError(true);
      setIsLoadingFullImage(false);
    }
  }, []);

  // Load full image when photo changes
  useEffect(() => {
    if (isOpen && currentPhoto) {
      loadFullImage(currentPhoto);
    }
  }, [isOpen, currentPhoto, loadFullImage]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  }, [photos.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  }, [photos.length]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    } else {
      setFullImageUrl(null);
      setIsLoadingFullImage(false);
      setImageError(false);
    }
  }, [isOpen, initialIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, photos.length, goToPrevious, goToNext, onClose]);

  if (!currentPhoto) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-7xl w-full h-[90vh] p-0 bg-black/95 border-gray-800">
        {/* Visually hidden title for accessibility */}
        <DialogTitle className="sr-only">
          Image Viewer - {sectionName}
        </DialogTitle>

        {/* Close button */}
        <DialogClose className="absolute right-4 top-4 z-10 rounded-sm opacity-70 text-white hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black">
          <X className="h-6 w-6" />
          <span className="sr-only">Close</span>
        </DialogClose>

        <div className="relative w-full h-full flex items-center justify-center">
          {/* Navigation arrows */}
          {photos.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* Image display */}
          <div className="relative w-full h-full flex items-center justify-center p-8">
            {isLoadingFullImage && (
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
                <span className="ml-2 text-white">Loading full image...</span>
              </div>
            )}

            {imageError && (
              <div className="flex flex-col items-center justify-center text-center">
                <div className="text-white mb-4">
                  <p className="text-lg mb-2">Failed to load full resolution image</p>
                  <p className="text-sm text-gray-400">Showing thumbnail instead</p>
                </div>
                {currentPhoto.url && (
                  <img
                    src={currentPhoto.url}
                    alt={currentPhoto.fileName || 'Image'}
                    className="max-w-full max-h-full object-contain"
                  />
                )}
              </div>
            )}

            {fullImageUrl && !isLoadingFullImage && !imageError && (
              <div className="relative w-full h-full">
                <Image
                  src={fullImageUrl}
                  alt={currentPhoto.fileName || 'Full resolution image'}
                  fill
                  className="object-contain"
                  quality={100}
                  priority
                  sizes="100vw"
                />
              </div>
            )}
          </div>

          {/* Image info overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  {currentPhoto.fileName || 'Untitled'}
                </h3>
                <p className="text-sm text-gray-300">
                  {sectionName} • {currentIndex + 1} of {photos.length}
                </p>
              </div>

              {currentPhoto.isArchived && (
                <div className="flex items-center gap-2 px-3 py-1 bg-gray-800/80 rounded-full">
                  <Archive className="h-4 w-4" />
                  <span className="text-sm">Archived</span>
                </div>
              )}
            </div>
          </div>

          {/* Image counter for multiple images */}
          {photos.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {currentIndex + 1} / {photos.length}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}