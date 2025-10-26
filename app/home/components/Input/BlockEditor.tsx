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
      <PageLayoutProvider>
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
};

const EditorSurface: React.FC<EditorSurfaceProps> = ({
  editor,
  editorIdentifier,
  enableHandlebarsHighlight,
}) => {
  const { pageDimensionsPx, margins, zoom } = usePageLayout();

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

  return (
    <div className="flex justify-center px-6 py-6">
      <div className="relative" style={scaledWrapperStyle}>
        <div
          className="relative h-full w-full bg-white shadow-sm"
          style={{ ...pageStyle, transform: `scale(${zoom})`, transformOrigin: 'top center' }}
        >
          <div className="pointer-events-none absolute inset-0 print:hidden">
            <div
              className="absolute border border-dashed border-gray-300/80"
              style={marginOverlayStyles}
            />
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
