"use client";

import BlockEditor, { NewEditor } from "@/app/components/Input/BlockEditor";

import { Previewer } from "pagedjs";
import React from "react";
import { useEffect, useRef, useState } from "react";
import { set } from "react-hook-form";

export default function Page() {
  const previewRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState("<h1>loading...</h1>");
  let [isInitilised, setIsInitilised] = useState(false)


  useEffect(() => {
    const paged = new Previewer({});
    
    if (isInitilised) {
      previewRef.current?.replaceChildren();
      paged.preview(content, ["/pagedstyles.css", "/interface.css"], previewRef.current).then((flow: any) => {
        console.log('Rendered', flow.total, 'pages.');
      });
    }

    if(!isInitilised) {
      setIsInitilised(true)
    }

  }, [content]);

  return (
    <div className="tiptap">
      <NewEditor onPrint={(html) => setContent(html)} />
      <div className="pagedjs_print_preview">
        <div ref={previewRef} />
      </div>
    </div>
  );
}
