"use client";

import reportClient from "@/app/clients/ReportsClient";
import { NewEditor } from "@/app/components/Input/BlockEditor";
import { useDebouncedEffect } from "@/app/hooks/useDebounceEffect";

import { Previewer } from "pagedjs";
import React, { useEffect } from "react";
import { useRef, useState } from "react";
import { BuildingSurveyFormData } from "../../building-survey-reports/BuildingSurveyReportSchema";
import BuildingSurveyReport from "../../building-survey-reports/BuildingSurveyReportTipTap";
import { renderToString } from "react-dom/server";
import { getUrl } from "aws-amplify/storage";

export default function Page() {
  const previewRef = useRef<HTMLDivElement>(null);
  const [editorContent, setEditorContent] = useState<string | undefined>();
  const [previewContent, setPreviewContent] = useState("<h1>loading...</h1>");
  const [isInitilised, setIsInitilised] = useState(false);

  useEffect(() => {
    const getReport = async () => {
      let result = await reportClient.models.Surveys.get({ id: "28c47f49-85fe-4c4e-8b77-8b924de174e5" });

      if (!result.errors && result.data != null) {
        const formData = JSON.parse(
          result.data.content.toString()
        ) as BuildingSurveyFormData;

        const initialValue = await mapFormDataToTinyMceHtml(formData);
        setEditorContent(initialValue);
        console.log("fetched data")
      }
    };

    getReport();
  }, [])


  useDebouncedEffect(() => {
    const paged = new Previewer({});
    
    if (isInitilised) {
      let emptyChildrenArray = new Array<Node>()
      previewRef.current?.replaceChildren(...emptyChildrenArray);
      paged.preview(previewContent, ["/pagedstyles.css", "/interface.css"], previewRef.current)
      .then((flow: any) => {
        console.log('Rendered', flow.total, 'pages.');
      });
    }

    if(!isInitilised) {
      setIsInitilised(true)
    }

  }, [previewContent], 500);

  // I've wrapped the viewer in the .tiptap class to ensure it picks up the tip tap styles.
  // I've also set the container to be 962px wide to match the viewer in landscape mode.

  return (
    <div className="flex">
      <div className="w-[962px]">
        {editorContent && (
          <NewEditor
            content={editorContent}
            onUpdate={(e) => setPreviewContent(getHeaderFooterHtml() + e.editor.getHTML())}
            onPrint={(html) => window.print()}
          />
        )}
      </div>
 
      <div className="pagedjs_print_preview tiptap">
        <div ref={previewRef} />
      </div>
    </div>
  );
}

function getHeaderFooterHtml() {
  const jsx = (
    <>
      <img className="headerImage" src="/cwbc-logo.webp" alt="CWBC Logo" />
      <div className="headerAddress">
        <p>Address From the form It's going to be long</p>
        <p>Some other lines</p>
        <p>More lines</p>
      </div>
      <img className="footerImage" src="/rics-purple-logo.jpg" alt="RICS Logo" />
    </>
  )

  return renderToString(jsx);
}


async function mapFormDataToTinyMceHtml(formData: BuildingSurveyFormData): Promise<string> {

  let newFormData = { ...formData };
  newFormData.frontElevationImagesUri = await getImagesHref(formData.frontElevationImagesUri);

  let preSignedUrlTasks = formData.sections.flatMap((section, si) => {
    return section.elementSections.map(async (es, i) => {
      const preSignedUrl = await getImagesHref(es.images);
      newFormData.sections[si].elementSections[i].images = preSignedUrl
      return Promise.resolve();
    });
  })

  await Promise.all(preSignedUrlTasks);
  return renderToString(<BuildingSurveyReport form={newFormData} />)
}

async function getImagesHref(imagesUri: string[]): Promise<string[]> {
  const tasks = imagesUri.map(async (imageUri) => {
    return await getImageHref(imageUri);
  })

  return await Promise.all(tasks);
}

async function getImageHref(imageUri: string): Promise<string> {
  const path = await getUrl({
    path: imageUri,
  });

  return path.url.href;
}