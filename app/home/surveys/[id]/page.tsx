"use client";

import React, { Suspense, useEffect, useState, use } from "react";
import BuildingSurveyForm from "../building-survey-reports/BuildingSurveyForm";
import { surveyStore } from "@/app/home/clients/Database";
import { imageUploadStore } from "../../clients/ImageUploadStore";
import { getAllSurveyImages } from "../building-survey-reports/Survey";
import { SurveyDocuments } from "../../components/SurveyDocuments";
import { CompactPhotoGrid } from "../components/CompactPhotoGrid";



function Home(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const [isHydrated, survey] = surveyStore.useGet(params.id);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoCount, setPhotoCount] = useState<number>(0);

  useEffect(() => {
    async function loadPhotos() {
      if (!survey) return [];
      const allPhotos = getAllSurveyImages(survey);
      setPhotoCount(allPhotos.filter(x => !x.isArchived).length);

      const photos = allPhotos.slice(0, 4);

      const result = await Promise.all(photos.filter(Boolean).map(async x => {
        const url = await imageUploadStore.get(x.path);
        return url;
      }));

      if(result.every(x => x.ok)) {
        return result.map(x => x.val.href);
      }
      return [];
    }

    loadPhotos().then(x => setPhotos(x));
  }, [survey]);

  if (!isHydrated) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div>Loading...</div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div>Survey not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* New Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Form Sections */}
        <div className="lg:col-span-2 order-2 lg:order-1">
          <Suspense fallback={<div>Loading survey form...</div>}>
            <BuildingSurveyForm id={params.id} />
          </Suspense>
        </div>
        
        {/* Sidebar - Photos & Documents */}
        <div className="order-1 lg:order-2">
          <CompactPhotoGrid
            previewPhotos={photos}
            totalPhotos={photoCount}
            galleryUrl={`/home/surveys/${survey.id}/photos`}
            surveyId={survey.id}
          />
          <SurveyDocuments surveyId={params.id} />
        </div>
      </div>
    </div>
  );
}

export default Home;
