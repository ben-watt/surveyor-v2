"use client"

import React, { useEffect } from 'react'
import BuildingSurveyForm from '../../building-survey-reports/BuildingSurveyForm';
import reportClient from '@/app/clients/ReportsClient';
import { BuildingSurveyFormData } from '../../building-survey-reports/BuildingSurveyReportSchema';


function Home({ params }: { params: { id: string }}) {
  return (
    <>
      <div className="container mx-auto px-5 ">
        <div className="flex justify-center">
          <h1 className="text-3xl dark:text-white mb-8 mt-8">Building Survey Report</h1>
        </div>
        <BuildingSurveyForm id={params.id} />
      </div>
    </>
  )
}

export default Home;