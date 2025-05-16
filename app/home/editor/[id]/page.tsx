/* eslint-disable @next/next/no-img-element */
"use client";

import React, { use, useState, useEffect, useRef } from "react";
import { NewEditor } from "@/app/home/components/Input/BlockEditor";
import { PrintPreviewer } from "../components/PrintPreviewer";
import { useEditorState } from "@/app/home/editor/hooks/useEditorState";
import { useDocumentSave } from "@/app/home/editor/hooks/useDocumentSave";
import { VersionHistorySidebar } from '../../components/VersionHistorySidebar';
import toast from "react-hot-toast";
import { documentStore } from '@/app/home/clients/DocumentStore';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ templateId: string }>;
}

export default function Page(props: PageProps) {
  const params = use(props.params);
  const { id } = params;
  const searchParams = use(props.searchParams);
  const [templateId, setTemplateId] = useState<string | undefined>(searchParams.templateId);
  const [preview, setPreview] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [isVersionsLoading, setIsVersionsLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<any | null>(null);
  const [versionPreviewContent, setVersionPreviewContent] = useState<string>('');
  const [isPreviewingVersion, setIsPreviewingVersion] = useState(false);

  // Fetch templateId from document if not provided
  useEffect(() => {
    if (!templateId && id) {
      documentStore.get(id).then(result => {
        if (result.ok && result.val?.templateId) {
          setTemplateId(result.val.templateId);
        }
      });
    }
  }, [id, templateId]);

  const { isLoading, editorContent, previewContent, addTitleHeaderFooter, getDocName } = useEditorState(id, templateId);

  const editorRef = useRef<any>(null);

  const { save, isSaving: documentSaveIsSaving, saveStatus } = useDocumentSave({
    id,
    getDisplayName: getDocName,
    getMetadata: (content: string) => ({
      fileName: `${id}.tiptap`,
      fileType: 'text/html',
      size: content.length,
      lastModified: new Date().toISOString(),
      templateId,
    }),
  });

  function getComposedHtml() {
    if (editorRef.current) {
      return editorRef.current.getHTML();
    }
    return editorContent;
  }

  useEffect(() => {
    if (sidebarOpen) {
      setIsVersionsLoading(true);
      import("@/app/home/clients/DocumentStore").then(({ documentStore }) => {
        documentStore.listVersions(id)
          .then(result => {
            if (result.ok) {
              setVersions(result.val);
            } else {
              setVersions([]);
              toast.error('Failed to load version history');
            }
          })
          .finally(() => setIsVersionsLoading(false));
      });
    }
  }, [sidebarOpen, id]);

  const handleSelectVersion = async (version: any) => {
    setSelectedVersion(version);
    setIsPreviewingVersion(true);
    setVersionPreviewContent('');
    const versionNum = typeof version.version === 'number' ? version.version : parseInt((version.sk || '').replace('v', ''), 10);
    const { documentStore } = await import("@/app/home/clients/DocumentStore");
    const result = await documentStore.getVersionContent(id, versionNum);
    if (result.ok) {
      setVersionPreviewContent(result.val);
    } else {
      setVersionPreviewContent('<div class="text-red-500">Failed to load version content</div>');
      toast.error('Failed to load version content');
    }
  };

  const handleReturnToLatest = () => {
    setIsPreviewingVersion(false);
    setSelectedVersion(null);
    setVersionPreviewContent('');
  };

  const updateHandler = ({ editor }: { editor: any }) => {
    if (addTitleHeaderFooter) addTitleHeaderFooter({ editor });
  };

  if (isLoading) {
    return <div className="w-[962px] m-auto">Loading...</div>;
  }

  return (
    <div>
      <div>
        {!preview && !isPreviewingVersion && (
          <>
            <NewEditor
              ref={editorRef}
              content={editorContent}
              onCreate={updateHandler}
              onUpdate={updateHandler}
              onPrint={() => setPreview(true)}
              onSave={(options) => save(previewContent, options)}
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
