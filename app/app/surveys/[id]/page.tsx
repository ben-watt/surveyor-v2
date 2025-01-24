"use client";

import React, { Suspense } from "react";
import BuildingSurveyForm from "../building-survey-reports/BuildingSurveyForm";
import Link from "next/link";
import { Images } from "lucide-react";
import { surveyStore } from "@/app/app/clients/Database";

function Home({ params }: { params: { id: string } }) {
  const [isHydrated, survey] = surveyStore.useGet(params.id);

  const getPhotoCount = () => {
    if (!survey) return 0;
    
    const moneyShot = survey.reportDetails?.moneyShot?.length || 0;
    const frontElevation = survey.reportDetails?.frontElevationImagesUri?.length || 0;
    const sectionPhotos = survey.sections?.reduce((total, section) => {
      return total + (section.elementSections?.reduce((sectionTotal, element) => {
        const elementImages = element.images?.length || 0;
        const componentImages = element.components?.reduce((componentTotal, component) => {
          return componentTotal + (component.images?.length || 0);
        }, 0) || 0;
        return sectionTotal + elementImages + componentImages;
      }, 0) || 0);
    }, 0) || 0;

    return moneyShot + frontElevation + sectionPhotos;
  };

  return (
    <>
      <div className="container mx-auto p-0 px-0 lg:px-16 xl:px-96">
        <div className="space-y-4 mb-8 mt-8">
          <h1 className="text-3xl dark:text-white text-center">Building Survey Report</h1>
          <div className="flex relative">
            <Link
              href={`/app/surveys/${params.id}/photos`}
              className="inline-flex flex-col items-center p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors group"
            >
                <Images size={40} />
            </Link>
            <span className="absolute -top-1 -left-1 bg-red-500 text-white rounded-full px-1 text-xs">{isHydrated ? `${getPhotoCount()}` : "-"}</span>
          </div>
        </div>
        <Suspense fallback={<div>Loading...</div>}>
          <BuildingSurveyForm id={params.id} />
        </Suspense>
      </div>
    </>
  );
}

export default Home;
