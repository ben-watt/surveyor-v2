"use client";

import React, { useEffect, useState } from "react";
import { surveyStore } from "@/app/home/clients/Database";
import { enhancedImageStore } from "@/app/home/clients/enhancedImageMetadataStore";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { ProgressiveImage } from "@/app/home/components/ProgressiveImage";
import { SurveyImage } from "@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema";

interface PhotoSection {
  name: string;
  imageIds: string[]; // Changed from photos to imageIds
}

function PhotoGalleryEnhanced() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [isHydrated, survey] = surveyStore.useGet(id);
  const [photoSections, setPhotoSections] = useState<PhotoSection[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const router = useRouter();

  console.log("[PhotoGalleryEnhanced] survey", survey);

  useEffect(() => {
    async function getImageIds(imagePaths: SurveyImage[]): Promise<string[]> {
      const result = await enhancedImageStore.getActiveImages();
      if (!result.ok) return [];

      // Map from imagePath to imageId
      const imageIds: string[] = [];
      for (const surveyImage of imagePaths) {
        const matchingImage = result.val.find(img =>
          img.imagePath === surveyImage.imagePath
        );
        if (matchingImage) {
          imageIds.push(matchingImage.id);
        }
      }
      return imageIds;
    }

    if (isHydrated && survey?.surveyData) {
      const sections: PhotoSection[] = [];

      // Process each section that has images
      Object.entries(survey.surveyData).forEach(([sectionName, sectionData]) => {
        if (typeof sectionData === 'object' && sectionData !== null) {
          // Look for image arrays in the section
          Object.entries(sectionData).forEach(([fieldName, fieldValue]) => {
            if (Array.isArray(fieldValue) && fieldValue.length > 0) {
              // Check if this looks like an image array
              const firstItem = fieldValue[0];
              if (firstItem && typeof firstItem === 'object' && 'imagePath' in firstItem) {
                getImageIds(fieldValue as SurveyImage[]).then(imageIds => {
                  if (imageIds.length > 0) {
                    sections.push({
                      name: `${sectionName} - ${fieldName}`,
                      imageIds
                    });
                    setPhotoSections([...sections]);
                  }
                });
              }
            }
          });
        }
      });
    }
  }, [isHydrated, survey]);

  if (!isHydrated) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Survey
        </button>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Show Archived Photos
          </label>
        </div>
      </div>

      {/* Survey Title */}
      {survey && (
        <h1 className="text-3xl font-bold mb-6">
          Photos for {survey.address}
        </h1>
      )}

      {/* Photo Sections */}
      {photoSections.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No photos found for this survey.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {photoSections.map((section, index) => (
            <PhotoSectionEnhanced
              key={index}
              section={section}
              showArchived={showArchived}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PhotoSectionEnhancedProps {
  section: PhotoSection;
  showArchived: boolean;
}

function PhotoSectionEnhanced({ section, showArchived }: PhotoSectionEnhancedProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">{section.name}</h2>

      {section.imageIds.length === 0 ? (
        <p className="text-gray-500">No photos in this section.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {section.imageIds.map((imageId) => (
            <PhotoCardEnhanced
              key={imageId}
              imageId={imageId}
              showArchived={showArchived}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PhotoCardEnhancedProps {
  imageId: string;
  showArchived: boolean;
}

function PhotoCardEnhanced({ imageId, showArchived }: PhotoCardEnhancedProps) {
  const [hydrated, image] = enhancedImageStore.useGet(imageId);

  // Hide archived images unless explicitly showing them
  if (!hydrated || !image || (image.isArchived && !showArchived)) {
    return null;
  }

  const handleArchiveToggle = async () => {
    if (image.isArchived) {
      await enhancedImageStore.unarchiveImage(imageId);
    } else {
      await enhancedImageStore.archiveImage(imageId);
    }
  };

  return (
    <div className="relative group">
      <ProgressiveImage
        imageId={imageId}
        className="aspect-square object-cover rounded-lg"
        alt={image.caption || image.fileName || 'Survey photo'}
      />

      {/* Archive toggle overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
        <div className="absolute bottom-2 right-2">
          <button
            onClick={handleArchiveToggle}
            className={`px-2 py-1 text-xs rounded ${
              image.isArchived
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            {image.isArchived ? 'Unarchive' : 'Archive'}
          </button>
        </div>

        {/* Metadata overlay */}
        {(image.caption || image.notes) && (
          <div className="absolute bottom-2 left-2 right-16 text-white text-xs">
            {image.caption && (
              <div className="font-medium">{image.caption}</div>
            )}
            {image.notes && (
              <div className="opacity-75">{image.notes}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PhotoGalleryEnhanced;