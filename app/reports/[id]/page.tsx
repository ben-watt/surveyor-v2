"use client";

import reportClient from "@/app/clients/ReportsClient";
import { TextEditor } from "@/app/components/TextEditor";
import React, { useEffect, useState } from "react";
import { renderToString } from "react-dom/server";
import BuildingSurveyReportTiny from "../building-survey-reports/BuildingSurveyReportTiny";
import { BuildingSurveyFormData } from "../building-survey-reports/BuildingSurveyReportData";

export default function Page({ params }: { params: { id: string } }) {

    const [reportData, setReport] = useState<BuildingSurveyFormData>();
    useEffect(() => {
        const getReport = async () => {
            let result = await reportClient.models.Reports.get({ id: params.id });

            if(!result.errors) {
                const formData = JSON.parse(result.data.content.toString()) as BuildingSurveyFormData
                setReport(formData)
            }
        }

        getReport()
    }, [])



    
    if(reportData == undefined) return (<div>Loading...</div>)

    console.log(reportData)
    return (<TextEditor initialValue={renderToString(<BuildingSurveyReportTiny form={reportData} />)} />)
  }