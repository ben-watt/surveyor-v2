/* eslint-disable @next/next/no-img-element */
"use client";

import React, { use, useState } from "react";
import { NewEditor } from "@/app/home/components/Input/BlockEditor";
import { PrintPreviewer } from "@/app/home/editor/components/PrintPreviewer";
import { useBuildingSurveyFormTemplate } from "@/app/home/editor/hooks/useEditorState";

export default function Page(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const [preview, setPreview] = useState<boolean>(false);
  const { editorContent, previewContent, updateHandler } = useBuildingSurveyFormTemplate(params.id);

  return (
    <div>
      <div className="w-[962px] m-auto">
        {editorContent && !preview && (
          <NewEditor
            content={editorContent}
            onCreate={updateHandler}
            onUpdate={updateHandler}
            onPrint={() => setPreview(true)}
          />
        )}
      </div>
      {preview && (
        <PrintPreviewer 
          content={previewContent} 
          onBack={() => setPreview(false)}
        />
      )}
    </div>
  );
}
