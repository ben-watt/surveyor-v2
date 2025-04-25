/* eslint-disable @next/next/no-img-element */
"use client";

import React, { use, useState, useEffect } from "react";
import { NewEditor } from "@/app/home/components/Input/BlockEditor";
import { PrintPreviewer } from "../components/PrintPreviewer";
import { useBuildingSurveyFormTemplate } from "../hooks/useEditorState";
import { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { uploadData, getUrl, remove } from "aws-amplify/storage";
import toast from "react-hot-toast";
import { getCurrentUser } from "aws-amplify/auth";
import { getCurrentTenantId } from "@/app/home/utils/tenant-utils";

export default function Page(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const [preview, setPreview] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const initialContent = `
    <h1>This is your document</h1>
    <p>Write some stuff...</p>
  `;
  const [editorContent, setEditorContent] = useState<string>(initialContent);
  const [previewContent, setPreviewContent] = useState<string>(initialContent);

  const getDocumentPath = (docId: string) => {
    if (!tenantId) throw new Error("No tenant ID available");
    if (!userId) throw new Error("No user ID available");
    return `editor/${userId}/${tenantId}/${docId}`;
  };

  useEffect(() => {
    const loadUserAndTenant = async () => {
      try {
        const user = await getCurrentUser();
        setUserId(user.userId);
        const tenant = await getCurrentTenantId();
        setTenantId(tenant);
      } catch (error) {
        console.error("Failed to load user or tenant:", error);
      }
    };
    loadUserAndTenant();
  }, []);

  useEffect(() => {
    const loadDocument = async () => {
      if (!tenantId || !userId) return; // Wait for tenantId and userId to be loaded

      try {
        setIsLoading(true);
        const path = getDocumentPath(params.id);
        const url = await getUrl({ path });

        const response = await fetch(url.url);
        if (!response.ok) {
          throw new Error(`Failed to load document: ${response.statusText}`);
        }

        const content = await response.text();
        setEditorContent(content);
        setPreviewContent(content);
      } catch (error) {
        console.error("Failed to load document:", error);
        // If document doesn't exist, we'll use the initial content
      } finally {
        setIsLoading(false);
      }
    };

    loadDocument();
  }, [params.id, tenantId, userId]);

  const updateHandler = ({ editor }: { editor: Editor }) => {
    setEditorContent(editor.getHTML());
    setPreviewContent(editor.getHTML());
  };

  const handleSave = async () => {
    if (!tenantId) {
      toast.error("No tenant ID available");
      return;
    }
    if (!userId) {
      toast.error("No user ID available");
      return;
    }

    try {
      setIsSaving(true);
      const path = getDocumentPath(params.id);

      // Upload the new content
      await uploadData({
        path,
        data: editorContent,
        options: {
          contentType: "text/html",
        },
      });

      toast.success("Document saved successfully");
    } catch (error) {
      console.error("Failed to save document:", error);
      toast.error("Failed to save document");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="w-[962px] m-auto">Loading...</div>;
  }

  return (
    <div className="flex">
      <div className="flex-1">
        <div className="w-[962px] m-auto">
          {editorContent && !preview && (
            <>
              <NewEditor
                content={editorContent}
                onCreate={updateHandler}
                onUpdate={updateHandler}
                onPrint={() => setPreview(true)}
              />
              <div className="flex justify-end mt-4">
                <Button
                  onClick={handleSave}
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
            content={previewContent || ""}
            onBack={() => setPreview(false)}
          />
        )}
      </div>
    </div>
  );
}
