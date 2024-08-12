"use client";

import {
  useEditor,
  EditorContent,
  BubbleMenu,
  ReactRenderer,
  Content,
  EditorEvents,
  Editor,
} from "@tiptap/react";
import Mention from "@tiptap/extension-mention";
import StarterKit from "@tiptap/starter-kit";
import MentionList from "../MentionList";
import tippy from "tippy.js";
import { Color } from "@tiptap/extension-color";
import ListItem from "@tiptap/extension-list-item";
import TextStyle from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";

import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";

import Image from "@tiptap/extension-image";
import React, { useEffect } from "react";
import Paragraph from "@tiptap/extension-paragraph";
import BlockMenuBar from "./BlockMenuBar";
import { getHierarchicalIndexes, TableOfContentData, TableOfContentDataItem, TableOfContents } from "@tiptap-pro/extension-table-of-contents";
import { renderToHTML } from "next/dist/server/render";
import { renderToStaticMarkup, renderToString } from "react-dom/server";

// Used to create a custom paragraph with style attribute
const CustomParagraph = Paragraph.extend({
  addAttributes() {
      return {
          style: {
              default: null,
              renderHTML: attributes => {
                  if (attributes.style) {
                      return {
                        style: `${attributes.style}`,
                      }
                  }

                  return {}
              },
          },
      }
  },
})

interface NewEditorProps {
  content: Content
  onUpdate?: (props: EditorEvents["update"]) => void
  onCreate?: (props: EditorEvents["create"]) => void
  onPrint: (html: string) => void
}

export const NewEditor = ({ onPrint, content, onUpdate, onCreate } : NewEditorProps) => {
  const [tocData, setTocData] = React.useState<TableOfContentData>();
  const extensions = [
    TableOfContents.configure({
      getIndex: getHierarchicalIndexes,
      onUpdate: (data, isCreate) => {
        if(!isCreate) {
          return;
        }
        
        setTocData(data);
        console.log(data)
      },
    }),
    Color.configure({ types: [TextStyle.name, ListItem.name] }),
    TextStyle,
    Image.configure({
      allowBase64: true,
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    TextAlign.configure({
      types: ["paragraph", "heading"],
    }),
    CustomParagraph,
    StarterKit.configure({
      bulletList: {
        keepMarks: true,
        keepAttributes: false, // TODO : Making this as `false` becase marks are not preserved when I try to preserve attrs, awaiting a bit of help
      },
      orderedList: {
        keepMarks: true,
        keepAttributes: false, // TODO : Making this as `false` becase marks are not preserved when I try to preserve attrs, awaiting a bit of help
      },
    }),
  ];

  const editor = useEditor({
    extensions: extensions,
    content: content,
    onCreate: onCreate,
    onUpdate: onUpdate
  });

  useEffect(() => {
    if(tocData) {
      const toc = renderToStaticMarkup(<Toc data={tocData} />);
      editor?.chain().insertContentAt(0, toc).run();
    }
  }, [editor, tocData])

  return (
    <div className="print:hidden">
      <BlockMenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};

const Toc = ({ data }: { data: TableOfContentData }) => {
  let stack = [];

  return (
    <div className="table-of-contents">
      <ul>
        {data.map((item, i, array) => {
          const previousItem = array[i - 1];
          if(previousItem && previousItem.level < item.level) {
            stack.push(previousItem.itemIndex);
          }

          if(previousItem && previousItem.level > item.level) {
            stack.pop();
          }

          stack.push(item.itemIndex);
          const text = stack.join(".");
          stack.pop();

          return (
            <li key={item.id}>
              <p>{text} - {item.textContent}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}