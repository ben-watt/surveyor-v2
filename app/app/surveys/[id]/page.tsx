"use client";

import React, { Suspense, useEffect, useState } from "react";
import BuildingSurveyForm from "../building-survey-reports/BuildingSurveyForm";
import Link from "next/link";
import { Grid, Images, LayoutGrid, Image as ImageIcon } from "lucide-react";
import { sectionStore, surveyStore } from "@/app/app/clients/Database";
import Image from "next/image";
import { imageUploadStore } from "../../clients/ImageUploadStore";
import { getAllSurveyImages } from "../building-survey-reports/Survey";
import router from "next/router";

function ImagePlaceholder() {
  return (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <ImageIcon className="w-8 h-8 text-gray-400" />
    </div>
  );
}

function Home({ params }: { params: { id: string } }) {
  const [isHydrated, survey] = surveyStore.useGet(params.id);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoCount, setPhotoCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPhotos() {
      setIsLoading(true);
      if (!survey) return [];
      const allPhotos = getAllSurveyImages(survey).slice(0, 5);
      setPhotoCount(allPhotos.length);

      const photos = allPhotos.slice(0, 5);

      const result = await Promise.all(photos.filter(Boolean).map(async x => {
        const url = await imageUploadStore.get(x);
        return url;
      }));

      setIsLoading(false);
      if(result.every(x => x.ok)) {
        return result.map(x => x.val.href);
      }
      return [];
    }

    loadPhotos().then(x => setPhotos(x));
  }, [survey]);

  return (
    <>
      <div>
        <div className="mx-auto lg:w-2/3 relative">
          <div 
            className="grid grid-cols-4 grid-rows-2 gap-1 rounded-lg overflow-hidden aspect-[20/9]" 
            onClick={() => router.push(`/app/surveys/${params.id}/photos`)}
          >
            <div className="row-span-2 col-span-2 relative w-full h-full">


              {isLoading ? (
                <ImagePlaceholder />
              ) : photos[0] ? (
                <Image 
                  className="object-cover hover:opacity-80 transition-opacity duration-300" 
                  src={photos[0]} 
                  alt="Survey photo 1" 
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              ) : (
                <ImagePlaceholder />
              )}
            </div>

            {[1, 2, 3, 4].map((index) => (
              <div key={index} className="relative w-full h-full">
                {isLoading ? (
                  <ImagePlaceholder />
                ) : photos[index] ? (
                  <Image 
                    className="object-cover hover:opacity-80 transition-opacity duration-300" 
                    src={photos[index]} 
                    alt={`Survey photo ${index + 1}`} 
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                ) : (
                  <ImagePlaceholder />
                )}
              </div>
            ))}
          </div>
          <div className="absolute bottom-2 right-4 bg-white px-2 py-1 rounded-lg border-black border-1">  
            <Link
              className="flex gap-2 items-center"
              href={`/app/surveys/${params.id}/photos`}>
                <LayoutGrid size={40} />
                <span className="text-sm">Photos</span>
            </Link>

            <span className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full px-1 text-xs">{isHydrated ? `${photoCount}` : "-"}</span>
          </div>
        </div>
        <div className="container mx-auto p-0 px-0 lg:px-16 xl:px-96">  
          <Suspense fallback={<div>Loading...</div>}>
            <BuildingSurveyForm id={params.id} />
          </Suspense>
        </div>
      </div>
    </>
  );
}

export default Home;
