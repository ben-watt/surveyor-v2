"use client"

import React, { useEffect } from 'react'
import BuildingSurveyForm from '../../building-survey-reports/BuildingSurveyForm';
import reportClient from '@/app/clients/ReportsClient';
import { BuildingSurveyFormData } from '../../building-survey-reports/BuildingSurveyReportSchema';


function Home({ params }: { params: { id: string }}) {
  const [existingFormData, setExistingFormData] = React.useState<BuildingSurveyFormData>();
  
  useEffect(() => {
    const getReport = async () => {
      let result = await reportClient.models.Reports.get({ id: params.id });

      if (!result.errors && result.data != null) {
        const formData = JSON.parse(
          result.data.content.toString()
        ) as BuildingSurveyFormData;

        setExistingFormData(formData);
      }
    };

    getReport();
  }, []);


  return (
    <>
      <div className="container mx-auto px-5 ">
        <div className="flex justify-center">
          <h1 className="text-3xl dark:text-white mb-8 mt-8">Building Survey Report</h1>
        </div>
        {existingFormData && <BuildingSurveyForm initDefaultValues={existingFormData} />} 
      </div>
    </>
  )
}

export default Home;