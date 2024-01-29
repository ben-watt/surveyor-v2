import React, { useState, useEffect, useRef } from "react";
import { renderToString } from "react-dom/server";
import { BuildingSurveyData } from "./BuildingSurveyReportData";

import { useForm, FormProvider } from "react-hook-form";
import { Editor } from "@tinymce/tinymce-react";
import BuildingSurveyReport from "./BuildingSurveyReportTiny";
import Introduction from "./Introduction";
import ConditionSection from "./Defects";




export default function Report(props: any) {

  const TINY_API_KEY = process.env.NEXT_PUBLIC_TINY_MCE_API_KEY;
  console.log("apikey", TINY_API_KEY);

  const [dirty, setDirty] = useState(false);
  const editorRef = useRef(null);
  const [initialValue, setInitialValue] = useState("");
  const [customCss, setCustomCss] = useState("");

  const defaultValues = {
    reportDate: new Date(),
    conditionSections: [
      { name: "Roof" },
      { name: "Walls" },
      { name: "Floors" },
      { name: "Windows" },
      { name: "Doors" },
      { name: "Ceilings" },
      { name: "Stairs" },
    ],
  };

  const methods = useForm<BuildingSurveyData>({ defaultValues });

  const onSubmit = () => {
    setInitialValue(
      renderToString(<BuildingSurveyReport form={methods.watch()} />)
    );
  };

  useEffect(() => { 
    const getCustomCss = async () => {
      const customCss = await import("./tinymce-custom.css");
      setCustomCss(customCss.default);  
    }

    getCustomCss();
    setDirty(false);
  }, [initialValue]);

  const save = () => {
    if (editorRef.current) {
      const content = editorRef.current.getContent();
      setDirty(false);
      editorRef.current.setDirty(false);
    }
  };

  return (
    <>
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <div>
            <Introduction></Introduction>
            {defaultValues.conditionSections.map((k, i) => (
              <ConditionSection
                formKey={`conditionSections.${i}`}
                label={k.name}
              ></ConditionSection>
            ))}
          </div>
          <div className="flex justify-end m-10">
            <input className="btn btn-primary" type="submit"></input>
          </div>
        </form>
      </FormProvider>
      <Editor apiKey={TINY_API_KEY}
        onInit={(evt, editor) => {
          editorRef.current = editor;
        }}
        initialValue={initialValue}
        onDirty={() => setDirty(true)}
        init={{
          height: 1000,
          menubar: false,
          plugins: [
            "advlist autolink lists link image charmap print preview anchor",
            "searchreplace visualblocks code fullscreen",
            "insertdatetime media table paste code help wordcount importcss",
          ],
          toolbar:
            "undo redo | formatselect | " +
            "bold italic backcolor | alignleft aligncenter " +
            "alignright alignjustify | bullist numlist outdent indent | " +
            "removeformat | help",
          content_css: ["document"],
          content_style: customCss   
        }}
      />
      <button className="btn btn-primary mt-5" onClick={save} disabled={!dirty}>
        Save
      </button>
      {dirty && <p>You have unsaved content!</p>}
    </>
  );
}