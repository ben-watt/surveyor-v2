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

import React, { useEffect, useRef } from "react";
import ImageResize from "tiptap-extension-resize-image";
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
import { Node } from "@tiptap/core";
import { createTocRepo, TocContext, TocNode, TocRepo } from "../TipTapExtensions/Toc";

function extendAttributesWithDefaults<T>(node: Node<T>, attrs: { [key: string]: string }, attrDefault?: string) {
  return node.extend({
      addAttributes() {
          const keys = Object.keys(attrs);
          return keys.reduce((acc: Record<string, any>, key) => {
              acc[key] = {
                  default: attrs[key] ?? null,
                  renderHTML: (attributes : Record<string, any>) => {
                      if (attributes[key]) {
                          return {
                              [key]: attributes[key],
                          };
                      }
  
                      return {};
                  },
              }
  
              return acc;
          }, this.parent?.() ?? {});
      }
  })
}

interface NewEditorProps {
  editorId?: string;
  content: Content;
  onUpdate?: (props: EditorEvents["update"]) => void;
  onCreate?: (props: EditorEvents["create"]) => void;
  onPrint: () => void;
  onSave: (options?: { auto?: boolean }) => void;
  isSaving: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'autosaved';
}

const ImageResizeWithAttributes = extendAttributesWithDefaults(ImageResize, { "style" : "width: 100%; height: auto; cursor: pointer;"});

export const NewEditor = ({
  editorId,
  onPrint,
  content,
  onUpdate,
  onCreate,
  onSave,
  isSaving,
  saveStatus,
}: NewEditorProps) => {
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
    debounceTimer.current = setTimeout(() => {
      onSave({ auto: true });
      lastContentRef.current = content;
    }, 3000);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [content, isSaving, onSave]);

  const extensions = [
    FileHandler.configure({
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
      onDrop: (currentEditor, files, pos) => {
        files.forEach(file => {
          const fileReader = new FileReader()

          fileReader.readAsDataURL(file)
          fileReader.onload = () => {
            currentEditor.chain().insertContentAt(pos, {
              type: 'image',
              attrs: {
                src: fileReader.result,
              },
            }).focus().run()
          }
        })
      },
      onPaste: (currentEditor, files, htmlContent) => {
        files.forEach(file => {
          if (htmlContent) {
            // if there is htmlContent, stop manual insertion & let other extensions handle insertion via inputRule
            // you could extract the pasted file from this url string and upload it to a server for example
            console.log(htmlContent) // eslint-disable-line no-console
            return false
          }

          const fileReader = new FileReader()

          fileReader.readAsDataURL(file)
          fileReader.onload = () => {
            currentEditor.chain().insertContentAt(currentEditor.state.selection.anchor, {
              type: 'image',
              attrs: {
                src: fileReader.result,
              },
            }).focus().run()
          }
        })
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
    ImageResizeWithAttributes.configure({
      allowBase64: true
    }),
    
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
  
  return (
    <div className="print:hidden border border-grey-200 bg-gray-100">
      <BlockMenuBar editor={editor} onPrint={onPrint} onSave={onSave} isSaving={isSaving} saveStatus={saveStatus} />
      <TocContext.Provider value={tocData}>
        <div className="w-[962px] m-auto bg-white">
          <EditorContent id={editorIdentifier} editor={editor} />
        </div>
      </TocContext.Provider>
    </div>
  );
};
