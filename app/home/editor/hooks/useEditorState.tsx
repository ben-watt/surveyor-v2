import React from "react";
import { BuildingSurveyFormData, formatAddress } from "@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema";
import { surveyStore } from "@/app/home/clients/Database";
import { mapFormDataToHtml } from "../utils/formData";
import { Footer, Header, TitlePage } from "../components/HeaderFooter";
import { renderToStaticMarkup } from "react-dom/server";
import { Editor } from "@tiptap/react";
import { documentStore } from "../../clients/DocumentStore";

type TemplateId = "building-survey";

export const useDocumentTemplate = (surveyId: string, templateId: TemplateId) => {
  const [editorContent, setEditorContent] = React.useState<string>("");
  const [editorData, setEditorData] = React.useState<BuildingSurveyFormData>();
  const [previewContent, setPreviewContent] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [header, setHeader] = React.useState<string>("");
  const [footer, setFooter] = React.useState<string>("");
  const [titlePage, setTitlePage] = React.useState<string>("");

  if(templateId !== "building-survey") {
    throw new Error("Invalid template id");
  }

  // Load initial data
  React.useEffect(() => {
    const getReport = async () => {
      try {
        setIsLoading(true);
        const document = await surveyStore.get(surveyId);
        if (document) {
          setEditorData(document.content);
        }
      } catch (error) {
        console.error("Failed to fetch survey:", error);
        setIsLoading(false);
      }
    };

    getReport();
  }, [surveyId]);

  // Render header, footer, and title page when editorData changes
  React.useEffect(() => {
    if (editorData) {
      const newHeader = renderToStaticMarkup(<Header editorData={editorData} />);
      const newFooter = renderToStaticMarkup(<Footer editorData={editorData} />);
      const newTitlePage = renderToStaticMarkup(<TitlePage editorData={editorData} />);
      
      setHeader(newHeader);
      setFooter(newFooter);
      setTitlePage(newTitlePage);
    }
  }, [editorData]);

  // Map form data to HTML when editorData changes
  React.useEffect(() => {
    const updateContent = async () => {
      if (editorData && header && footer && titlePage) {
        try {
          const html = await mapFormDataToHtml(editorData);
          setEditorContent(html);
          setPreviewContent(titlePage + header + footer + html);
          setIsLoading(false);
        } catch (error) {
          console.error("[useEditorState] Failed to map form data to HTML", error);
          setIsLoading(false);
        }
      }
    };

    updateContent();
  }, [editorData, header, footer, titlePage]);

  const addTitleHeaderFooter = React.useCallback(({editor}: {editor: Editor}) => {
    const currentEditorHtml = editor.getHTML();
    setEditorContent(currentEditorHtml);
    setPreviewContent(titlePage + header + footer + currentEditorHtml);
  }, [titlePage, header, footer]);

  const getDocName = async () => {
    const document = await surveyStore.get(surveyId);
    if (document) {
      return formatAddress(document.content.reportDetails.address);
    }
    return surveyId;
  }

  return {
    editorContent,
    previewContent,
    header,
    footer,
    titlePage,
    setPreviewContent,
    addTitleHeaderFooter,
    getDocName,
    isLoading,
  };
};