/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NewEditor } from '@/app/home/components/Input/BlockEditor';
import { PrintPreviewer } from '../components/PrintPreviewer';
import { useEditorState } from '@/app/home/editor/hooks/useEditorState';
import { useDocumentSave } from '@/app/home/editor/hooks/useDocumentSave';
import { VersionHistorySidebar } from '../../components/VersionHistorySidebar';
import toast from 'react-hot-toast';
import { documentStore } from '@/app/home/clients/DocumentStore';
import { useTemplateId } from '@/app/home/editor/hooks/useTemplateId';
import { useVersionHistory, Version } from '@/app/home/editor/hooks/useVersionHistory';
import { VersionPreview } from '../components/VersionPreview';
import { useParams, useSearchParams } from 'next/navigation';
import { useCurrentTenantId } from '@/app/home/utils/tenant-utils';
import {
  type MarginZone,
  type PageLayoutSnapshot,
} from '@/app/home/components/Input/PageLayoutContext';
import type { DocumentContent } from '../utils/documentSerialization';
import { deserializeDocument } from '../utils/documentSerialization';
import { transformPageCounters } from '../utils/pageCounterTransform';

const TOP_MARGIN_ZONES: MarginZone[] = [
  'topLeftCorner',
  'topLeft',
  'topCenter',
  'topRight',
  'topRightCorner',
];

const BOTTOM_MARGIN_ZONES: MarginZone[] = [
  'bottomLeftCorner',
  'bottomLeft',
  'bottomCenter',
  'bottomRight',
  'bottomRightCorner',
];

const LEFT_MARGIN_ZONES: MarginZone[] = ['leftTop', 'leftMiddle', 'leftBottom'];
const RIGHT_MARGIN_ZONES: MarginZone[] = ['rightTop', 'rightMiddle', 'rightBottom'];

const PREVIEW_ZONE_ORDER: MarginZone[] = [
  ...TOP_MARGIN_ZONES,
  ...LEFT_MARGIN_ZONES,
  ...RIGHT_MARGIN_ZONES,
  ...BOTTOM_MARGIN_ZONES,
];

const collectZoneHtml = (map: Record<MarginZone, string>, zones: MarginZone[]) =>
  zones.map((zone) => transformPageCounters(map[zone] ?? '')).join('');

