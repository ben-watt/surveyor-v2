"use client"

import React, { Suspense } from 'react'
import BuildingSurveyForm from '../building-survey-reports/BuildingSurveyForm';
import { useSearchParams } from 'next/navigation';


function Home() {
  const searchParams = useSearchParams();
  const newFormId = searchParams.get("id");

  if(newFormId === null) {
    return <div>Unable to create a report with an id.</div>
  }

  return (
    <>
      <div className="container mx-auto px-5 ">
        <div className="flex justify-center">
          <h1 className="text-3xl dark:text-white mb-8 mt-8">Building Survey Report</h1>
        </div>
        <BuildingSurveyForm id={newFormId} />
      </div>
    </>
  )
}

export default Home;