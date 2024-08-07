"use client";

import {
  useEditor,
  EditorContent,
  BubbleMenu,
  ReactRenderer,
  Content,
  EditorEvents,
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
import { EditorProvider, useCurrentEditor } from "@tiptap/react";
import React from "react";
import Paragraph from "@tiptap/extension-paragraph";
import { Bold, Italic, Strikethrough } from "lucide-react";
import BlockMenuBar from "./BlockMenuBar";

interface BlockEditorProps {
  content?: string;
}

const BlockEditor = ({ content }: BlockEditorProps) => {
  const configuredMention = Mention.configure({
    renderHTML({ options, node }) {
      return ["span", options.HTMLAttributes, node.content];
    },
    suggestion: {
      char: "{",
      items: ({ query }) => {
        return [
          "Lea Thompson",
          "Cyndi Lauper",
          "Tom Cruise",
          "Madonna",
          "Jerry Hall",
          "Joan Collins",
          "Winona Ryder",
          "Christina Applegate",
          "Alyssa Milano",
          "Molly Ringwald",
          "Ally Sheedy",
          "Debbie Harry",
          "Olivia Newton-John",
          "Elton John",
          "Michael J. Fox",
          "Axl Rose",
          "Emilio Estevez",
          "Ralph Macchio",
          "Rob Lowe",
          "Jennifer Grey",
          "Mickey Rourke",
          "John Cusack",
          "Matthew Broderick",
          "Justine Bateman",
          "Lisa Bonet",
        ]
          .filter((item) => item.toLowerCase().startsWith(query.toLowerCase()))
          .slice(0, 5);
      },
      render: () => {
        let component: any;
        let popup: any;

        console.log("render");

        return {
          onStart: (props) => {
            console.log("onStart");
            component = new ReactRenderer(MentionList, {
              props,
              editor: props.editor,
            });

            if (!props.clientRect) {
              return;
            }

            popup = tippy("body", {
              getReferenceClientRect: props.clientRect,
              appendTo: () => document.body,
              content: component.element,
              showOnCreate: true,
              interactive: true,
              trigger: "manual",
              placement: "bottom-start",
            });
          },
          onUpdate(props) {
            component.updateProps(props);

            if (!props.clientRect) {
              return;
            }

            popup[0].setProps({
              getReferenceClientRect: props.clientRect,
            });
          },

          onKeyDown(props) {
            if (props.event.key === "Escape") {
              popup[0].hide();

              return true;
            }

            return component.ref?.onKeyDown(props);
          },

          onExit() {
            popup[0].destroy();
            component.destroy();
          },
        };
      },
    },
  });

  const editor = useEditor({
    extensions: [StarterKit, configuredMention],
    content: content ?? "<p>Hello World! 🌎️</p>",
  });

  if (editor == null) return null;

  return (
    <div>
      <BubbleMenu
        className="border border-black p-1 bg-white flex space-x-2 rounded-sm"
        editor={editor}
        tippyOptions={{ duration: 100 }}
      >
        <button onClick={() => editor.chain().focus().toggleBold().run()}>
          Bold
        </button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()}>
          Italic
        </button>
        <button onClick={() => editor.chain().focus().toggleStrike().run()}>
          Strike
        </button>
      </BubbleMenu>
      <EditorContent className="border border-grey-800 p-2" editor={editor} />
    </div>
  );
};


interface MenuBarProps {
  onPrint: (html: string) => void
}

const MenuBar = ({ onPrint } : MenuBarProps) => {
  const { editor } = useCurrentEditor();

  if (!editor) {
    return null;
  }


  return (
    <div className="control-group print:hidden border border-red-500 rounded">
      <div className="button-group">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "is-active" : ""}
        >
          <Bold />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "is-active" : ""}
        >
          <Italic />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={editor.isActive("strike") ? "is-active" : ""}
        >
          <Strikethrough />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={!editor.can().chain().focus().toggleCode().run()}
          className={editor.isActive("code") ? "is-active" : ""}
        >
          Code
        </button>
        <button onClick={() => editor.chain().focus().unsetAllMarks().run()}>
          Clear marks
        </button>
        <button onClick={() => editor.chain().focus().clearNodes().run()}>
          Clear nodes
        </button>
        <button
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={editor.isActive("paragraph") ? "is-active" : ""}
        >
          Paragraph
        </button>
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={
            editor.isActive("heading", { level: 1 }) ? "is-active" : ""
          }
        >
          H1
        </button>
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={
            editor.isActive("heading", { level: 2 }) ? "is-active" : ""
          }
        >
          H2
        </button>
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={
            editor.isActive("heading", { level: 3 }) ? "is-active" : ""
          }
        >
          H3
        </button>
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 4 }).run()
          }
          className={
            editor.isActive("heading", { level: 4 }) ? "is-active" : ""
          }
        >
          H4
        </button>
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 5 }).run()
          }
          className={
            editor.isActive("heading", { level: 5 }) ? "is-active" : ""
          }
        >
          H5
        </button>
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 6 }).run()
          }
          className={
            editor.isActive("heading", { level: 6 }) ? "is-active" : ""
          }
        >
          H6
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "is-active" : ""}
        >
          Bullet list
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "is-active" : ""}
        >
          Ordered list
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={editor.isActive("codeBlock") ? "is-active" : ""}
        >
          Code block
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive("blockquote") ? "is-active" : ""}
        >
          Blockquote
        </button>
        <button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          Horizontal rule
        </button>
        <button onClick={() => editor.chain().focus().setHardBreak().run()}>
          Hard break
        </button>
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
        >
          Undo
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
        >
          Redo
        </button>
        <button
          onClick={() => editor.chain().focus().setColor("#958DF1").run()}
          className={
            editor.isActive("textStyle", { color: "#958DF1" })
              ? "is-active"
              : ""
          }
        >
          Purple
        </button>
        <button onClick={() => onPrint(editor.getHTML())}>Print</button>
      </div>
    </div>
  );
};

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


const extensions = [
  Color.configure({ types: [TextStyle.name, ListItem.name] }),
  TextStyle.configure({ types: [ListItem.name] }),
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

interface NewEditorProps {
  content: Content
  onUpdate?: (props: EditorEvents["update"]) => void
  onCreate?: (props: EditorEvents["create"]) => void
  onPrint: (html: string) => void
}

export const NewEditor = ({ onPrint, content, onUpdate, onCreate } : NewEditorProps) => {
  return (
    <div className="print:hidden">
      <EditorProvider
        onCreate={onCreate}
        onUpdate={onUpdate}
        slotBefore={<BlockMenuBar />}
        extensions={extensions}
        content={content}>
        </EditorProvider>
    </div>
  );
};

export default BlockEditor;
