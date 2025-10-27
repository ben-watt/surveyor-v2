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
  usePageLayout,
} from './PageLayoutContext';
import HeaderFooterEditor from './HeaderFooterEditor';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface NewEditorProps {
  editorId?: string;
  content: Content;
  onUpdate?: (props: EditorEvents['update']) => void;
  onCreate?: (props: EditorEvents['create']) => void;
  onPrint: (layout: PageLayoutSnapshot) => void;
  onSave: (options?: { auto?: boolean }) => void;
  isSaving: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'autosaved';
  onOpenVersionHistory?: () => void;
  enableHandlebarsHighlight?: boolean;
  headerHtml?: string;
  footerHtml?: string;
  onHeaderChange?: (value: string) => void;
  onFooterChange?: (value: string) => void;
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
        }}
      >
        <div className="border-grey-200 border bg-gray-100 print:hidden">
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
};

const EditorSurface: React.FC<EditorSurfaceProps> = ({
  editor,
  editorIdentifier,
  enableHandlebarsHighlight,
  onHeaderChange,
  onFooterChange,
}) => {
  const {
    pageDimensionsPx,
    margins,
    zoom,
    headerHtml,
    footerHtml,
    setHeaderHtml,
    setFooterHtml,
  } = usePageLayout();
  const [headerOpen, setHeaderOpen] = React.useState(false);
  const [footerOpen, setFooterOpen] = React.useState(false);

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

  const headerRegionStyle = useMemo(
    () => ({
      top: 0,
      left: 0,
      width: `${pageDimensionsPx.width}px`,
      height: `${Math.max(margins.top * INCH_TO_PX, 32)}px`,
    }),
    [margins.top, pageDimensionsPx.width],
  );

  const footerRegionStyle = useMemo(
    () => ({
      bottom: 0,
      left: 0,
      width: `${pageDimensionsPx.width}px`,
      height: `${Math.max(margins.bottom * INCH_TO_PX, 32)}px`,
    }),
    [margins.bottom, pageDimensionsPx.width],
  );

  const headerDisplayPadding = React.useMemo(
    () => ({
      paddingLeft: 0,
      paddingRight: 0,
    }),
    [],
  );

  const footerDisplayPadding = React.useMemo(
    () => ({
      paddingLeft: 0,
      paddingRight: 0,
    }),
    [],
  );

  const handleHeaderChangeInternal = React.useCallback(
    (value: string) => {
      setHeaderHtml(value);
      onHeaderChange?.(value);
    },
    [onHeaderChange, setHeaderHtml],
  );

  const handleFooterChangeInternal = React.useCallback(
    (value: string) => {
      setFooterHtml(value);
      onFooterChange?.(value);
    },
    [onFooterChange, setFooterHtml],
  );

  const runningRegionWidth = pageDimensionsPx.width;

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
            <Popover open={headerOpen} onOpenChange={setHeaderOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'pointer-events-auto absolute flex w-full items-center justify-center border border-transparent bg-transparent text-xs text-muted-foreground transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    headerHtml
                      ? 'bg-white/70 hover:border-primary/40 hover:bg-primary/5'
                      : 'border-dashed border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10',
                  )}
                  style={headerRegionStyle}
                  aria-label="Edit header content"
                >
                  {headerHtml ? (
                    <div
                      className="pointer-events-none line-clamp-3 max-h-full w-full text-left text-[0.7rem] leading-tight text-foreground/80"
                      style={headerDisplayPadding}
                    >
                      <div dangerouslySetInnerHTML={{ __html: headerHtml }} />
                    </div>
                  ) : (
                    <span className="pointer-events-none" style={headerDisplayPadding}>
                      Click to add header
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="start"
                sideOffset={8}
                alignOffset={0}
                className="space-y-4 p-0"
                style={{ width: `${runningRegionWidth}px`, maxWidth: `${runningRegionWidth}px` }}
              >
                <HeaderFooterEditor
                  region="header"
                  value={headerHtml}
                  onChange={handleHeaderChangeInternal}
                  contentWidth={runningRegionWidth}
                />
              </PopoverContent>
            </Popover>

            <Popover open={footerOpen} onOpenChange={setFooterOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'pointer-events-auto absolute flex w-full items-center justify-center border border-transparent bg-transparent text-xs text-muted-foreground transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    footerHtml
                      ? 'bg-white/70 hover:border-primary/40 hover:bg-primary/5'
                      : 'border-dashed border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10',
                  )}
                  style={footerRegionStyle}
                  aria-label="Edit footer content"
                >
                  {footerHtml ? (
                    <div
                      className="pointer-events-none line-clamp-3 max-h-full w-full text-left text-[0.7rem] leading-tight text-foreground/80"
                      style={footerDisplayPadding}
                    >
                      <div dangerouslySetInnerHTML={{ __html: footerHtml }} />
                    </div>
                  ) : (
                    <span className="pointer-events-none" style={footerDisplayPadding}>
                      Click to add footer
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="start"
                sideOffset={8}
                alignOffset={0}
                className="space-y-4 p-0"
                style={{ width: `${runningRegionWidth}px`, maxWidth: `${runningRegionWidth}px` }}
              >
                <HeaderFooterEditor
                  region="footer"
                  value={footerHtml}
                  onChange={handleFooterChangeInternal}
                  contentWidth={runningRegionWidth}
                />
              </PopoverContent>
            </Popover>
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
