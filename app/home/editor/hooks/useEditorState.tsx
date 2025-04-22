import React from "react";
import { BuildingSurveyFormData } from "@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema";
import { surveyStore } from "@/app/home/clients/Database";
import { mapFormDataToHtml } from "../utils/formData";
import { Footer, Header, TitlePage } from "../components/HeaderFooter";
import { renderToStaticMarkup } from "react-dom/server";

export const useEditorState = (surveyId: string) => {
  const [editorContent, setEditorContent] = React.useState<string>("");
  const [editorData, setEditorData] = React.useState<BuildingSurveyFormData>();
  const [previewContent, setPreviewContent] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [header, setHeader] = React.useState<string>("");
  const [footer, setFooter] = React.useState<string>("");
  const [titlePage, setTitlePage] = React.useState<string>("");

  React.useEffect(() => {
    const getReport = async () => {
      try {
        setIsLoading(true);
        const survey = await surveyStore.get(surveyId);
        if (survey) {
          setEditorData(survey.content);
        }
      } catch (error) {
        console.error("Failed to fetch survey:", error);
      } finally {
        setIsLoading(false);
      }
    };

    getReport();
  }, [surveyId]);

  const renderFooter = React.useCallback(
    () => renderToStaticMarkup(<Footer editorData={editorData} />),
    [editorData]
  );

  const renderTitlePage = React.useCallback(
    () => renderToStaticMarkup(<TitlePage editorData={editorData} />),
    [editorData]
  );

  const renderHeader = React.useCallback(
    () => renderToStaticMarkup(<Header editorData={editorData} />),
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
    setHeader(renderHeader());
  }, [renderHeader]);

  React.useEffect(() => {
    setFooter(renderFooter());
  }, [renderFooter]);

  React.useEffect(() => { 
    setTitlePage(renderTitlePage());
  }, [renderTitlePage]);

  return {
    editorContent,
    previewContent,
    header,
    footer,
    titlePage,
    setPreviewContent,
    isLoading,
  };
}; 