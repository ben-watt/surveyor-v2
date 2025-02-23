"use client";

import React, { Suspense, useEffect, useState } from "react";
import BuildingSurveyForm from "../building-survey-reports/BuildingSurveyForm";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { surveyStore } from "@/app/app/clients/Database";
import Image from "next/image";
import { imageUploadStore } from "../../clients/ImageUploadStore";
import { getAllSurveyImages } from "../building-survey-reports/Survey";
import { useRouter } from "next/navigation";
import ImagePlaceholder from "../../components/ImagePlaceholder";

function Home({ params }: { params: { id: string } }) {
  const [isHydrated, survey] = surveyStore.useGet(params.id);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoCount, setPhotoCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

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
      <div className="space-y-4 mx-auto lg:w-2/3">
        <div className="relative">
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

            <span className="absolute -top-2 -left-2 bg-black text-white rounded-full px-1 text-xs">{isHydrated ? `${photoCount}` : "-"}</span>
          </div>
        </div>
        <div> 
          <Suspense fallback={<div>Loading...</div>}>
            <BuildingSurveyForm id={params.id} />
          </Suspense>
        </div>
      </div>
    </>
  );
}

export default Home;