export default function EditorClient() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const searchParams = useSearchParams();
  const initialTemplateId = searchParams.get('templateId') || undefined;
  const [isTenantHydrated, tenantId] = useCurrentTenantId();
  const tenantReady = isTenantHydrated && !!tenantId;

  // Use custom hook for templateId
  const templateId = useTemplateId(id, initialTemplateId);

  // Use custom hook for version history
  const { versions, isLoading: isVersionsLoading, fetchVersions } = useVersionHistory(id);

  const [preview, setPreview] = useState<boolean>(false);
  const [pageLayout, setPageLayout] = useState<PageLayoutSnapshot | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [versionPreviewContent, setVersionPreviewContent] = useState<string>('');
  const [isPreviewingVersion, setIsPreviewingVersion] = useState(false);

  // Always call useEditorState, but pass undefined for templateId if not available
  const {
    isLoading,
    editorContent,
    previewContent,
    header,
    footer,
    runningHtml,
    titlePage,
    addTitleHeaderFooter,
    getDocName,
    setPreviewContent,
    setHeader,
    setFooter,
    setRunningHtml,
  } = useEditorState(id, templateId, { enabled: tenantReady });
  const effectiveLoading = !templateId || isLoading;

  const editorRef = useRef<any>(null);

  const recomputePreviewContent = useCallback(
    (overrides?: {
      body?: string;
      runningHtml?: Partial<Record<MarginZone, string>>;
    }) => {
      const bodyHtml =
        overrides?.body ??
        (typeof editorRef.current?.getHTML === 'function'
          ? editorRef.current.getHTML()
          : editorContent);
      const mergedRunningHtml = {
        ...runningHtml,
        ...(overrides?.runningHtml ?? {}),
      };
      const runningFragments = collectZoneHtml(mergedRunningHtml, PREVIEW_ZONE_ORDER);
      const combined = `${titlePage ?? ''}${runningFragments}${bodyHtml}`;
      setPreviewContent(combined);
    },
    [editorContent, runningHtml, setPreviewContent, titlePage],
  );

  const handleHeaderChange = useCallback(
    (value: string) => {
      setHeader(value);
      recomputePreviewContent({ runningHtml: { topCenter: value } });
    },
    [recomputePreviewContent, setHeader],
  );

  const handleFooterChange = useCallback(
    (value: string) => {
      setFooter(value);
      recomputePreviewContent({ runningHtml: { bottomCenter: value } });
    },
    [recomputePreviewContent, setFooter],
  );

  const handleRunningHtmlChange = useCallback(
    (zone: MarginZone, value: string) => {
      setRunningHtml(zone, value);
      recomputePreviewContent({ runningHtml: { [zone]: value } });
    },
    [recomputePreviewContent, setRunningHtml],
  );

  const {
    save,
    isSaving: documentSaveIsSaving,
    saveStatus,
  } = useDocumentSave({
    id,
    getDisplayName: getDocName,
    getMetadata: (content: DocumentContent) => ({
      fileName: `${id}.json`,
      fileType: 'application/json',
      size: JSON.stringify(content).length,
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
    const versionNum =
      typeof version.version === 'number'
        ? version.version
        : parseInt((version.sk || '').replace('v', ''), 10);
    const { documentStore } = await import('@/app/home/clients/DocumentStore');
    const result = await documentStore.getVersionContent(id, versionNum);
    if (result.ok) {
      try {
        const doc = deserializeDocument(result.val);
        const runningFragments = collectZoneHtml(doc.runningHtml, PREVIEW_ZONE_ORDER);
        const previewHtml = `${doc.titlePage ?? ''}${runningFragments}${doc.body}`;
        setVersionPreviewContent(previewHtml);
      } catch (error) {
        // If deserialization fails, treat as legacy format or error
        console.error('[EditorClient] Failed to deserialize version content:', error);
        setVersionPreviewContent(
          '<div class="text-red-500">Failed to parse version content</div>',
        );
        toast.error('Failed to parse version content');
      }
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

  if (!isTenantHydrated) {
    return <div className="m-auto w-[962px]">Loading...</div>;
  }

  if (!tenantId) {
    return (
      <div className="m-auto flex w-[962px] flex-col items-center gap-2 text-center">
        <h2 className="text-lg font-semibold">Select a tenant to edit documents</h2>
        <p className="text-sm text-muted-foreground">
          Choose a tenant from the switcher in the top bar to enable document editing and saving.
        </p>
      </div>
    );
  }

  if (effectiveLoading) {
    return <div className="m-auto w-[962px]">Loading...</div>;
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
              headerHtml={header}
              footerHtml={footer}
              runningHtml={runningHtml}
              onHeaderChange={handleHeaderChange}
              onFooterChange={handleFooterChange}
              onRunningHtmlChange={handleRunningHtmlChange}
              onCreate={updateHandler}
              onUpdate={updateHandler}
              onPrint={({ layout, bodyHtml, headerHtml, footerHtml, runningHtml: zones }) => {
                Object.entries(zones).forEach(([zone, value]) => {
                  setRunningHtml(zone as MarginZone, value);
                });
                recomputePreviewContent({
                  body: bodyHtml,
                  runningHtml: zones,
                });
                setPageLayout(layout);
                setPreview(true);
              }}
              onSave={(options) => {
                const documentContent: DocumentContent = {
                  body: editorContent,
                  runningHtml,
                  titlePage: titlePage ?? undefined,
                };
                save(documentContent, options);
              }}
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
        {preview && pageLayout && (
          <PrintPreviewer
            content={previewContent}
            layout={pageLayout}
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
