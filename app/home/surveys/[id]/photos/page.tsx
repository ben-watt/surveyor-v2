"use client";

import React, { useEffect, useState } from "react";
import { surveyStore } from "@/app/home/clients/Database";
import { enhancedImageStore } from "@/app/home/clients/enhancedImageMetadataStore";
import { ArrowLeft, Archive } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ImageViewerModal } from "@/app/home/components/ImageViewerModal";

interface PhotoSection {
  name: string;
  photos: { id: string; url: string; isArchived: boolean; imagePath: string; fileName?: string }[];
}

function PhotoGallery() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [isHydrated, survey] = surveyStore.useGet(id);
  const [photoSections, setPhotoSections] = useState<PhotoSection[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSection, setSelectedSection] = useState<PhotoSection | null>(null);
  const router = useRouter();


  const loadPhotos = async () => {
    if (!survey) return;

    try {
      // Get both active and archived images from enhanced store only
      const [activeResult, archivedResult] = await Promise.all([
        enhancedImageStore.getActiveImages(),
        enhancedImageStore.getArchivedImages()
      ]);

      let allImages: any[] = [];
      if (activeResult.ok) {
        allImages.push(...activeResult.val);
      }
      if (archivedResult.ok) {
        allImages.push(...archivedResult.val);
      }

      console.log("[PhotoGallery] Enhanced store images:", allImages);

      // Filter images for this survey (by path prefix)
      const surveyImages = allImages.filter(img =>
        img.imagePath.includes(`/surveys/${id}/`) ||
        img.imagePath.includes(`surveys/${id}/`) ||
        img.imagePath.includes(`/${id}/`) ||
        img.imagePath.includes(`${id}/`) ||
        img.imagePath.includes(`survey-${id}`)
      );

      console.log("[PhotoGallery] Filtered survey images:", surveyImages);

      // Group images by section based on their path
      const sections: PhotoSection[] = [];
      const groupedImages = new Map<string, typeof surveyImages>();

      surveyImages.forEach(img => {
        // Extract section name from path
        let sectionName = "Unknown";

        if (img.imagePath.includes('/money-shot/') || img.imagePath.includes('moneyShot')) {
          sectionName = "Cover Image";
        } else if (img.imagePath.includes('/front-elevation/') || img.imagePath.includes('frontElevation')) {
          sectionName = "Front Elevation";
        } else if (img.imagePath.includes('/report-images/') || img.imagePath.includes('reportImages')) {
          sectionName = "Report Images";
        } else {
          // Try to extract section name from path
          const pathParts = img.imagePath.split('/');
          const lastPart = pathParts[pathParts.length - 2] || 'Images';
          sectionName = lastPart.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase()).trim();
        }

        if (!groupedImages.has(sectionName)) {
          groupedImages.set(sectionName, []);
        }

        // Convert enhanced store format to PhotoSection format
        groupedImages.get(sectionName)?.push({
          id: img.id,
          url: img.thumbnailDataUrl || '', // Use thumbnail for grid display
          isArchived: img.isArchived || false,
          imagePath: img.imagePath,
          fileName: img.fileName
        });
      });

      // Convert grouped images to sections
      groupedImages.forEach((photos, name) => {
        if (photos.length > 0) {
          sections.push({ name, photos });
        }
      });

      console.log("[PhotoGallery] Organized sections:", sections);
      setPhotoSections(sections);
    } catch (error) {
      console.error("[PhotoGallery] Error loading photos:", error);
    }
  };

  // Handle image click to open modal
  const handleImageClick = (sectionIndex: number, imageIndex: number) => {
    const section = photoSections[sectionIndex];
    const filteredPhotos = showArchived
      ? section.photos
      : section.photos.filter(photo => !photo.isArchived);

    if (filteredPhotos.length > 0) {
      setSelectedSection({ ...section, photos: filteredPhotos });
      setSelectedImageIndex(imageIndex);
      setIsModalOpen(true);
    }
  };

  useEffect(() => {
    if (isHydrated && survey) {
      loadPhotos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, survey]); // loadPhotos recreated on each render, would cause infinite loop

  const totalPhotos = photoSections.reduce(
    (total, section) => total + section.photos.length,
    0
  );

  if (!isHydrated) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl dark:text-white">Photo Gallery</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {totalPhotos} photos
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">Show Archived</span>
          </label>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {photoSections.map((section, sectionIndex) => {
          const filteredPhotos = showArchived 
            ? section.photos 
            : section.photos.filter(photo => !photo.isArchived);
            
          if (filteredPhotos.length === 0) return null;

          // Group photos: non-archived first, then archived
          const sortedPhotos = [...section.photos].sort((a, b) => {
            if (a.isArchived === b.isArchived) return 0;
            return a.isArchived ? 1 : -1;
          });
            
          return (
            <div key={sectionIndex}>
              <p className="text-sm mb-2">
                {section.name}
                <span className="text-sm text-gray-600 dark:text-gray-400 font-normal ml-2">
                  ({filteredPhotos.length})
                </span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
                {sortedPhotos.map((photo, photoIndex) => {
                  if (!showArchived && photo.isArchived) return null;

                  // Calculate filtered index for modal navigation
                  const filteredPhotos = showArchived
                    ? sortedPhotos
                    : sortedPhotos.filter(p => !p.isArchived);
                  const filteredIndex = filteredPhotos.findIndex(p => p.id === photo.id);

                  return (
                    <div
                      key={photo.id || photoIndex}
                      className={`relative aspect-square w-full overflow-hidden bg-gray-100 dark:bg-gray-800 ${photo.isArchived ? 'grayscale' : ''} group cursor-pointer`}
                      onClick={() => handleImageClick(sectionIndex, filteredIndex)}
                    >
                      <Image
                        src={photo.url}
                        alt={`${section.name} photo ${photoIndex + 1}`}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                        className={`object-cover hover:scale-105 transition-transform duration-300 ${photo.isArchived ? 'grayscale' : ''}`}
                        loading={sectionIndex === 0 && photoIndex < 6 ? "eager" : "lazy"}
                        quality={75}
                        placeholder="blur"
                        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx4eHRoaHSQtJSEkLzYvLy02Mi85OEI2PTZFOT5ZXVlZfG1+fW6Ghn6QjpCOd3p3gHj/2wBDARUXFx4eHR8fHXhwLicucHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHD/wAARCAAIAAoDASIAAhEBAxEAPwCdABmX/9k="
                      />

                      {/* Archive indicator */}
                      {photo.isArchived && (
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 bg-gray-800/80 text-white text-xs rounded">
                          <Archive size={12} />
                          <span>Archived</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Image Viewer Modal */}
      {selectedSection && (
        <ImageViewerModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          photos={selectedSection.photos}
          initialIndex={selectedImageIndex}
          sectionName={selectedSection.name}
        />
      )}
    </div>
  );
}

export default PhotoGallery;
