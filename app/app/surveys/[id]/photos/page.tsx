"use client";

import React, { useEffect, useState } from "react";
import { surveyStore } from "@/app/app/clients/Database";
import { getUrl } from "aws-amplify/storage";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

interface PhotoGalleryProps {
  params: {
    id: string;
  };
}

interface PhotoSection {
  name: string;
  photos: { url: string }[];
}

function PhotoGallery({ params }: PhotoGalleryProps) {
  const [isHydrated, survey] = surveyStore.useGet(params.id);
  const [photoSections, setPhotoSections] = useState<PhotoSection[]>([]);

  console.log("[PhotoGallery] photoSections", survey);

  useEffect(() => {
    async function getSignedUrls(
      imagePaths: string[]
    ): Promise<string[]> {
      return await Promise.all(
        imagePaths.map(async (path) => {
          const { url } = await getUrl({ path });
          return url.href;
        })
      );
    }

    async function loadPhotos() {
      if (!survey) return;

      const sections: PhotoSection[] = [];

      // Load money shot
      if (survey.reportDetails?.moneyShot?.length) {
        const urls = await Promise.all(
          survey.reportDetails.moneyShot.map(async (path) => {
            const { url } = await getUrl({ path });
            return { url: url.href };
          })
        );

        sections.push({
          name: "Money Shot",
          photos: urls.map((url) => ({ url: url.url })),
        });
      }

      // Load front elevation images
      if (survey.reportDetails?.frontElevationImagesUri?.length) {
        const urls = await Promise.all(
          survey.reportDetails.frontElevationImagesUri.map(async (path) => {
            const { url } = await getUrl({ path });
            return {
              url: url.href,
              path: survey.reportDetails.frontElevationImagesUri[0],
            };
          })
        );

        sections.push({
          name: "Front Elevation",
          photos: urls.map((url) => ({ url: url.url })),
        });
      }

      // Load component images
      if (survey.sections?.length) {
        for (const section of survey.sections) {

          for (const elementSection of section.elementSections || []) {
            if (elementSection.images?.length) {
              const urls = await getSignedUrls(elementSection.images);
              
              console.log("[PhotoGallery] getSignedUrls", elementSection.name, urls);
              sections.push({
                name: elementSection.name,
                photos: urls.map((url) => ({ url: url })),
              });
            }

            for (const component of elementSection.components || []) {
              if (component.images?.length) {
                const urls = await getSignedUrls(component.images);
                sections.push({
                  name: `${elementSection.name} - ${component.name}`,
                  photos: urls.map((url) => ({ url: url })),
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
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
      </div>

      <div className="space-y-6">
        {photoSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            <p className="text-sm mb-2">
              {section.name}
              <span className="text-sm text-gray-600 dark:text-gray-400 font-normal ml-2">
                ({section.photos.length})
              </span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
              {section.photos.map((photo, photoIndex) => (
                <div
                  key={photoIndex}
                  className="relative aspect-square w-full overflow-hidden bg-gray-100 dark:bg-gray-800"
                >
                  <Image
                    src={photo.url}
                    alt={`${section.name} photo ${photoIndex + 1}`}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                    className="object-cover hover:scale-105 transition-transform duration-300"
                    loading={
                      sectionIndex === 0 && photoIndex < 6 ? "eager" : "lazy"
                    }
                    quality={75}
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx4eHRoaHSQtJSEkLzYvLy02Mi85OEI2PTZFOT5ZXVlZfG1+fW6Ghn6QjpCOd3p3gHj/2wBDARUXFx4eHR8fHXhwLicucHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHD/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PhotoGallery;
