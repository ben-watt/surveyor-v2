import React, { useState, useEffect, useRef } from "react";
import { renderToString } from "react-dom/server";
import { BuildingSurveyData } from "./BuildingSurveyReportData";

import { useForm, FormProvider } from "react-hook-form";
import { Editor } from "@tinymce/tinymce-react";
import type { Editor as TinyMCEEditor } from "tinymce";
import BuildingSurveyReport from "./BuildingSurveyReportTiny";
import Introduction from "./Introduction";
import ConditionSection from "./Defects";
import { PrimaryBtn } from "@/app/components/Buttons";




export default function Report(props: any) {

  const TINY_API_KEY = process.env.NEXT_PUBLIC_TINY_MCE_API_KEY;
  const [dirty, setDirty] = useState(false);
  const editorRef = useRef<TinyMCEEditor>();
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
      const customCss = await import("./tinymce-custom.module.css");
      setCustomCss(customCss.default.toString());
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
    <div className="grid md:grid-cols-4 sm:grid-cols-2">
      <div className="col-start-2 col-span-2">
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
              <PrimaryBtn type="submit">Generate Report</PrimaryBtn>
            </div>
          </form>
        </FormProvider>
      </div>
      <div className="col-span-4">
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
              'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
              'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
              'insertdatetime', 'media', 'table', 'help', 'wordcount', 'export', 'pagebreak'
            ],
            toolbar: 'export | undo redo | blocks pagebreak | ' +
              'bold italic backcolor | alignleft aligncenter ' +
              'alignright alignjustify | bullist numlist outdent indent | ' +
              'removeformat | help',
            content_css: ["document"],
            pagebreak_separator: "<p>---------</p>",
          }}
        />
        <PrimaryBtn onClick={save} disabled={!dirty}>Save</PrimaryBtn>
        {dirty && <p>You have unsaved content!</p>}
      </div>
    </div>
  );
}