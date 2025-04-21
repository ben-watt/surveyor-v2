/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import { NewEditor } from "@/app/home/components/Input/BlockEditor";
import { PrintPreviewer } from "../components/PrintPreviewer";
import { useEditorState } from "../hooks/useEditorState";

export default function Page({ params }: { params: { id: string } }) {
  const [preview, setPreview] = React.useState(false);
  const { editorContent, previewContent, header, footer, titlePage, setPreviewContent } = useEditorState(params.id);

  const handleEditorUpdate = (html: string) => {
    setPreviewContent( titlePage + header + footer + html);
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
      {preview && (
        <PrintPreviewer 
          content={previewContent} 
          onBack={() => setPreview(false)}
        />
      )}
    </div>
  );
}
