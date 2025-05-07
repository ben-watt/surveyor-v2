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

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function Page(props: PageProps) {
  const params = use(props.params);
  const [preview, setPreview] = useState<boolean>(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadDocument = async () => {
      try {
        setIsLoading(true);
        const result = await documentStore.get(params.id);
        if (result.ok) {
          const contentResult = await documentStore.getContent(params.id);
          if (contentResult.ok) {
            setContent(contentResult.val);
          } else {
            throw new Error(contentResult.val.message);
          }
        } else {
          // If document doesn't exist, start with empty content
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

  const handleSave = async (newContent: string) => {
    try {
      setIsSaving(true);
      
      // Check if document exists
      const existingDoc = await documentStore.get(params.id);
      
      if (existingDoc.ok) {
        // Update existing document
        const result = await documentStore.updateContent(params.id, newContent);
        if (!result.ok) {
          throw new Error(result.val.message);
        }
      } else {

        console.log('Creating new document with content:', newContent, content);
        // Create new document
        const result = await documentStore.create({
          content: newContent,
          metadata: {
            fileName: `${params.id}.md`,
            fileType: 'markdown',
            size: newContent.length,
            lastModified: new Date().toISOString(),
            version: 1,
            checksum: '', // TODO: Implement checksum calculation
          }
        });
        
        if (!result.ok) {
          throw new Error(result.val.message);
        }
      }

      toast.success('Document saved successfully');
    } catch (error) {
      console.error('Failed to save document:', error);
      toast.error('Failed to save document');
    } finally {
      setIsSaving(false);
    }
  };

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
                  onClick={() => handleSave(previewContent || '')}
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
