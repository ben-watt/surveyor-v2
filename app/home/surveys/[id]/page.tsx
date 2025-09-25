"use client";

import React, { Suspense, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import BuildingSurveyForm from "../building-survey-reports/BuildingSurveyForm";
import { surveyStore } from "@/app/home/clients/Database";
import { enhancedImageStore } from "../../clients/enhancedImageMetadataStore";
import { getAllSurveyImages } from "../building-survey-reports/Survey";
import { SurveyDocuments } from "../../components/SurveyDocuments";
import { CompactPhotoGrid } from "../components/CompactPhotoGrid";
import { useParams } from "next/navigation";



function FormSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

function Home() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [isHydrated, survey] = surveyStore.useGet(id);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoCount, setPhotoCount] = useState<number>(0);

  useEffect(() => {
    async function loadPhotos() {
      if (!survey) return [];
      const allPhotos = getAllSurveyImages(survey);
      setPhotoCount(allPhotos.filter(x => !x.isArchived).length);

      const photos = allPhotos.slice(0, 4);

      const result = await Promise.all(photos.filter(Boolean).map(async x => {
        const imageResult = await enhancedImageStore.getImageByPath(x.path);
        return imageResult;
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
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <FormSkeleton />
          </div>
          <div className="lg:sticky lg:top-24 space-y-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Alert>
          <AlertTitle>Survey not found</AlertTitle>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-2">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 order-1 lg:order-1">
          <Suspense fallback={<FormSkeleton />}>
            <BuildingSurveyForm id={id} />
          </Suspense>
        </div>

        <div className="order-2 lg:order-2 lg:sticky lg:top-24 space-y-4">
          <CompactPhotoGrid
            previewPhotos={photos}
            totalPhotos={photoCount}
            galleryUrl={`/home/surveys/${survey.id}/photos`}
            surveyId={survey.id}
          />

          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base">Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <SurveyDocuments surveyId={id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Home;
