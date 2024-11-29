"use client";

import reportClient from "@/app/clients/AmplifyDataClient";
import { NewEditor } from "@/app/components/Input/BlockEditor";

import { Previewer } from "pagedjs";
import React, { useCallback, useEffect } from "react";
import { useRef, useState } from "react";
import { BuildingSurveyFormData } from "@/app/surveys/building-survey-reports/BuildingSurveyReportSchema";
import BuildingSurveyReport from "@/app/surveys/building-survey-reports/BuildingSurveyReportTipTap";
import { renderToStaticMarkup } from "react-dom/server";
import { getUrl } from "aws-amplify/storage";
import toast from "react-hot-toast";

export default function Page({ params }: { params: { id: string } }) {
  const [editorContent, setEditorContent] = useState<string>("");
  const [editorData, setEditorData] = useState<BuildingSurveyFormData>();
  const [previewContent, setPreviewContent] = useState<string>("");
  const [headerFooterHtml, setHeaderFooterHtml] = useState<string>("");
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    const getReport = async () => {
      try {
        let result = await reportClient.models.Surveys.get({ id: params.id });
        console.log(result)

        if (!result.errors && result.data != null) {
          const formData = JSON.parse(
            result.data.content.toString()
          ) as BuildingSurveyFormData;
  
          console.debug("[BuildingSurveyReport]", "Fetched form data", formData);
          setEditorData(formData);
        } else {
          console.error("[BuildingSurveyReport]", "Error fetching report", result);
          toast.error("Error fetching report data");
        }
      } catch(e) {
        toast.error("Error fetching report data");
        console.error("[BuildingSurveyReport]", "Error fetching report", e);
      }
      
    };

    console.debug("[BuildingSurveyReport]", "Getting report data", params.id);
    getReport();
  }, [params.id]);

  const renderHeaderFooter = useCallback(
    () => renderToStaticMarkup(<HeaderFooterHtml editorData={editorData} />),
    [editorData]
  );
  const mapToEditorContent = useCallback(
    () => mapFormDataToHtml(editorData).then((html) => setEditorContent(html)),
    [editorData]
  );

  useEffect(() => {
    mapToEditorContent();
  }, [mapToEditorContent]);

  useEffect(() => {
    setHeaderFooterHtml(renderHeaderFooter());
  }, [renderHeaderFooter]);

  // I've wrapped the viewer in the .tiptap class to ensure it picks up the tip tap styles.
  // I've also set the container to be 962px wide to match the viewer in landscape mode.
  return (
    <div>
      <div className="w-[962px] m-auto">
        {editorContent && !preview && (
          <NewEditor
            content={editorContent}
            onCreate={(e) =>
              setPreviewContent(headerFooterHtml + e.editor.getHTML())
            }
            onUpdate={(e) =>
              setPreviewContent(headerFooterHtml + e.editor.getHTML())
            }
            onPrint={() => setPreview(true)}
          />
        )}
      </div>
      {preview && <PrintPreviewer content={previewContent} />}
    </div>
  );
}

const PrintPreviewer = ({ content }: { content: string }) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const [isInitilised, setIsInitilised] = useState(false);
  const [previewer, setPreviewer] = useState<Previewer>();

  useEffect(() => {
    async function init() {
      if (!previewer) {
        setPreviewer(new Previewer({}));
      } else {
        const emptyChildrenArray = new Array<Node>();
        previewRef.current?.replaceChildren(...emptyChildrenArray);

        console.debug("Rendering preview...");

        const flow = await previewer.preview(
          content,
          ["/pagedstyles.css", "/interface.css"],
          previewRef.current
        );

        console.debug("Preview rendered pages {pages}", flow.pages);
        setIsInitilised(true);
      }
    }

    init();
  }, [content, previewer]);

  return (
    <div>
      {isInitilised ? null : <div>Loading...</div>}
      <div className="pagedjs_print_preview tiptap">
        <div ref={previewRef} />
      </div>
    </div>
  );
};

interface HeaderFooterHtmlProps {
  editorData: BuildingSurveyFormData | undefined;
}

const HeaderFooterHtml = ({ editorData }: HeaderFooterHtmlProps) => {
  return (
    <>
      <img
        className="headerImage"
        src="/cwbc-logo.webp"
        alt="CWBC Logo"
        width="600"
        height="400"
      />
      <div className="headerAddress">
        <p>{editorData ? editorData.address : "Unknown"}</p>
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
};

async function mapFormDataToHtml(
  formData: BuildingSurveyFormData | undefined
): Promise<string> {
  if (!formData) return "";

  const newFormData = { ...formData };

  const topLevelImages = await Promise.all([
    getImagesHref(formData.frontElevationImagesUri ?? []),
    getImagesHref(formData.moneyShot ?? []),
    getImagesHref(formData.owner.signaturePath ?? []),
  ]);

  newFormData.frontElevationImagesUri = topLevelImages[0];
  newFormData.moneyShot = topLevelImages[1];
  newFormData.owner.signaturePath = topLevelImages[2];

  const preSignedUrlTasks = formData.sections.flatMap((section, si) => {
    return section.elementSections.map(async (es, i) => {
      const preSignedUrl = await getImagesHref(es.images ?? []);
      newFormData.sections[si].elementSections[i].images = preSignedUrl;
      return Promise.resolve();
    });
  });

  await Promise.all([
    ...preSignedUrlTasks,
    getImagesHref(formData.frontElevationImagesUri ?? []),
    getImagesHref(formData.moneyShot ?? []),
    getImagesHref(formData.owner.signaturePath ?? []),
  ]);

  return renderToStaticMarkup(<BuildingSurveyReport form={newFormData} />);
}

async function getImagesHref(imagesUri: string[]): Promise<string[]> {
  if(imagesUri.length === 0) 
    return Promise.resolve([]);

  console.log(imagesUri);
  const tasks = imagesUri.map(async (imageUri) => {
    return await getImageHref(imageUri);
  });

  return await Promise.all(tasks);
}

async function getImageHref(imageUri: string): Promise<string> {
  console.log("Getting image href for", imageUri);
  const path = await getUrl({
    path: imageUri,
  });

  return path.url.href;
}
