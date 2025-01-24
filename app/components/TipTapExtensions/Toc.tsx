import { Editor, Node, NodePos } from "@tiptap/core";
import {
  mergeAttributes,
  NodeViewContent,
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import { createContext, useCallback, useEffect, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import DOMPurify from 'dompurify';
import { renderReactToDomSpec } from "./Helper";

interface TocDataItem {
  originalLevel: number;
  level: number;
  textContent: string;
  id: string;
  pos: number;
  itemIndex: number;
}

export interface TocContext {
  data: TocDataItem[];
  isCreate: boolean | undefined;
}

export const TocContext = createContext<TocContext | undefined>({
  data: [],
  isCreate: false,
});

export const TocNode = Node.create({
  name: "table-of-contents",
  group: "block",
  atom: true,
  addAttributes() {
    return {};
  },
  parseHTML() {
    return [
      {
        tag: "div[data-type='table-of-contents']",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const data = TocDataRepo.getParsed();
    const domSpec = renderReactToDomSpec(<Toc data={data} />);

    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "table-of-contents"}),
      domSpec,
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(TocNodeView, { attrs: { id: "toc" } });
  },
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          id: {},
          "data-toc-text": {
            isRequired: false,
            keepOnSplit: false,
          },
          "data-toc-id-selector": {},
          "data-add-toc-here-id": {},
        },
      },
    ];
  },
});

export interface TableOfContentsDataItemWithHierarchy {
  item: TocDataItem;
  hierarchyText: string;
}

interface TocProps {
  maxDepth?: number;
  data: TableOfContentsDataItemWithHierarchy[];
}

const Toc = ({ maxDepth = 1, data }: TocProps) => {
  return (
    <section>
      <p style={{ fontSize: "18pt", marginBottom: "8mm" }}>Table of Contents</p>
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
              <p
                data-toc-id-selector={d.selector}
                data-toc-text={d.hierarchyText}
              >
                {d.textContent}
              </p>
            </li>
          ))}
      </ul>
    </section>
  );
};


function parseDataHierarchy(
  data: TocDataItem[]
): TableOfContentsDataItemWithHierarchy[] {
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
    stack.pop();
    return {
      item,
      hierarchyText: text,
    };
  });
}

export const TocDataRepo = {
  key: "surveyor-editor-toc-data",
  getParsed: (): TableOfContentsDataItemWithHierarchy[] => {
    const { data } = TocDataRepo.get();
    return parseDataHierarchy(data);
  },
  get: (): TocContext => {
    const data = localStorage.getItem(TocDataRepo.key);
    if (data != undefined) {
      return JSON.parse(data);
    }
    return { data: [], isCreate: false };
  },
  set: (data: TocDataItem[], isCreate: boolean) => {
    localStorage.setItem(TocDataRepo.key, JSON.stringify({ data, isCreate }));
  },
};

const replaceNode = (
  editor: Editor,
  nodeType: string,
  nodePos: NodePos,
  attributes: Record<string, any>
) => {
  console.log("[replaceNode]", nodeType, nodePos, attributes);
  editor.commands.deleteRange(nodePos.range);

  const newContent = nodePos.textContent
    ? [
        {
          type: "text",
          text: nodePos.textContent,
        },
      ]
    : [];

  editor.commands.insertContentAt(nodePos.from, {
    type: nodeType,
    attrs: {
      ...nodePos.node.attrs,
      ...attributes,
    },
    content: newContent,
  });
};

export const TocNodeView = ({ editor }: NodeViewProps) => {
  const [currentToc, setCurrentToc] = useState<
    TableOfContentsDataItemWithHierarchy[]
  >();

  const updateToc = useCallback(
    () => {
      const { data } = TocDataRepo.get();
      console.log("[updateToc]", data);
      const tocData = parseDataHierarchy(data);
      tocData.map((d) => {
        const $header = editor.$node("heading", { id: d.item.id });

        if ($header?.attributes["data-add-toc-here-id"] != null) {
          const addHereId = $header.attributes["data-add-toc-here-id"];
          const $addToThisNode = editor.$node("paragraph", { id: addHereId });
          if (!$addToThisNode) {
            console.error("Add here node not found", addHereId);
            return;
          }

          replaceNode(editor,"paragraph", $addToThisNode, {
            "data-toc-text": d.hierarchyText,
          });
          return;
        }

        if (!$header) {
          console.error("Header not found for TOC", d.item.id);
          return;
        }

        replaceNode(editor,"heading", $header, {
          "data-toc-text": d.hierarchyText,
        });
      });

      setCurrentToc(tocData);
    },
    [editor]
  );

  useEffect(() => {
    updateToc();
  }, [updateToc]);

  return (
    <NodeViewWrapper className="hover:bg-slate-100 bg-slate-50 border border-violet-950 rounded-sm relative cursor-pointer p-2 overflow-hidden">
      <p
        className="bg-violet-950 hover:bg-violet-900 rounded-bl-lg p-1 px-2 text-white ml-auto absolute right-0 top-0 hover:cursor-pointer"
        onClick={() => updateToc()}
      >
        Update Toc
      </p>
      {currentToc != undefined ? <Toc data={currentToc} /> : null}
    </NodeViewWrapper>
  );
};
