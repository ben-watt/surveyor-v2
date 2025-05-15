/* eslint-disable @next/next/no-img-element */
"use client";

import React, { use, useState } from "react";
import { NewEditor } from "@/app/home/components/Input/BlockEditor";
import { PrintPreviewer } from "@/app/home/editor/components/PrintPreviewer";
import { useDocumentTemplate } from "@/app/home/editor/hooks/useEditorState";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { documentStore } from "@/app/home/clients/DocumentStore";
import { useDocumentSave } from "@/app/home/editor/hooks/useDocumentSave";

export default function Page(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const [preview, setPreview] = useState<boolean>(false);
  const { isLoading, editorContent, previewContent, addTitleHeaderFooter, getDocName } = useDocumentTemplate(params.id, "building-survey");

  const updateHandler = ({ editor }: { editor: any }) => {
    addTitleHeaderFooter({ editor });
  };

  const { save, isSaving, saveStatus } = useDocumentSave({
    id: params.id,
    getDisplayName: getDocName,
    getMetadata: (content: string) => ({
      fileName: `${params.id}.tiptap`,
      fileType: 'text/html',
      size: content.length,
      lastModified: new Date().toISOString(),
    }),
  });

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
              onSave={(options) => save(editorContent, options)}
              isSaving={isSaving}
              saveStatus={saveStatus}
            />
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
