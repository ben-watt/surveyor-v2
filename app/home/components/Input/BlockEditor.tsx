"use client";

import { useEditor, EditorContent, Content, EditorEvents, Attributes } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Color } from "@tiptap/extension-color";
import ListItem from "@tiptap/extension-list-item";
import TextStyle from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";

import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";

import React, { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import Section from "../TipTapExtensions/Section";
import FileHandler from "@tiptap-pro/extension-file-handler";
import Highlight from '@tiptap/extension-highlight';
import { FontSize } from "../TipTapExtensions/FontSize";
import BlockMenuBar from "./BlockMenuBar";
import {
  getHierarchicalIndexes,
  TableOfContents,
} from "@tiptap-pro/extension-table-of-contents";
import { v4 } from "uuid";
import { createTocRepo, TocContext, TocNode, TocRepo } from "../TipTapExtensions/Toc";
import S3ImageExtension from "../TipTapExtensions/S3ImageNodeView";
import { insertImageFromFile } from '../../editor/utils/imageUpload';

interface NewEditorProps {
  editorId?: string;
  content: Content;
  onUpdate?: (props: EditorEvents["update"]) => void;
  onCreate?: (props: EditorEvents["create"]) => void;
  onPrint: () => void;
  onSave: (options?: { auto?: boolean }) => void;
  isSaving: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'autosaved';
  onOpenVersionHistory?: () => void;
}

export const NewEditor = forwardRef(({
  editorId,
  onPrint,
  content,
  onUpdate,
  onCreate,
  onSave,
  isSaving,
  saveStatus,
  onOpenVersionHistory,
}: NewEditorProps, ref) => {
  const [tocData, setTocData] = React.useState<TocContext>();
  const [editorIdentifier, setEditorIdentifier] = React.useState<string>(editorId ?? v4());
  const [tocRepo, setTocRepo] = React.useState<TocRepo>();
  const lastContentRef = useRef<string>("");
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setTocRepo(createTocRepo(editorIdentifier));
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
      types: ["paragraph", "heading"],
    }),
    TextStyle,
    FontSize,
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
      getId: (textContent) => "toc-" + v4().slice(0, 8),
      onUpdate: (data, isCreate) => {
        const mappedData = data.map(d => ({
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
  ];

  const editor = useEditor({
    extensions: extensions,
    content: content,
    onCreate: onCreate,
    onUpdate: onUpdate,
  }, [tocRepo]);
  
  useImperativeHandle(ref, () => editor, [editor]);
  return (
    <div className="print:hidden border border-grey-200 bg-gray-100">
      <BlockMenuBar
        editor={editor}
        onPrint={onPrint}
        onSave={onSave}
        isSaving={isSaving}
        saveStatus={saveStatus}
        onOpenVersionHistory={onOpenVersionHistory}
      />
      <TocContext.Provider value={tocData}>
        <div className="w-[962px] m-auto bg-white mt-6 mb-6">
          <EditorContent id={editorIdentifier} editor={editor} />
        </div>
      </TocContext.Provider>
    </div>
  );
});

NewEditor.displayName = 'NewEditor';
