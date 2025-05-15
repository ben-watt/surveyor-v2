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
import { VersionHistorySidebar } from '../../../app/components/VersionHistorySidebar';

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

  // Version history state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [isVersionsLoading, setIsVersionsLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<any | null>(null);
  const [versionPreviewContent, setVersionPreviewContent] = useState<string>('');
  const [isPreviewingVersion, setIsPreviewingVersion] = useState(false);

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

  // Fetch versions when sidebar opens
  useEffect(() => {
    if (sidebarOpen) {
      setIsVersionsLoading(true);
      documentStore.listVersions(params.id)
        .then(result => {
          if (result.ok) {
            setVersions(result.val);
          } else {
            setVersions([]);
            toast.error('Failed to load version history');
          }
        })
        .finally(() => setIsVersionsLoading(false));
    }
  }, [sidebarOpen, params.id]);

  // Handler for selecting a version
  const handleSelectVersion = async (version: any) => {
    setSelectedVersion(version);
    setIsPreviewingVersion(true);
    setVersionPreviewContent('');
    const versionNum = typeof version.version === 'number' ? version.version : parseInt((version.sk || '').replace('v', ''), 10);
    const result = await documentStore.getVersionContent(params.id, versionNum);
    if (result.ok) {
      setVersionPreviewContent(result.val);
    } else {
      setVersionPreviewContent('<div class="text-red-500">Failed to load version content</div>');
      toast.error('Failed to load version content');
    }
  };

  // Handler to return to editing latest version
  const handleReturnToLatest = () => {
    setIsPreviewingVersion(false);
    setSelectedVersion(null);
    setVersionPreviewContent('');
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
      <div className="flex-1 relative">
        {!preview && !isPreviewingVersion && (
          <>
            <NewEditor
              content={content}
              onCreate={updateHandler}
              onUpdate={updateHandler}
              onPrint={() => setPreview(true)}
              onSave={(options) => save(previewContent || '', options)}
              isSaving={documentSaveIsSaving}
              saveStatus={saveStatus}
              onOpenVersionHistory={() => setSidebarOpen(true)}
            />
          </>
        )}
        {isPreviewingVersion && (
          <div className="border rounded bg-gray-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">Previewing Version {selectedVersion?.version ?? selectedVersion?.sk}</span>
              <button
                className="text-blue-600 underline text-sm"
                onClick={handleReturnToLatest}
                aria-label="Return to editing latest version"
              >
                Return to Editing
              </button>
            </div>
            <div
              className="prose max-w-none bg-white p-4 rounded shadow-inner min-h-[300px]"
              dangerouslySetInnerHTML={{ __html: versionPreviewContent }}
            />
          </div>
        )}
        {preview && (
          <PrintPreviewer
            content={previewContent}
            onBack={() => setPreview(false)}
          />
        )}
        <VersionHistorySidebar
          versions={versions}
          onSelect={handleSelectVersion}
          onClose={() => setSidebarOpen(false)}
          selectedVersion={selectedVersion}
          isOpen={sidebarOpen}
          isLoading={isVersionsLoading}
        />
      </div>
    </div>
  );
}
