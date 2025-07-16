"use client";

import React, { Suspense, useEffect, useState, use } from "react";
import BuildingSurveyForm from "../building-survey-reports/BuildingSurveyForm";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { surveyStore } from "@/app/home/clients/Database";
import Image from "next/image";
import { imageUploadStore } from "../../clients/ImageUploadStore";
import { getAllSurveyImages } from "../building-survey-reports/Survey";
import { useRouter } from "next/navigation";
import ImagePlaceholder from "../../components/ImagePlaceholder";
import { SurveyDocuments } from "../../components/SurveyDocuments";
import { ImageIcon } from "lucide-react";


interface PhotoGridProps {
  previewPhotos: string[];
  totalPhotos: number;
  galleryUrl: string;
}

const PhotoGrid = ({ previewPhotos, totalPhotos, galleryUrl }: PhotoGridProps) => {
  const router = useRouter();
  
  // Empty state when no photos
  if (previewPhotos.length === 0) {
    return (
      <div className="relative">
        <div 
          className="flex items-center justify-center rounded-lg bg-gray-50 border-2 border-dashed border-gray-300 aspect-[20/9]"
          onClick={() => router.push(galleryUrl)}
        >
          <div className="text-center">
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 text-lg font-medium">No photos yet</p>
          </div>
        </div>
      </div>
    );
  }

  // Single image layout
  if (previewPhotos.length === 1) {
    return (
      <div className="relative">
        <div 
          className="relative rounded-lg overflow-hidden aspect-[20/9]"
          onClick={() => router.push(galleryUrl)}
        >
          <Image 
            className="object-cover hover:opacity-80 transition-opacity duration-300" 
            src={previewPhotos[0]} 
            alt="Survey photo" 
            fill
            sizes="(max-width: 768px) 100vw, 66vw"
            priority
          />
        </div>
        <div className="absolute bottom-2 right-4 bg-white px-2 py-1 rounded-lg border-black border-1">  
          <Link
            className="flex gap-2 items-center"
            href={galleryUrl}>
              <LayoutGrid size={40} />
              <span className="text-sm">Photos</span>
          </Link>
          <span className="absolute -top-2 -left-2 bg-black text-white rounded-full px-1 text-xs">{totalPhotos}</span>
        </div>
      </div>
    );
  }

  // Three images layout (1 large + 2 smaller)
  if (previewPhotos.length === 3) {
    return (
      <div className="relative">
        <div 
          className="grid grid-cols-3 grid-rows-2 gap-1 rounded-lg overflow-hidden aspect-[20/9]"
          onClick={() => router.push(galleryUrl)}
        >
          <div className="row-span-2 col-span-2 relative w-full h-full">
            <Image 
              className="object-cover hover:opacity-80 transition-opacity duration-300" 
              src={previewPhotos[0]} 
              alt="Survey photo 1" 
              fill
              sizes="(max-width: 768px) 100vw, 44vw"
              priority
            />
          </div>
          
          {[1, 2].map((index) => (
            <div key={index} className="relative w-full h-full">
              <Image 
                className="object-cover hover:opacity-80 transition-opacity duration-300" 
                src={previewPhotos[index]} 
                alt={`Survey photo ${index + 1}`} 
                fill
                sizes="(max-width: 768px) 50vw, 22vw"
              />
            </div>
          ))}
        </div>
        <div className="absolute bottom-2 right-4 bg-white px-2 py-1 rounded-lg border-black border-1">  
          <Link
            className="flex gap-2 items-center"
            href={galleryUrl}>
              <LayoutGrid size={40} />
              <span className="text-sm">Photos</span>
          </Link>
          <span className="absolute -top-2 -left-2 bg-black text-white rounded-full px-1 text-xs">{totalPhotos}</span>
        </div>
      </div>
    );
  }

  // Five images layout (1 large + 4 smaller) - current layout
  return (
    <div className="relative">
      <div 
        className="grid grid-cols-4 grid-rows-2 gap-1 rounded-lg overflow-hidden aspect-[20/9]" 
        onClick={() => router.push(galleryUrl)}
      >
        <div className="row-span-2 col-span-2 relative w-full h-full">
          <Image 
            className="object-cover hover:opacity-80 transition-opacity duration-300" 
            src={previewPhotos[0]} 
            alt="Survey photo 1" 
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </div>

        {[1, 2, 3, 4].map((index) => (
          <div key={index} className="relative w-full h-full">
            {previewPhotos[index] ? (
              <Image 
                className="object-cover hover:opacity-80 transition-opacity duration-300" 
                src={previewPhotos[index]} 
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
          href={galleryUrl}>
            <LayoutGrid size={40} />
            <span className="text-sm">Photos</span>
        </Link>
        <span className="absolute -top-2 -left-2 bg-black text-white rounded-full px-1 text-xs">{totalPhotos}</span>
      </div>
    </div>
  );
}

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

      const photos = allPhotos.slice(0, 5);

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

  return (
    <>
      <div className="space-y-4 mx-auto lg:w-2/3">
        <div className="relative">
          <PhotoGrid 
            previewPhotos={photos}
            totalPhotos={photoCount}
            galleryUrl={`/home/surveys/${survey?.id}/photos`}
          />
        </div>
        <SurveyDocuments surveyId={params.id} />
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
