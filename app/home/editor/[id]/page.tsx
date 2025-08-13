/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { NewEditor } from "@/app/home/components/Input/BlockEditor";
import { PrintPreviewer } from "../components/PrintPreviewer";
import { useEditorState } from "@/app/home/editor/hooks/useEditorState";
import { useDocumentSave } from "@/app/home/editor/hooks/useDocumentSave";
import { VersionHistorySidebar } from '../../components/VersionHistorySidebar';
import toast from "react-hot-toast";
import { documentStore } from '@/app/home/clients/DocumentStore';
import { useTemplateId } from '@/app/home/editor/hooks/useTemplateId';
import { useVersionHistory, Version } from '@/app/home/editor/hooks/useVersionHistory';
import { VersionPreview } from '../components/VersionPreview';
import { useParams, useSearchParams } from "next/navigation";

export default function Page() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const searchParams = useSearchParams();
  const initialTemplateId = searchParams.get('templateId') || undefined;

  // Use custom hook for templateId
  const templateId = useTemplateId(id, initialTemplateId);

  // Use custom hook for version history
  const { versions, isLoading: isVersionsLoading, fetchVersions } = useVersionHistory(id);

  const [preview, setPreview] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [versionPreviewContent, setVersionPreviewContent] = useState<string>('');
  const [isPreviewingVersion, setIsPreviewingVersion] = useState(false);

  // Always call useEditorState, but pass undefined for templateId if not available
  const { isLoading, editorContent, previewContent, addTitleHeaderFooter, getDocName } = useEditorState(id, templateId);
  const effectiveLoading = !templateId || isLoading;

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

  // Fetch version history when sidebar opens
  useEffect(() => {
    if (sidebarOpen) {
      fetchVersions();
    }
  }, [sidebarOpen, fetchVersions]);

  const handleSelectVersion = async (version: Version) => {
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

  if (effectiveLoading) {
    return <div className="w-[962px] m-auto">Loading...</div>;
  }

  return (
    <div>
      <div>
        {!preview && !isPreviewingVersion && (
          <>
            <NewEditor
              ref={editorRef}
               editorId={id}
              content={editorContent}
              onCreate={updateHandler}
              onUpdate={updateHandler}
              onPrint={() => setPreview(true)}
              onSave={(options) => save(editorContent, options)}
              isSaving={documentSaveIsSaving}
              saveStatus={saveStatus}
              onOpenVersionHistory={() => setSidebarOpen(true)}
            />
          </>
        )}
        {isPreviewingVersion && selectedVersion && (
          <VersionPreview
            versionLabel={selectedVersion.version?.toString() ?? selectedVersion.sk ?? ''}
            content={versionPreviewContent}
            onReturn={handleReturnToLatest}
          />
        )}
        {preview && (
          <PrintPreviewer
            content={previewContent}
            onBack={() => setPreview(false)}
          />
        )}
        <VersionHistorySidebar
          versions={versions as any}
          onSelect={handleSelectVersion}
          onClose={() => setSidebarOpen(false)}
          selectedVersion={selectedVersion as any}
          isOpen={sidebarOpen}
          isLoading={isVersionsLoading}
        />
      </div>
    </div>
  );
}
