import { Editor, Node, NodePos } from "@tiptap/core";
import {
  mergeAttributes,
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import { createContext, useCallback, useEffect, useState, useRef } from "react";
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

  addOptions() {
    return {
      repo: null as TocRepo | null,
    }
  },

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
    const options = this.options;
    if (!options.repo) {
      return ['div', { 'data-type': 'table-of-contents' }, ''];
    }

    const data = options.repo.getParsed();
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
      <p style={{ fontSize: "14pt", marginBottom: "8mm" }}>Table of Contents</p>
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
            <li className="dots"
              key={d.itemId} >
              <p
                data-toc-id-selector={d.selector}
              >
                {d.hierarchyText}  {d.textContent}
              </p>
            </li>
          ))}
      </ul>
    </section>
  );
};


function appendZeroToHierarchyText(text: string): string {
  if(text.includes(".")) {
    return text;
  }
  return text + ".0";
}

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
      hierarchyText: appendZeroToHierarchyText(text),
    };
  });
}

export interface TocRepo {
  key: string;
  getParsed: () => TableOfContentsDataItemWithHierarchy[];
  get: () => TocContext;
  set: (data: TocDataItem[], isCreate: boolean) => void;
  clear: () => void;
}

export const createTocRepo = (key: string): TocRepo => {
  const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

  interface TocStorageValue {
    data: TocDataItem[];
    isCreate: boolean;
    createdAt?: number;
    updatedAt?: number;
  }

  const safeParse = (value: string | null): TocStorageValue | null => {
    if (!value) return null;
    try {
      return JSON.parse(value) as TocStorageValue;
    } catch {
      return null;
    }
  };

  const cleanStaleTocEntries = (prefix: string, ttlMs: number, maxEntries = 100) => {
    try {
      const now = Date.now();
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) keys.push(k);
      }

      // Remove invalid or expired
      const valid: { key: string; value: TocStorageValue; updatedAt: number }[] = [];
      for (const k of keys) {
        const parsed = safeParse(localStorage.getItem(k));
        const updatedAt = parsed?.updatedAt ?? parsed?.createdAt ?? 0;
        if (!parsed) {
          localStorage.removeItem(k);
          continue;
        }
        if (updatedAt && now - updatedAt > ttlMs) {
          localStorage.removeItem(k);
          continue;
        }
        valid.push({ key: k, value: parsed, updatedAt });
      }

      // Enforce max entries by most recent
      if (valid.length > maxEntries) {
        valid
          .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
          .slice(maxEntries)
          .forEach(entry => localStorage.removeItem(entry.key));
      }
    } catch {
      // no-op: best effort cleanup
    }
  };

  // Opportunistic cleanup on repo creation
  cleanStaleTocEntries('toc:', TTL_MS);

  if (localStorage.getItem(key) == null) {
    const now = Date.now();
    localStorage.setItem(key, JSON.stringify({ data: [], isCreate: true, createdAt: now, updatedAt: now }));
  }

  const getParsed = (): TableOfContentsDataItemWithHierarchy[] => {
    const { data } = get();
    return parseDataHierarchy(data);
  }

  const get = (): TocContext => {
    const raw = localStorage.getItem(key);
    if (raw != undefined) {
      const parsed = safeParse(raw);
      if (parsed) {
        return { data: parsed.data ?? [], isCreate: parsed.isCreate };
      }
    }
    return { data: [], isCreate: false };
  }

  const set = (data: TocDataItem[], isCreate: boolean) => {
    const now = Date.now();
    const existing = safeParse(localStorage.getItem(key));
    const createdAt = existing?.createdAt ?? now;
    localStorage.setItem(key, JSON.stringify({ data, isCreate, createdAt, updatedAt: now }));
  }

  const clear = () => {
    localStorage.removeItem(key);
  }

  return {
    key: key,
    getParsed,
    get,
    set,
    clear,
  }
}

export const cleanupTocStorage = (options?: { ttlMs?: number; maxEntries?: number }) => {
  const TTL_MS = options?.ttlMs ?? 1000 * 60 * 60 * 24 * 7;
  const MAX = options?.maxEntries ?? 100;
  try {
    const now = Date.now();
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('toc:')) keys.push(k);
    }
    const valid: { key: string; updatedAt: number }[] = [];
    for (const k of keys) {
      try {
        const parsed = JSON.parse(localStorage.getItem(k) || '{}');
        const updatedAt = parsed.updatedAt ?? parsed.createdAt ?? 0;
        if (!updatedAt || now - updatedAt > TTL_MS) {
          localStorage.removeItem(k);
        } else {
          valid.push({ key: k, updatedAt });
        }
      } catch {
        localStorage.removeItem(k);
      }
    }
    if (valid.length > MAX) {
      valid
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
        .slice(MAX)
        .forEach(entry => localStorage.removeItem(entry.key));
    }
  } catch {
    // ignore
  }
}

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
          text: nodePos.textContent
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
      const repo = (editor.extensionManager.extensions.find(ext => ext.name === 'table-of-contents')?.options as any).repo as TocRepo;
      if (!repo) {
        console.error('TocNode: No repository configured');
        return;
      }

      const { data } = repo.get();
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
    const handleCreate = () => {
      setTimeout(updateToc, 100);
    };

    editor.on('create', handleCreate);
    handleCreate();

    return () => {
      editor.off('create', handleCreate);
    };
  }, [editor, updateToc]);

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
