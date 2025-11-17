'use client';

import { useEditor, EditorContent, Content, EditorEvents, Attributes } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Color } from '@tiptap/extension-color';
import ListItem from '@tiptap/extension-list-item';
import TextStyle from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';

import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';

import React, { useEffect, useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import Section from '../TipTapExtensions/Section';
import FileHandler from '@tiptap-pro/extension-file-handler';
import Highlight from '@tiptap/extension-highlight';
import { FontSize } from '../TipTapExtensions/FontSize';
import { LineHeight } from '../TipTapExtensions/LineHeight';
import { HandlebarsHighlight } from '../TipTapExtensions/HandlebarsHighlight';
import { HandlebarsAutocomplete } from '../TipTapExtensions/HandlebarsAutocomplete';
import BlockMenuBar from './BlockMenuBar';
import { getHierarchicalIndexes, TableOfContents } from '@tiptap-pro/extension-table-of-contents';
import { v4 } from 'uuid';
import { createTocRepo, TocContext, TocNode, TocRepo } from '../TipTapExtensions/Toc';
import S3ImageExtension from '../TipTapExtensions/S3ImageNodeView';
import { insertImageFromFile } from '../../editor/utils/imageUpload';
import {
  INCH_TO_PX,
  PageLayoutProvider,
  type PageLayoutSnapshot,
  type MarginZone,
  type RunningHtmlMap,
  DEFAULT_RUNNING_PAGE_HTML,
  usePageLayout,
} from './PageLayoutContext';
import HeaderFooterEditor from './HeaderFooterEditor';
import { MARGIN_ZONE_METADATA, distributeRunningHtml } from './marginZones';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type PrintRequestPayload = {
  layout: PageLayoutSnapshot;
  bodyHtml: string;
  headerHtml: string;
  footerHtml: string;
  runningHtml: Record<MarginZone, string>;
};

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

const getZoneChipLabel = (zone: MarginZone) => MARGIN_ZONE_METADATA[zone]?.label ?? zone;

const getZonePopoverAlign = (zone: MarginZone): 'start' | 'center' | 'end' => {
  if (zone.startsWith('top')) {
    if (zone === 'topLeft' || zone === 'topLeftCorner') return 'start';
    if (zone === 'topRight' || zone === 'topRightCorner') return 'end';
    return 'center';
  }
  if (zone.startsWith('bottom')) {
    if (zone === 'bottomLeft' || zone === 'bottomLeftCorner') return 'start';
    if (zone === 'bottomRight' || zone === 'bottomRightCorner') return 'end';
    return 'center';
  }
  return 'center';
};

const getZonePopoverSide = (zone: MarginZone): 'top' | 'right' | 'bottom' | 'left' => {
  if (zone.startsWith('top')) return 'top';
  if (zone.startsWith('bottom')) return 'bottom';
  if (zone.startsWith('left')) return 'left';
  if (zone.startsWith('right')) return 'right';
  return 'top';
};

const extractPreviewHtml = (html: string) => {
  if (!html) return '';
  if (typeof window === 'undefined') return html;
  const template = window.document.createElement('template');
  template.innerHTML = html;
  const element = template.content.firstElementChild as HTMLElement | null;
  if (!element) return html;
  return element.innerHTML || element.outerHTML || html;
};

interface NewEditorProps {
  editorId?: string;
  content: Content;
  onUpdate?: (props: EditorEvents['update']) => void;
  onCreate?: (props: EditorEvents['create']) => void;
  onPrint: (payload: PrintRequestPayload) => void;
  onSave: (options?: { auto?: boolean }) => void;
  isSaving: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'autosaved';
  onOpenVersionHistory?: () => void;
  enableHandlebarsHighlight?: boolean;
  headerHtml?: string;
  footerHtml?: string;
  onHeaderChange?: (value: string) => void;
  onFooterChange?: (value: string) => void;
  runningHtml?: Partial<Record<MarginZone, string>>;
  onRunningHtmlChange?: (zone: MarginZone, value: string) => void;
}

export const NewEditor = forwardRef(
  (
    {
      editorId,
      onPrint,
      content,
      onUpdate,
      onCreate,
      onSave,
      isSaving,
      saveStatus,
      onOpenVersionHistory,
      enableHandlebarsHighlight = false,
      headerHtml = '',
      footerHtml = '',
      onHeaderChange,
      onFooterChange,
      runningHtml,
      onRunningHtmlChange,
    }: NewEditorProps,
    ref,
  ) => {
    const [tocData, setTocData] = React.useState<TocContext>();
    const [editorIdentifier, setEditorIdentifier] = React.useState<string>(editorId ?? v4());
    const [tocRepo, setTocRepo] = React.useState<TocRepo>();
    const lastContentRef = useRef<string>('');
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
      setTocRepo(createTocRepo(`toc:${editorIdentifier}`));
    }, [editorIdentifier]);

    // Auto-save with 30s debounce
    useEffect(() => {
      if (isSaving) return; // Don't auto-save while saving
      if (typeof content !== 'string') return; // Only auto-save for string content
      if (content === lastContentRef.current) return;
      if (!content) return;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      // Update lastContentRef immediately to prevent repeated saves
      lastContentRef.current = content;

      debounceTimer.current = setTimeout(() => {
        onSave({ auto: true });
      }, 3000);
      return () => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
      };
    }, [content, isSaving, onSave]);

    const extensions = [
      FileHandler.configure({
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
        onDrop: async (currentEditor, files, pos) => {
          for (const file of files) {
            if (!file.type.startsWith('image/')) continue;
            await insertImageFromFile(currentEditor, file, pos);
          }
        },
        onPaste: async (currentEditor, files, htmlContent) => {
          for (const file of files) {
            if (!file.type.startsWith('image/')) continue;
            await insertImageFromFile(currentEditor, file, currentEditor.state.selection.anchor);
          }
        },
      }),
      Section,
      Color.configure({ types: [TextStyle.name, ListItem.name] }),
      TextAlign.configure({
        types: ['paragraph', 'heading'],
      }),
      TextStyle,
      FontSize,
      LineHeight,
      Highlight.configure({
        multicolor: true,
      }),
      S3ImageExtension,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      StarterKit,
      TableOfContents.configure({
        getIndex: getHierarchicalIndexes,
        getId: (textContent) => 'toc-' + v4().slice(0, 8),
        onUpdate: (data, isCreate) => {
          const mappedData = data.map((d) => ({
            originalLevel: d.originalLevel,
            level: d.level,
            textContent: d.textContent,
            id: d.id,
            pos: d.pos,
            itemIndex: d.itemIndex,
          }));

          tocRepo?.set(mappedData, isCreate ?? false);
        },
      }),
      TocNode.configure({
        repo: tocRepo ?? null,
      }),
      ...(enableHandlebarsHighlight ? [HandlebarsHighlight, HandlebarsAutocomplete] : []),
    ];

    const normalizedRunningHtml = useMemo<RunningHtmlMap | undefined>(
      () =>
        runningHtml
          ? { ...DEFAULT_RUNNING_PAGE_HTML, ...runningHtml }
          : undefined,
      [runningHtml],
    );

    const editor = useEditor(
      {
        extensions: extensions,
        content: content,
        onCreate: onCreate,
        onUpdate: onUpdate,
      },
      [tocRepo],
    );

    useImperativeHandle(ref, () => editor, [editor]);
    return (
      <PageLayoutProvider
        initialState={{
          headerHtml,
          footerHtml,
          runningHtml: normalizedRunningHtml,
        }}
      >
        <div className="bg-gray-100 print:hidden">
          <BlockMenuBar
            editor={editor}
            onPrint={onPrint}
            onSave={onSave}
            isSaving={isSaving}
            saveStatus={saveStatus}
            onOpenVersionHistory={onOpenVersionHistory}
          />
          <TocContext.Provider value={tocData}>
            <EditorSurface
              editor={editor}
              editorIdentifier={editorIdentifier}
              enableHandlebarsHighlight={enableHandlebarsHighlight}
              onHeaderChange={onHeaderChange}
              onFooterChange={onFooterChange}
              onRunningHtmlChange={onRunningHtmlChange}
            />
          </TocContext.Provider>
        </div>
      </PageLayoutProvider>
    );
  },
);

