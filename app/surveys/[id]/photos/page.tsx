"use client";

import React, { useEffect, useState } from "react";
import { surveyStore } from "@/app/clients/Database";
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
  photos: { url: string; section: string }[];
}

function PhotoGallery({ params }: PhotoGalleryProps) {
  const [isHydrated, survey] = surveyStore.useGet(params.id);
  const [photoSections, setPhotoSections] = useState<PhotoSection[]>([]);

  useEffect(() => {
    async function loadPhotos() {
      if (!survey) return;

      const sections: PhotoSection[] = [];

      // Load money shot
      if (survey.reportDetails?.moneyShot?.length) {
        const urls = await Promise.all(
          survey.reportDetails.moneyShot.map(async (path) => {
            const { url } = await getUrl({ path });
            return { url: url.href, section: "Money Shot" };
          })
        );
        sections.push({ name: "Money Shot", photos: urls });
      }

      // Load front elevation images
      if (survey.reportDetails?.frontElevationImagesUri?.length) {
        const urls = await Promise.all(
          survey.reportDetails.frontElevationImagesUri.map(async (path) => {
            const { url } = await getUrl({ path });
            return { url: url.href, section: "Front Elevation" };
          })
        );
        sections.push({ name: "Front Elevation", photos: urls });
      }

      // Load component images
      if (survey.sections?.length) {
        for (const section of survey.sections) {
          const sectionPhotos: { url: string; section: string }[] = [];
          
          for (const elementSection of section.elementSections || []) {
            if (elementSection.images?.length) {
              const urls = await Promise.all(
                elementSection.images.map(async (path) => {
                  const { url } = await getUrl({ path });
                  return {
                    url: url.href,
                    section: elementSection.name,
                  };
                })
              );
              sectionPhotos.push(...urls);
            }
          }
          
          if (sectionPhotos.length > 0) {
            sections.push({ name: section.name, photos: sectionPhotos });
          }
        }
      }

      setPhotoSections(sections);
    }

    if (isHydrated && survey) {
      loadPhotos();
    }
  }, [isHydrated, survey]);

  const totalPhotos = photoSections.reduce((total, section) => total + section.photos.length, 0);

  if (!isHydrated) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl dark:text-white">Photo Gallery</h1>
          <p className="text-gray-600 dark:text-gray-400">{totalPhotos} photos total</p>
        </div>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
      </div>
      
      <div className="space-y-8">
        {photoSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="space-y-4">
            <h2 className="text-xl font-semibold dark:text-white">
              {section.name}
              <span className="text-gray-600 dark:text-gray-400 text-base font-normal ml-2">
                ({section.photos.length} photos)
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {section.photos.map((photo, photoIndex) => (
                <div
                  key={photoIndex}
                  className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg group hover:shadow-xl transition-shadow"
                >
                  <div className="relative aspect-[4/3] w-full">
                    <Image
                      src={photo.url}
                      alt={`Photo from ${section.name} - ${photo.section}`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      loading={sectionIndex === 0 && photoIndex < 3 ? "eager" : "lazy"}
                      quality={75}
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx4eHRoaHSQtJSEkLzYvLy02Mi85OEI2PTZFOT5ZXVlZfG1+fW6Ghn6QjpCOd3p3gHj/2wBDARUXFx4eHR8fHXhwLicucHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHD/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                    />
                  </div>
                  {photo.section !== section.name && (
                    <div className="p-4">
                      <h3 className="text-sm text-gray-600 dark:text-gray-400">
                        {photo.section}
                      </h3>
                    </div>
                  )}
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