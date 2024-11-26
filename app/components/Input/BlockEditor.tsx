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

import React, { useEffect } from "react";
import Paragraph from "@tiptap/extension-paragraph";
import Heading from "@tiptap/extension-heading";
import ImageResize from "tiptap-extension-resize-image";
import Section from "../TipTapExtensions/Section";
import FileHandler from "@tiptap-pro/extension-file-handler";
import Highlight from '@tiptap/extension-highlight';
import { FontSize } from "../TipTapExtensions/FontSize";
import BlockMenuBar from "./BlockMenuBar";
import {
  getHierarchicalIndexes,
  TableOfContentData,
  TableOfContentDataItem,
  TableOfContents,
} from "@tiptap-pro/extension-table-of-contents";
import { renderToStaticMarkup } from "react-dom/server";
import { v4 } from "uuid";
import { Node } from "@tiptap/core";


/*
  Will allow the node to have the attributes mentioned in the array
*/
function extendAttributes<T>(node: Node<T>, attrs: string[], attrDefault?: string) {
  return node.extend({
      addAttributes() {
          return attrs.reduce((acc: Record<string, any>, attr) => {
              acc[attr] = {
                  default: attrDefault ?? null,
                  renderHTML: (attributes : Record<string, any>) => {
                      if (attributes[attr]) {
                          return {
                              [attr]: attributes[attr],
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
  content: Content;
  onUpdate?: (props: EditorEvents["update"]) => void;
  onCreate?: (props: EditorEvents["create"]) => void;
  onPrint: () => void;
}

function parseDataHierarchy(data: TableOfContentData) {
  let stack: number[] = [];

  return data.map((item, i, array) => {
    const previousItem = array[i - 1];
    // Down the hierarchy
    if (previousItem && previousItem.originalLevel < item.originalLevel) {
      const levelsToPush = item.originalLevel - previousItem.originalLevel;
      for (let i = 0; i < levelsToPush; i++) {
        if (i > 0) {
          stack.push(1);
        } else {
          stack.push(previousItem.itemIndex);
        }
      }
    }

    // Up the hierarchy
    if (previousItem && previousItem.originalLevel > item.originalLevel) {
      const levelsToPop = previousItem.originalLevel - item.originalLevel;
      for (let i = 0; i < levelsToPop; i++) {
        stack.pop();
      }
    }

    stack.push(item.itemIndex);
    const text = stack.join(".");
    console.log("[Table Of Contents]", text);
    stack.pop();
    return {
      item,
      hierarchyText: text,
    };
  });
}

interface TableOfContentsDataItemWithHierarchy {
  item: TableOfContentDataItem;
  hierarchyText: string;
}

const ImageResizeWithAttributes = extendAttributesWithDefaults(ImageResize, { "style" : "width: 100%; height: auto; cursor: pointer;"});

export const NewEditor = ({
  onPrint,
  content,
  onUpdate,
  onCreate,
}: NewEditorProps) => {
  const [tocData, setTocData] =
    React.useState<TableOfContentsDataItemWithHierarchy[]>();

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
    extendAttributes(Paragraph, ["id", "data-toc-id-selector"]),
    extendAttributes(Heading, ["data-add-toc-here-id"]),
    StarterKit.configure({
      listItem: {},
      bulletList: {
        keepMarks: true,
        keepAttributes: false, // TODO : Making this as `false` becase marks are not preserved when I try to preserve attrs, awaiting a bit of help
      },
      orderedList: {
        keepMarks: true,
        keepAttributes: false, // TODO : Making this as `false` becase marks are not preserved when I try to preserve attrs, awaiting a bit of help
      },
    }),
    TableOfContents.configure({
      getIndex: getHierarchicalIndexes,
      getId: (textContent) => "toc-" + v4().slice(0, 8),
      onUpdate: (data, isCreate) => {
        if (isCreate) {
          const dataWithHierarchy = parseDataHierarchy(data);
          setTocData(dataWithHierarchy);
        }
      },
    }),
  ];

  const editor = useEditor({
    extensions: extensions,
    content: content,
    onCreate: onCreate,
    onUpdate: onUpdate,
  });

  useEffect(() => {
    if (tocData && editor) {
      tocData.map((d) => {
        // If the item contains attribute data-toc-id, then we need to update the id of the element
        const id = d.item.dom.getAttribute("data-add-toc-here-id");

        if (id) {
          const $toc = editor.$node("paragraph", { id: id });
          if ($toc) {
            $toc.content = d.hierarchyText;
          }
        } else {
          const $header = editor.$node("heading", { id: d.item.id });
          if(!$header) {
            console.error("Header not found for TOC", d.item.id);
            return;
          }
          $header.content = d.hierarchyText + " " + d.item.textContent;
        }
      });

      console.debug("Inserting TOC");
      const selector = "#toc";
      const element = editor.view.dom.querySelector(selector);
      if (element == null) {
        console.error(
          `Element not found to insert TOC, please add a '<section id="${selector}"></section>' element.`
        );
      } else {
        const pos = editor.view.posAtDOM(element, 0);
        const toc = renderToStaticMarkup(<Toc data={tocData} />);
        console.debug("Inserting TOC at", pos);
        editor?.chain().insertContentAt(pos, toc).run();
      }
    }
  }, [editor, tocData]);

  return (
    <div className="print:hidden border border-grey-200">
      <BlockMenuBar editor={editor} onPrint={onPrint} />
      <EditorContent editor={editor} />
    </div>
  );
};

interface TocProps {
  data: TableOfContentsDataItemWithHierarchy[];
  maxDepth?: number;
}

const Toc = ({ data, maxDepth = 1 }: TocProps) => {
  return (
    <ul>
      {data
        .filter((d) => d.item.originalLevel <= maxDepth)
        .map((d) => ({
          itemId: d.item.id,
          hierarchyText: d.hierarchyText,
          textContent: d.item.textContent,
          selector: `#${CSS.escape(d.item.id)}`,
        }))
        .map((d) => (
          <li key={d.itemId}>
            <p data-toc-id-selector={d.selector}>
              {d.hierarchyText}{" "}{d.textContent}
            </p>
          </li>
        ))}
    </ul>
  );
};
