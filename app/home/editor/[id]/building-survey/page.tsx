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

export default function Page(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const [preview, setPreview] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const { isLoading, editorContent, previewContent, addTitleHeaderFooter, getDocName } = useDocumentTemplate(params.id, "building-survey");

  const updateHandler = ({ editor }: { editor: any }) => {
    addTitleHeaderFooter({ editor });
  };

  const save = async () => {
    try {
      setIsSaving(true);
      
      const existingDoc = await documentStore.get(params.id);
      
      if (existingDoc.ok) {
        // Update existing document
        const result = await documentStore.updateContent(params.id, editorContent);
        if (!result.ok) {
          throw new Error(result.val.message);
        }
      } else {
        // Create new document
        const result = await documentStore.create({
          displayName: await getDocName(),
          content: editorContent,
          metadata: {
            fileName: `${params.id}.md`,
            fileType: 'markdown',
            size: editorContent.length,
            lastModified: new Date().toISOString(),
            version: 1,
            checksum: '', // TODO: Implement checksum calculation
          }
        });
        
        if (!result.ok) {
          throw new Error(result.val.message);
        }
      }

      toast.success("Document saved successfully");
      router.push(`/home/editor/${params.id}`);
    } catch (error) {
      console.error('Failed to save document:', error);
      toast.error('Failed to save document');
    } finally {
      setIsSaving(false);
    }
  };

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
