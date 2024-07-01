"use client";

import reportClient from "@/app/clients/ReportsClient";
import { ContentCss, TextEditor } from "@/app/components/TextEditor";
import React, { useEffect, useState } from "react";
import { renderToString } from "react-dom/server";
import BuildingSurveyReportTiny from "../building-survey-reports/BuildingSurveyReportTiny";
import { BuildingSurveyFormData } from "../building-survey-reports/BuildingSurveyReportSchema";
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

        const initialValue = await mapFormDataToTinyMceHtml(formData);
        setInitialValue(initialValue);

        if (typeof window !== "undefined" && window.innerWidth < 768) {
          setContentCss("mobile");
        }
      }
    };

    getReport();
  }, []);


  if(initialValue)
    return <TextEditor contentCss={"/styles.css"} initialValue={initialValue} />
  return <div>Loading...</div>;  
}

async function mapFormDataToTinyMceHtml(formData: BuildingSurveyFormData): Promise<string> {

  formData.frontElevationImagesUri = await getImagesHref(formData.frontElevationImagesUri);

  let newImages = formData.sections.map((section, si) => {
    return section.elementSections.map(async (es, i) => {
      formData.sections[si].elementSections[i].images = await getImagesHref(es.images);
    });
  })

  await Promise.all(newImages);
  return renderToString(<BuildingSurveyReportTiny form={formData} />);
}

async function getImagesHref(imagesUri: string[]): Promise<string[]> {
  return await Promise.all(imagesUri.map(async (imageUri) => {
    return await getImageHref(imageUri);
  }));
}

async function getImageHref(imageUri: string): Promise<string> {
  const path = await getUrl({
    path: imageUri,
  });

  return path.url.href;
}