NewEditor.displayName = 'NewEditor';

type EditorSurfaceProps = {
  editor: ReturnType<typeof useEditor>;
  editorIdentifier: string;
  enableHandlebarsHighlight: boolean;
  onHeaderChange?: (value: string) => void;
  onFooterChange?: (value: string) => void;
  onRunningHtmlChange?: (zone: MarginZone, value: string) => void;
};

const EditorSurface: React.FC<EditorSurfaceProps> = ({
  editor,
  editorIdentifier,
  enableHandlebarsHighlight,
  onHeaderChange,
  onFooterChange,
  onRunningHtmlChange,
}) => {
  const {
    pageDimensionsPx,
    margins,
    zoom,
    runningHtml,
    setRunningHtml,
  } = usePageLayout();
  const [activeZone, setActiveZone] = React.useState<MarginZone | null>(null);

  const pageStyle = useMemo(() => {
    return {
      width: `${pageDimensionsPx.width}px`,
      minHeight: `${pageDimensionsPx.height}px`,
    };
  }, [pageDimensionsPx.height, pageDimensionsPx.width]);

  const scaledWrapperStyle = useMemo(() => {
    return {
      width: `${pageDimensionsPx.width * zoom}px`,
      minHeight: `${pageDimensionsPx.height * zoom}px`,
    };
  }, [pageDimensionsPx.height, pageDimensionsPx.width, zoom]);

  const marginOverlayStyles = useMemo(() => {
    return {
      top: `${margins.top * INCH_TO_PX}px`,
      right: `${margins.right * INCH_TO_PX}px`,
      bottom: `${margins.bottom * INCH_TO_PX}px`,
      left: `${margins.left * INCH_TO_PX}px`,
    };
  }, [margins.bottom, margins.left, margins.right, margins.top]);

  const editorPaddingStyles = useMemo(() => {
    return {
      paddingTop: `${margins.top * INCH_TO_PX}px`,
      paddingRight: `${margins.right * INCH_TO_PX}px`,
      paddingBottom: `${margins.bottom * INCH_TO_PX}px`,
      paddingLeft: `${margins.left * INCH_TO_PX}px`,
    };
  }, [margins.bottom, margins.left, margins.right, margins.top]);

  const topRegionHeight = Math.max(margins.top * INCH_TO_PX, 48);
  const bottomRegionHeight = Math.max(margins.bottom * INCH_TO_PX, 48);
  const leftRegionWidth = Math.max(margins.left * INCH_TO_PX, 48);
  const rightRegionWidth = Math.max(margins.right * INCH_TO_PX, 48);

  const topRegionStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      top: 0,
      left: 0,
      width: `${pageDimensionsPx.width}px`,
      height: `${topRegionHeight}px`,
    }),
    [pageDimensionsPx.width, topRegionHeight],
  );

  const bottomRegionStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      width: `${pageDimensionsPx.width}px`,
      height: `${bottomRegionHeight}px`,
    }),
    [bottomRegionHeight, pageDimensionsPx.width],
  );

  const leftRegionStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      top: `${topRegionHeight}px`,
      bottom: `${bottomRegionHeight}px`,
      left: 0,
      width: `${leftRegionWidth}px`,
    }),
    [bottomRegionHeight, leftRegionWidth, topRegionHeight],
  );

  const rightRegionStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      top: `${topRegionHeight}px`,
      bottom: `${bottomRegionHeight}px`,
      right: 0,
      width: `${rightRegionWidth}px`,
    }),
    [bottomRegionHeight, rightRegionWidth, topRegionHeight],
  );

  const topGridTemplateColumns = useMemo(
    () => `${leftRegionWidth}px 1fr 1fr 1fr ${rightRegionWidth}px`,
    [leftRegionWidth, rightRegionWidth],
  );

  const bottomGridTemplateColumns = topGridTemplateColumns;
  const sideGridTemplateRows = 'repeat(3, minmax(64px, 1fr))';

  const defaultPopoverWidth = useMemo(
    () => Math.max(320, Math.min(pageDimensionsPx.width, 720)),
    [pageDimensionsPx.width],
  );

  const sidePopoverWidth = useMemo(() => {
    const available = Math.max(pageDimensionsPx.width - leftRegionWidth - rightRegionWidth, 240);
    return Math.max(260, Math.min(360, available));
  }, [leftRegionWidth, pageDimensionsPx.width, rightRegionWidth]);

  const handleZoneChange = React.useCallback(
    (zone: MarginZone, value: string) => {
      const candidate: RunningHtmlMap = {
        ...DEFAULT_RUNNING_PAGE_HTML,
        ...runningHtml,
        [zone]: value,
      };
      const distributed = distributeRunningHtml(candidate);
      const normalized: RunningHtmlMap = {
        ...DEFAULT_RUNNING_PAGE_HTML,
        ...distributed,
      };
      const sanitizedValue = normalized[zone] ?? '';
      setRunningHtml(zone, sanitizedValue);
      if (zone === 'topCenter') {
        onHeaderChange?.(sanitizedValue);
        onRunningHtmlChange?.(zone, sanitizedValue);
      } else if (zone === 'bottomCenter') {
        onFooterChange?.(sanitizedValue);
        onRunningHtmlChange?.(zone, sanitizedValue);
      } else {
        onRunningHtmlChange?.(zone, sanitizedValue);
      }
    },
    [
      onFooterChange,
      onHeaderChange,
      onRunningHtmlChange,
      runningHtml,
      setRunningHtml,
    ],
  );

  const renderZoneTrigger = React.useCallback(
    (zone: MarginZone) => {
      const zoneValue = runningHtml[zone] ?? '';
      const previewHtml = extractPreviewHtml(zoneValue);
      const strippedText = previewHtml
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .trim();
      const hasContent = strippedText.length > 0;
      const chipLabel = getZoneChipLabel(zone);
      const placeholder = `Click to add ${chipLabel.toLowerCase()}`;

      const popoverWidth =
        zone.startsWith('left') || zone.startsWith('right') ? sidePopoverWidth : defaultPopoverWidth;

      const buttonClass = cn(
        'pointer-events-auto flex h-full w-full min-h-[48px] flex-col justify-start border border-transparent bg-white/70 text-left text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'text-foreground hover:border-primary/40 hover:bg-primary/5',
        activeZone === zone && 'border-primary text-primary',
      );

      return (
        <Popover
          key={zone}
          open={activeZone === zone}
          onOpenChange={(open) => setActiveZone(open ? zone : null)}
        >
          <PopoverTrigger asChild>
            <button type="button" className={buttonClass} aria-label={`Edit ${chipLabel} content`}>
                <div
                  className="pointer-events-none line-clamp-3 text-left text-[0.7rem] leading-tight text-foreground/80"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side={getZonePopoverSide(zone)}
            align={getZonePopoverAlign(zone)}
            sideOffset={8}
            alignOffset={0}
            className="space-y-4 p-0"
            style={{ width: `${popoverWidth}px`, maxWidth: `${popoverWidth}px` }}
          >
            <HeaderFooterEditor
              region={zone}
              value={zoneValue}
              onChange={(val) => handleZoneChange(zone, val)}
              contentWidth={popoverWidth}
            />
          </PopoverContent>
        </Popover>
      );
    },
    [activeZone, defaultPopoverWidth, handleZoneChange, runningHtml, sidePopoverWidth],
  );

  return (
    <div className="flex justify-center px-6 py-6">
      <div className="relative" style={scaledWrapperStyle}>
        <div
          className="relative h-full w-full bg-white shadow-sm"
          style={{ ...pageStyle, transform: `scale(${zoom})`, transformOrigin: 'top center' }}
        >
          <div className="pointer-events-none absolute inset-0 z-10 print:hidden">
            <div
              className="pointer-events-none absolute border border-dashed border-gray-300/80"
              style={marginOverlayStyles}
            />
            <div style={topRegionStyle} className="pointer-events-none">
              <div
                className="pointer-events-auto grid h-full w-full"
                style={{ gridTemplateColumns: topGridTemplateColumns }}
              >
                {TOP_MARGIN_ZONES.map(renderZoneTrigger)}
              </div>
            </div>

            <div style={bottomRegionStyle} className="pointer-events-none">
              <div
                className="pointer-events-auto grid h-full w-full"
                style={{ gridTemplateColumns: bottomGridTemplateColumns }}
              >
                {BOTTOM_MARGIN_ZONES.map(renderZoneTrigger)}
              </div>
            </div>

            <div style={leftRegionStyle} className="pointer-events-none">
              <div
                className="pointer-events-auto grid h-full w-full"
                style={{ gridTemplateRows: sideGridTemplateRows }}
              >
                {LEFT_MARGIN_ZONES.map(renderZoneTrigger)}
              </div>
            </div>

            <div style={rightRegionStyle} className="pointer-events-none">
              <div
                className="pointer-events-auto grid h-full w-full"
                style={{ gridTemplateRows: sideGridTemplateRows }}
              >
                {RIGHT_MARGIN_ZONES.map(renderZoneTrigger)}
              </div>
            </div>
          </div>
          <div className="relative h-full w-full" style={editorPaddingStyles}>
            <EditorContent
              id={editorIdentifier}
              editor={editor}
              spellCheck={!enableHandlebarsHighlight}
              className="min-h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
