/* eslint-disable @next/next/no-img-element */
"use client";

import React, { use, useState, useEffect } from "react";
import { NewEditor } from "@/app/home/components/Input/BlockEditor";
import { PrintPreviewer } from "@/app/home/editor/components/PrintPreviewer";
import { useDocumentTemplate } from "@/app/home/editor/hooks/useEditorState";
import { useDocumentStorage } from "@/app/home/editor/hooks/useDocumentStorage";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function Page(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const [preview, setPreview] = useState<boolean>(false);
  const router = useRouter();
  const { isLoading, editorContent, previewContent, addTitleHeaderFooter } = useDocumentTemplate(params.id, "building-survey");

  const getDocumentPath = (docId: string, userId: string, tenantId: string) => {
    return `editor/${userId}/${tenantId}/building-survey/${docId}`;
  };

  const {
    isSaving,
    handleSave 
  } = useDocumentStorage({
    documentId: params.id,
    getDocumentPath,
  });

  const updateHandler = ({ editor }: { editor: any }) => {
    addTitleHeaderFooter({ editor });
  };

  const save = () => {
    handleSave(editorContent);
    toast.success("Template saved as document");
    router.push(`/home/editor/${params.id}`);
  }

  if (isLoading) {
    return <div className="w-[962px] m-auto">Loading...</div>;
  }

  return (
    <div>
      <div className="w-[962px] m-auto">
        {!preview && (
          <>
            <NewEditor
              content={editorContent}
              onCreate={updateHandler}
              onUpdate={updateHandler}
              onPrint={() => setPreview(true)}
            />
            <div className="flex justify-end mt-4">
              <Button
                onClick={save}
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
  );
}
