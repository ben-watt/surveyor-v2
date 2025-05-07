/* eslint-disable @next/next/no-img-element */
"use client";

import React, { use, useState, useEffect } from "react";
import { NewEditor } from "@/app/home/components/Input/BlockEditor";
import { PrintPreviewer } from "../components/PrintPreviewer";
import { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { useDocumentStorage } from "../hooks/useDocumentStorage";


interface PageProps {
    params: Promise<{ id: string }>
}

export default function Page(props: PageProps) {
  const params = use(props.params);
  const [preview, setPreview] = useState<boolean>(false);
  const [previewContent, setPreviewContent] = useState<string>('');

  const getDocumentPath = (docId: string, userId: string, tenantId: string) => {
    return `editor/${userId}/${tenantId}/${docId}`;
  };

  const {
    content,
    isLoading, 
    isSaving,
    handleSave 
  } = useDocumentStorage({
    documentId: params.id,
    getDocumentPath,
  });

  const updateHandler = ({ editor }: { editor: Editor }) => {
    const newContent = editor.getHTML();
    setPreviewContent(newContent);
  };

  if (isLoading) {
    return <div className="w-[962px] m-auto">Loading...</div>;
  }

  return (
    <div className="flex">
      <div className="flex-1">
        <div className="w-[962px] m-auto">
          {!preview && (
            <>
              <NewEditor
                content={content}
                onCreate={updateHandler}
                onUpdate={updateHandler}
                onPrint={() => setPreview(true)}
              />
              <div className="flex justify-end mt-4">
                <Button
                  onClick={() => handleSave(content || '')}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </>
          )}
        </div>
        {preview && (
          <PrintPreviewer
            content={previewContent}
            onBack={() => setPreview(false)}
          />
        )}
      </div>
    </div>
  );
}
