"use client";

import {
  useEditor,
  EditorContent,
  Content,
  EditorEvents,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
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
import Heading from "@tiptap/extension-heading";
import BlockMenuBar from "./BlockMenuBar";
import {
  getHierarchicalIndexes,
  TableOfContentData,
  TableOfContentDataItem,
  TableOfContents,
} from "@tiptap-pro/extension-table-of-contents";
import { renderToStaticMarkup } from "react-dom/server";

// Used to create a custom paragraph with style attribute
const CustomParagraph = Paragraph.extend({
  addAttributes() {
    return {
      id: {
        default: null,
        renderHTML: (attributes) => {
          if (attributes.id) {
            return {
              id: attributes.id,
            };
          }

          return {};
        },
      },
      style: {
        default: null,
        renderHTML: (attributes) => {
          if (attributes.style) {
            return {
              style: `${attributes.style}`,
            };
          }

          return {};
        },
      },
    };
  },
});

const CustomHeading = Heading.extend({
  addAttributes() {
    return {
      "data-add-toc-here-id": {
        default: null,
        renderHTML: (attributes) => {
          if (attributes["data-add-toc-here-id"]) {
            return {
              "data-add-toc-here-id": attributes["data-add-toc-here-id"],
            };
          }

          return {};
        },
      },
    }
  }
})

interface NewEditorProps {
  content: Content;
  onUpdate?: (props: EditorEvents["update"]) => void;
  onCreate?: (props: EditorEvents["create"]) => void;
  onPrint: () => void;
}


function parseDataHierarchy(data : TableOfContentData) {
  let stack = [];

  return data.map((item, i, array) => {
    const previousItem = array[i - 1];
    if (previousItem && previousItem.originalLevel < item.originalLevel) {
      const levelsToPush = item.originalLevel - previousItem.originalLevel;
      for (let i = 0; i < levelsToPush; i++) {
        if(i > 0) {
          stack.push(1);
        } else {
          stack.push(previousItem.itemIndex);
        }
      }
    }

    if (previousItem && previousItem.originalLevel > item.originalLevel) {
      const levelsToPop = previousItem.originalLevel - item.originalLevel;
      for (let i = 0; i < levelsToPop; i++) {
        stack.pop();
      }
    }

    stack.push(item.itemIndex);
    const text = stack.join(".");
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

export const NewEditor = ({
  onPrint,
  content,
  onUpdate,
  onCreate,
}: NewEditorProps) => {
  const [tocData, setTocData] =
    React.useState<TableOfContentsDataItemWithHierarchy[]>();

  const extensions = [
    TableOfContents.configure({
      getIndex: getHierarchicalIndexes,
      onUpdate: (data, isCreate) => {
        if (isCreate) {
          const dataWithHierarchy = parseDataHierarchy(data);
          setTocData(dataWithHierarchy);
        }
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
    CustomHeading,
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
    onUpdate: onUpdate,
  });

  useEffect(() => {
    if (tocData && editor) {
      tocData.map((d) => {
        // If the item contains attribute data-toc-id, then we need to update the id of the element
        const id = d.item.dom.getAttribute("data-add-toc-here-id");
        if (id) {
          const tocId = document.getElementById(id);
          if (tocId) {
            tocId.innerText = d.hierarchyText;
          }
        }
        else {
          d.item.dom.innerText = d.hierarchyText + " " + d.item.textContent;
        }
        
      });

      console.debug("Inserting TOC");
      const selector = "#toc";
      const element = editor.view.dom.querySelector(selector);
      if (element == null) {
        console.error(
          `Element not found to insert TOC, please add a '<p id="${selector}"></p>' element.`
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
    <div className="print:hidden">
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
    <>
      {data
        .filter((d) => d.item.originalLevel <= maxDepth)
        .map((d) => (
          <p key={d.item.id}>
            {d.hierarchyText} - {d.item.textContent}
          </p>
        ))}
    </>
  );
};
