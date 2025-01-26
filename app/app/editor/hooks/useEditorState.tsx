import React from "react";
import { BuildingSurveyFormData } from "@/app/app/surveys/building-survey-reports/BuildingSurveyReportSchema";
import { surveyStore } from "@/app/app/clients/Database";
import { mapFormDataToHtml } from "../utils/formData";
import { HeaderFooterHtml } from "../components/HeaderFooter";
import { renderToStaticMarkup } from "react-dom/server";

export const useEditorState = (surveyId: string) => {
  const [editorContent, setEditorContent] = React.useState<string>("");
  const [editorData, setEditorData] = React.useState<BuildingSurveyFormData>();
  const [previewContent, setPreviewContent] = React.useState<string>("");
  const [headerFooterHtml, setHeaderFooterHtml] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const getReport = async () => {
      try {
        setIsLoading(true);
        const survey = await surveyStore.get(surveyId);
        setEditorData(survey.content);
      } catch (error) {
        console.error("Failed to fetch survey:", error);
      } finally {
        setIsLoading(false);
      }
    };

    getReport();
  }, [surveyId]);

  const renderHeaderFooter = React.useCallback(
    () => renderToStaticMarkup(<HeaderFooterHtml editorData={editorData} />),
    [editorData]
  );

  const mapToEditorContent = React.useCallback(async () => {
    try {
      const html = await mapFormDataToHtml(editorData);
      setEditorContent(html);
    } catch (error) {
      console.error("Failed to map form data to HTML:", error);
    }
  }, [editorData]);

  React.useEffect(() => {
    mapToEditorContent();
  }, [mapToEditorContent]);

  React.useEffect(() => {
    setHeaderFooterHtml(renderHeaderFooter());
  }, [renderHeaderFooter]);

  return {
    editorContent,
    previewContent,
    headerFooterHtml,
    setPreviewContent,
    isLoading,
  };
}; 