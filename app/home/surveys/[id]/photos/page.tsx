"use client";

import React, { useEffect, useState } from "react";
import { surveyStore } from "@/app/home/clients/Database";
import { enhancedImageStore } from "@/app/home/clients/enhancedImageMetadataStore";
import { imageUploadStore } from "@/app/home/clients/ImageUploadStore";
import { ArrowLeft, Archive } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { SurveyImage } from "@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema";

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
  const router = useRouter();


  // Move loadPhotos outside of useEffect so it can be called from handleArchiveToggle
  const loadPhotos = async () => {
    if (!survey) return;

    // Get all images from the enhanced store
    const allImages = await getImagesFromEnhancedStore();

    console.log("[PhotoGallery] All images from enhanced store:", allImages);
    console.log("[PhotoGallery] Survey ID:", id);

    // Log a few sample paths to understand the structure
    if (allImages.length > 0) {
      console.log("[PhotoGallery] Sample image paths:", allImages.slice(0, 5).map(img => img.imagePath));
    }

    // Filter images for this survey (by path prefix) - try multiple patterns
    const surveyImages = allImages.filter(img =>
      img.imagePath.includes(`/surveys/${id}/`) ||
      img.imagePath.includes(`surveys/${id}/`) ||
      img.imagePath.includes(`/${id}/`) ||
      img.imagePath.includes(`${id}/`) ||
      img.imagePath.includes(`survey-${id}`)
    );

    console.log("[PhotoGallery] All survey images after filtering:", surveyImages);

    // If no images found in enhanced store, try legacy store as fallback
    if (surveyImages.length === 0) {
      console.log("[PhotoGallery] No images in enhanced store, trying legacy store...");
      try {
        const legacyImages = await loadPhotosFromLegacyStore();
        if (legacyImages.length > 0) {
          console.log("[PhotoGallery] Found images in legacy store:", legacyImages);
          setPhotoSections(legacyImages);
          return;
        }
      } catch (error) {
        console.error("[PhotoGallery] Error loading from legacy store:", error);
      }
    }

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
        sectionName = lastPart.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
      }

      if (!groupedImages.has(sectionName)) {
        groupedImages.set(sectionName, []);
      }
      groupedImages.get(sectionName)?.push(img);
    });

    // Convert grouped images to sections
    groupedImages.forEach((photos, name) => {
      if (photos.length > 0) {
        sections.push({ name, photos });
      }
    });

    console.log("[PhotoGallery] Organized sections:", sections);
    setPhotoSections(sections);
  };

  console.log("[PhotoGallery] photoSections", survey);

  // Fallback function to load from legacy store if enhanced store is empty
  const loadPhotosFromLegacyStore = async (): Promise<PhotoSection[]> => {
    if (!survey) return [];

    const sections: PhotoSection[] = [];

    async function getImagesFromLegacyStore(
      imagePaths: SurveyImage[]
    ): Promise<{ id: string; url: string; isArchived: boolean; imagePath: string; fileName?: string }[]> {
      const result = await Promise.all(
        imagePaths.map(async (file) => {
          const result = await imageUploadStore.get(file.path);
          if (result.err) {
            console.error("[PhotoGallery] Legacy store error", result.err);
            return null;
          }
          // Create fake data structure to match enhanced store format
          return {
            id: file.path, // Use path as ID since legacy doesn't have proper IDs
            path: file.path,
            isArchived: file.isArchived,
            url: result.unwrap().href,
            hasMetadata: file.hasMetadata,
            imagePath: file.path,
            fileName: file.path.split('/').pop()
          };
        })
      );
      const validResults = result.filter((url) => url !== null);
      return validResults;
    }

    // Load money shot
    if (survey.reportDetails?.moneyShot?.length) {
      const images = await getImagesFromLegacyStore(survey.reportDetails.moneyShot);
      if (images.length > 0) {
        sections.push({
          name: "Cover Image",
          photos: images,
        });
      }
    }

    // Load front elevation images
    if (survey.reportDetails?.frontElevationImagesUri?.length) {
      const images = await getImagesFromLegacyStore(survey.reportDetails.frontElevationImagesUri);
      if (images.length > 0) {
        sections.push({
          name: "Front Elevation",
          photos: images,
        });
      }
    }

    // Load component images
    if (survey.sections?.length) {
      for (const section of survey.sections) {
        for (const elementSection of section.elementSections || []) {
          if (elementSection.images?.length) {
            const images = await getImagesFromLegacyStore(elementSection.images);
            if (images.length > 0) {
              sections.push({
                name: elementSection.name,
                photos: images,
              });
            }
          }

          for (const component of elementSection.components || []) {
            if (component.images?.length) {
              const images = await getImagesFromLegacyStore(component.images);
              if (images.length > 0) {
                sections.push({
                  name: `${elementSection.name} - ${component.name}`,
                  photos: images,
                });
              }
            }
          }
        }
      }
    }

    return sections;
  };

  const getImagesFromEnhancedStore = async (): Promise<{ id: string; url: string; isArchived: boolean; imagePath: string; fileName?: string }[]> => {
    try {
      console.log("[PhotoGallery] Calling enhanced image store methods...");

      // Get both active and archived images
      const [activeResult, archivedResult] = await Promise.all([
        enhancedImageStore.getActiveImages(),
        enhancedImageStore.getArchivedImages()
      ]);

      console.log("[PhotoGallery] Active images result:", activeResult);
      console.log("[PhotoGallery] Archived images result:", archivedResult);

      let allImages: any[] = [];
      if (activeResult.ok) {
        console.log("[PhotoGallery] Active images count:", activeResult.val.length);
        allImages.push(...activeResult.val);
      }
      if (archivedResult.ok) {
        console.log("[PhotoGallery] Archived images count:", archivedResult.val.length);
        allImages.push(...archivedResult.val);
      }

      // For enhanced store images, use thumbnails for display (they're base64 and always work)
      const imagePromises = allImages.map(async (img) => {
        return {
          id: img.id,
          url: img.thumbnailDataUrl || '', // Use thumbnail instead of full URL to avoid S3 auth issues
          isArchived: img.isArchived || false,
          imagePath: img.imagePath,
          fileName: img.fileName
        };
      });

      const results = await Promise.all(imagePromises);
      return results.filter(r => r.url); // Filter out images that failed to get URLs
    } catch (error) {
      console.error("[PhotoGallery] Error loading images from enhanced store:", error);
      return [];
    }
  };

  useEffect(() => {
    if (isHydrated && survey) {
      loadPhotos();
    }
  }, [isHydrated, survey]);

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
                  return (
                    <div
                      key={photo.id || photoIndex}
                      className={`relative aspect-square w-full overflow-hidden bg-gray-100 dark:bg-gray-800 ${photo.isArchived ? 'grayscale' : ''} group`}
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
    </div>
  );
}

export default PhotoGallery;
