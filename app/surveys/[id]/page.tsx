"use client";

import React, { Suspense } from "react";
import BuildingSurveyForm from "../building-survey-reports/BuildingSurveyForm";

function Home({ params }: { params: { id: string } }) {
  return (
    <>
      <div className="container mx-auto px-5 ">
        <div className="flex justify-center">
          <h1 className="text-3xl dark:text-white mb-8 mt-8">
            Building Survey Report
          </h1>
        </div>
        <Suspense fallback={<div>Loading...</div>}>
          <BuildingSurveyForm id={params.id} />
        </Suspense>
      </div>
    </>
  );
}

export default Home;
