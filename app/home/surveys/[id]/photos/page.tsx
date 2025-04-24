"use client";

import React, { useEffect, useState, use } from "react";
import { surveyStore } from "@/app/home/clients/Database";
import { imageUploadStore } from "@/app/home/clients/ImageUploadStore";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { SurveyImage } from "@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema";

interface PhotoGalleryProps {
  params: Promise<{
    id: string;
  }>;
}

interface PhotoSection {
  name: string;
  photos: { url: string; isArchived: boolean }[];
}

function PhotoGallery(props: PhotoGalleryProps) {
  const params = use(props.params);
  const [isHydrated, survey] = surveyStore.useGet(params.id);
  const [photoSections, setPhotoSections] = useState<PhotoSection[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const router = useRouter();

  console.log("[PhotoGallery] photoSections", survey);

  useEffect(() => {
    async function getImagesFromStore(
        imagePaths: SurveyImage[]
      ): Promise<{url: string, isArchived: boolean}[]> {
      const result = await Promise.all(
        imagePaths.map(async (file) => {
          const result = await imageUploadStore.get(file.path);
          if(result.err) {
            console.error("[PhotoGallery] getImagesFromStore", result.err);
            return null;
          }
          return {path: file.path, isArchived: file.isArchived, url: result.unwrap().href, hasMetadata: file.hasMetadata};
        })
      );
      const validResults = result.filter((url) => url !== null);
      return validResults;
    }

    async function loadPhotos() {
      if (!survey) return;

      const sections: PhotoSection[] = [];

      // Load money shot
      if (survey.reportDetails?.moneyShot?.length) {
        const urls = await Promise.all(
          survey.reportDetails.moneyShot.map(async (file) => {
            console.log("[PhotoGallery] moneyShot", file);
            if (!file.path) return null;
            
            const result = await imageUploadStore.get(file.path);
            if (result.err) {
              console.error("[PhotoGallery] moneyShot", result.err);
              return null;
            }

            return { 
              url: result.unwrap().href,
              isArchived: file.isArchived || false
            };
          })
        );

        sections.push({
          name: "Cover Image",
          photos: urls.filter((url) => url !== null),
        });
      }

      // Load front elevation images
      if (survey.reportDetails?.frontElevationImagesUri?.length) {
        console.log("[PhotoGallery] frontElevationImagesUri", survey.reportDetails.frontElevationImagesUri);
        const urls = await Promise.all(
          survey.reportDetails.frontElevationImagesUri.map(async (file) => {
            if (!file.path) return null;
            const result = await imageUploadStore.get(file.path);
            if (result.err) {
              console.error("[PhotoGallery] frontElevationImagesUri", result.err);
              return null;
            }
            return { 
              url: result.unwrap().href,
              isArchived: file.isArchived || false
            };
          })
        );

        sections.push({
          name: "Front Elevation",
          photos: urls.filter((url) => url !== null),
        });
      }

      // Load component images
      if (survey.sections?.length) {
        for (const section of survey.sections) {
          for (const elementSection of section.elementSections || []) {
            if (elementSection.images?.length) {
              const urls = await getImagesFromStore(elementSection.images);
              console.log("[PhotoGallery] getImagesFromStore", elementSection.name, urls);
              sections.push({
                name: elementSection.name,
                photos: urls.map((url) => ({ 
                  url: url.url,
                  isArchived: url.isArchived
                })),
              });
            }

            for (const component of elementSection.components || []) {
              if (component.images?.length) {
                const urls = await getImagesFromStore(component.images);
                sections.push({
                  name: `${elementSection.name} - ${component.name}`,
                  photos: urls.map((url) => ({ 
                    url: url.url,
                    isArchived: url.isArchived
                  })),
                });
              }
            }
          }
        }
      }

      setPhotoSections(sections);
    }

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
                      key={photoIndex}
                      className={`relative aspect-square w-full overflow-hidden bg-gray-100 dark:bg-gray-800 ${photo.isArchived ? 'grayscale' : ''}`}
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
                        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx4eHRoaHSQtJSEkLzYvLy02Mi85OEI2PTZFOT5ZXVlZfG1+fW6Ghn6QjpCOd3p3gHj/2wBDARUXFx4eHR8fHXhwLicucHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHD/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                      />
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
