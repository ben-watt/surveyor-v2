/* eslint-disable @next/next/no-img-element */
"use client";

import { NewEditor } from "@/app/app/components/Input/BlockEditor";
import { Previewer } from "pagedjs";
import React from "react";
import { BuildingSurveyFormData } from "@/app/app/surveys/building-survey-reports/BuildingSurveyReportSchema";
import BuildingSurveyReport from "@/app/app/surveys/building-survey-reports/BuildingSurveyReportTipTap";
import { renderToStaticMarkup } from "react-dom/server";
import { getUrl } from "aws-amplify/storage";
import { surveyStore } from "@/app/app/clients/Database";

// Custom hook for managing editor state
const useEditorState = (surveyId: string) => {
  const [editorContent, setEditorContent] = React.useState<string>("");
  const [editorData, setEditorData] = React.useState<BuildingSurveyFormData>();
  const [previewContent, setPreviewContent] = React.useState<string>("");
  const [headerFooterHtml, setHeaderFooterHtml] = React.useState<string>("");

  React.useEffect(() => {
    const getReport = async () => {
      try {
        const survey = await surveyStore.get(surveyId);
        setEditorData(survey.content);
      } catch (error) {
        console.error("Failed to fetch survey:", error);
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
  };
};

// Utility function for image loading
async function getImagesHref(imagesUri: string[]): Promise<string[]> {
  if (!imagesUri?.length) return [];

  try {
    const tasks = imagesUri.map(getImageHref);
    return await Promise.all(tasks);
  } catch (error) {
    console.error("Failed to get image hrefs:", error);
    return [];
  }
}

async function getImageHref(imageUri: string): Promise<string> {
  try {
    const path = await getUrl({ path: imageUri });
    return path.url.href;
  } catch (error) {
    console.error(`Failed to get image href for ${imageUri}:`, error);
    return "";
  }
}

// Preview component
const PrintPreviewer = ({ content }: { content: string }) => {
  const previewRef = React.useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [previewer, setPreviewer] = React.useState<Previewer>();

  React.useEffect(() => {
    async function init() {
      try {
        if (!previewer) {
          setPreviewer(new Previewer({}));
          return;
        }

        if (previewRef.current) {
          previewRef.current.replaceChildren();
          try {
            const flow = await previewer.preview(
              content,
              ["/pagedstyles.css", "/interface.css"],
              previewRef.current
            );
            console.debug("Preview rendered pages:", flow.pages);
            setIsInitialized(true);
          } catch (error) {
            console.error("Failed to initialize preview:", error);
          }
        }
      } catch (error) {
        console.error("Failed to initialize preview:", error);
      }
    }

    init();
  }, [content, previewer]);

  return (
    <div>
      {!isInitialized && <div>Loading...</div>}
      <div className="pagedjs_print_preview tiptap">
        <div ref={previewRef} />
      </div>
    </div>
  );
};

// Header/Footer component
const HeaderFooterHtml = ({ editorData }: { editorData: BuildingSurveyFormData | undefined }) => (
  <>
    <img
      className="headerImage"
      src="/cwbc-logo.webp"
      alt="CWBC Logo"
      width="600"
      height="400"
    />
    <div className="headerAddress">
      <p>{editorData ? editorData.reportDetails.address.formatted : "Unknown"}</p>
    </div>
    <img
      className="footerImage"
      src="/rics-purple-logo.jpg"
      alt="RICS Logo"
      width="600"
      height="400"
    />
  </>
);

async function mapFormDataToHtml(
  formData: BuildingSurveyFormData | undefined
): Promise<string> {
  if (!formData) return "";

  try {
    const newFormData = { ...formData };

    const [frontElevationImages, moneyShot, signaturePath] = await Promise.all([
      getImagesHref(formData.reportDetails.frontElevationImagesUri ?? []),
      getImagesHref(formData.reportDetails.moneyShot ?? []),
      getImagesHref(formData.owner.signaturePath ?? []),
    ]);

    newFormData.reportDetails.frontElevationImagesUri = frontElevationImages;
    newFormData.reportDetails.moneyShot = moneyShot;
    newFormData.owner.signaturePath = signaturePath;

    const sectionImageTasks = formData.sections.map(async (section, si) => {
      const elementSectionTasks = section.elementSections.map(async (es, i) => {
        const preSignedUrl = await getImagesHref(es.images ?? []);
        newFormData.sections[si].elementSections[i].images = preSignedUrl;
      });
      await Promise.all(elementSectionTasks);
    });

    await Promise.all(sectionImageTasks);

    return renderToStaticMarkup(<BuildingSurveyReport form={newFormData} />);
  } catch (error) {
    console.error("Failed to map form data to HTML:", error);
    return "";
  }
}

// Main page component
export default function Page({ params }: { params: { id: string } }) {
  const [preview, setPreview] = React.useState(false);
  const { editorContent, previewContent, headerFooterHtml, setPreviewContent } = useEditorState(params.id);

  const handleEditorUpdate = (html: string) => {
    setPreviewContent(headerFooterHtml + html);
  };

  return (
    <div>
      <div className="w-[962px] m-auto">
        {editorContent && !preview && (
          <NewEditor
            content={editorContent}
            onCreate={(e) => handleEditorUpdate(e.editor.getHTML())}
            onUpdate={(e) => handleEditorUpdate(e.editor.getHTML())}
            onPrint={() => setPreview(true)}
          />
        )}
      </div>
      {preview && <PrintPreviewer content={previewContent} />}
    </div>
  );
}
