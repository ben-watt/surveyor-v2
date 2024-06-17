"use client";

import reportClient from "@/app/clients/ReportsClient";
import { ContentCss, TextEditor } from "@/app/components/TextEditor";
import React, { useEffect, useState } from "react";
import { renderToString } from "react-dom/server";
import BuildingSurveyReportTiny from "../building-survey-reports/BuildingSurveyReportTiny";
import { BuildingSurveyFormData } from "../building-survey-reports/BuildingSurveyReportData";
import { getUrl } from "aws-amplify/storage";

export default function Page({ params }: { params: { id: string } }) {
  const [initialValue, setInitialValue] = useState<string>();
  const [contentCss, setContentCss] = useState<ContentCss>("document");

  useEffect(() => {
    const getReport = async () => {
      let result = await reportClient.models.Reports.get({ id: params.id });

      if (!result.errors && result.data != null) {
        const formData = JSON.parse(
          result.data.content.toString()
        ) as BuildingSurveyFormData;

        const path = await getUrl({
          path: formData.frontElevationImagesUri[0],
        });

        formData.frontElevationImagesUri = [path.url.href];
        setInitialValue(renderToString(<BuildingSurveyReportTiny form={formData} />));

        if (typeof window !== "undefined" && window.innerWidth < 768) {
          setContentCss("mobile");
        }
      }
    };

    getReport();
  }, []);


  if(initialValue)
    return <TextEditor contentCss={contentCss} initialValue={initialValue} />
  return <div>Loading...</div>;  
}

function resolve(path : string, obj : any) : any {
  return path.split('.').reduce(function(prev, curr) {
      return prev ? prev[curr] : null
  }, obj || self)
}
