import React from "react";
import { Editor } from "@tinymce/tinymce-react";

export type ContentCss = "document" | "mobile";

interface TextEditorProps {
  initialValue?: string;
  onInit?: (e: any) => void;
  onDirty?: (e: any) => void;
  contentCss: ContentCss;
}

export const TextEditor = ({ initialValue, onInit, onDirty, contentCss = "document" } : TextEditorProps) => {
  const TINY_API_KEY = process.env.NEXT_PUBLIC_TINY_MCE_API_KEY;

  return (
    <Editor
      apiKey={TINY_API_KEY}
      onInit={onInit}
      initialValue={initialValue}
      onDirty={onDirty}
      init={{
        height: 1000,
        menubar: true,
        skin: "oxide-dark",
        plugins: [
          "advlist",
          "autolink",
          "lists",
          "link",
          "image",
          "charmap",
          "preview",
          "anchor",
          "searchreplace",
          "visualblocks",
          "code",
          "fullscreen",
          "insertdatetime",
          "media",
          "table",
          "help",
          "wordcount",
          "pagebreak",
        ],
        toolbar: "undo redo | blocks pagebreak | " +
          "bold italic backcolor | alignleft aligncenter " +
          "alignright alignjustify | bullist numlist outdent indent | " +
          "removeformat | help",
        content_css: contentCss,
        pagebreak_separator: "<p>---------</p>",
      }} />
  );
};
