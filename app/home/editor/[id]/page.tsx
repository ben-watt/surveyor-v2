/* eslint-disable @next/next/no-img-element */
"use client";

import React, { use, useState, useEffect } from "react";
import { NewEditor } from "@/app/home/components/Input/BlockEditor";
import { PrintPreviewer } from "../components/PrintPreviewer";
import { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { documentStore } from "@/app/home/clients/DocumentStore";
import toast from "react-hot-toast";
import { useDocumentSave } from "@/app/home/editor/hooks/useDocumentSave";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function Page(props: PageProps) {
  const params = use(props.params);
  const [preview, setPreview] = useState<boolean>(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isExisting, setIsExisting] = useState(false);

  const { save, isSaving: documentSaveIsSaving, saveStatus } = useDocumentSave({
    id: params.id,
    getDisplayName: () => "Untitled Document",
    getMetadata: (content: string) => ({
      fileName: `${params.id}.tiptap`,
      fileType: 'text/html',
      size: content.length,
      lastModified: new Date().toISOString(),
    }),
  });

  useEffect(() => {
    const loadDocument = async () => {
      try {
        setIsLoading(true);
        const result = await documentStore.get(params.id);
        if (result.ok) {
          setIsExisting(true);
          const contentResult = await documentStore.getContent(params.id);
          if (contentResult.ok) {
            setContent(contentResult.val);
          } else {
            throw new Error(contentResult.val.message);
          }
        } else {
          setIsExisting(false);
          setContent('');
        }
      } catch (error) {
        console.error('Failed to load document:', error);
        toast.error('Failed to load document');
      } finally {
        setIsLoading(false);
      }
    };

    loadDocument();
  }, [params.id]);

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
        {!preview && (
          <>
            <NewEditor
              content={content}
              onCreate={updateHandler}
              onUpdate={updateHandler}
              onPrint={() => setPreview(true)}
              onSave={(options) => save(previewContent || '', options)}
              isSaving={documentSaveIsSaving}
              saveStatus={saveStatus}
            />
          </>
        )}
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
