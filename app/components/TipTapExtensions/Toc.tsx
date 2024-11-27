import {
  TableOfContentData,
  TableOfContentDataItem,
} from "@tiptap-pro/extension-table-of-contents";
import { Node, NodePos } from "@tiptap/core";
import {
  mergeAttributes,
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface TocContext {
  data: TableOfContentData;
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
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "table-of-contents" }),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(Toc, { attrs: { id: "toc" } });
  },
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          id: {},
          "data-toc-text": {
            isRequired: false,
          },
          "data-toc-id-selector": {},
          "data-add-toc-here-id": {},
        },
      },
    ];
  },
});

export interface TableOfContentsDataItemWithHierarchy {
  item: TableOfContentDataItem;
  hierarchyText: string;
}

interface TocProps extends NodeViewProps {
  maxDepth?: number;
}

export const Toc = ({ maxDepth = 1, node, editor }: TocProps) => {
  const ctx = useContext(TocContext);
  const [currentToc, setCurrentToc] = useState<
    TableOfContentsDataItemWithHierarchy[]
  >([]);

  function parseDataHierarchy(
    data: TableOfContentData
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

  function replaceNode(nodeType: string, nodePos: NodePos, attributes: Record<string, any>) {
    editor.commands.deleteRange(nodePos.range);

    const newContent = nodePos.textContent ? [{
      type: "text",
      text: nodePos.textContent,
    }] : []

    editor.commands.insertContentAt(nodePos.from, {
      type: nodeType,
      attrs: {
        ...nodePos.node.attrs,
        ...attributes
      },
      content: newContent,
    })
  }

  const updateToc = useCallback(() => {
    if (ctx === undefined) return;

    const tocData = parseDataHierarchy(ctx.data);
    tocData.map((d) => {

      const $header = editor.$node("heading", { id: d.item.id });

      if($header?.attributes["data-add-toc-here-id"] != null) {
        const addHereId = $header.attributes["data-add-toc-here-id"];
        const $addToThisNode = editor.$node("paragraph", { id: addHereId });
        if (!$addToThisNode) {
          console.error("Add here node not found", addHereId);
          return;
        }

        replaceNode("paragraph", $addToThisNode, {
          "data-toc-text": d.hierarchyText,
        });
        return;
      }

      if (!$header) {
        console.error("Header not found for TOC", d.item.id);
        return;
      }

      replaceNode("heading", $header, {
        "data-toc-text": d.hierarchyText,
      });
    });
    
    setCurrentToc(tocData);
  }, [ctx, editor]);

  useEffect(() => {
    if (ctx?.isCreate) {
      updateToc();
    }
  }, [ctx?.data.length, ctx?.isCreate, currentToc.length, updateToc]);

  return (
    <NodeViewWrapper className="hover:bg-slate-100 bg-slate-50 rounded-sm relative cursor-pointer p-2">
      <p
        className="bg-violet-950 hover:bg-violet-900 rounded text-white pl-1 pr-1 ml-auto absolute right-0 top-0 hover:cursor-pointer"
        onClick={() => updateToc()}
      >
        Update Toc
      </p>
      <p contentEditable={true} style={{ fontSize: "18pt", marginBottom: "8mm" }}>Table of Contents</p>
      <ul>
        {currentToc
          .filter((d) => d.item.originalLevel <= maxDepth)
          .map((d) => ({
            itemId: d.item.id,
            hierarchyText: d.hierarchyText,
            textContent: d.item.textContent,
            selector: `#${CSS.escape(d.item.id)}`,
          }))
          .map((d) => (
            <li key={d.itemId}>
              <p data-toc-id-selector={d.selector} data-toc-text={d.hierarchyText}>{d.textContent}</p>
            </li>
          ))}
      </ul>
    </NodeViewWrapper>
  );
};
