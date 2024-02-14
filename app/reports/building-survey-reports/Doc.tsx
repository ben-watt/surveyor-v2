import React, { useState, useEffect, useRef } from "react";
import { renderToString } from "react-dom/server";
import { BuildingSurveyData } from "./BuildingSurveyReportData";

import { useForm, FormProvider } from "react-hook-form";
import { Editor } from "@tinymce/tinymce-react";
import type { Editor as TinyMCEEditor } from "tinymce";
import BuildingSurveyReport from "./BuildingSurveyReportTiny";
import { DefectInput, ToggleSection } from "./Defects";
import { PrimaryBtn } from "@/app/components/Buttons";
import InputText from "../Input/InputText";
import InputImage from "../Input/ImageInput";
import SmartTextArea from "../Input/SmartTextArea";

export default function Report(props: any) {

  const TINY_API_KEY = process.env.NEXT_PUBLIC_TINY_MCE_API_KEY;
  const [dirty, setDirty] = useState(false);
  const editorRef = useRef<TinyMCEEditor>();
  const [initialValue, setInitialValue] = useState("");
  const [customCss, setCustomCss] = useState("");
  const [contentCss, setContentCss] = useState("writer")
  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile)
      setContentCss("document")
  })

  const defaultValues: BuildingSurveyData = {
    id: 0,
    reportDate: new Date(),
    address: "",
    clientName: "",
    frontElevationImage: [],
    conditionSections: [
      { name: "Foundations and Substructure", isPartOfSurvey: false, description: "", components: [], images: [] },
      { name: "Roof Coverings", isPartOfSurvey: false, description: "", components: [], images: [] },
      { name: "Rainwater Disposal System", isPartOfSurvey: false, description: "", components: [], images: [] },
      { name: "Soffits and Fascias", isPartOfSurvey: false, description: "", components: [], images: [] },
      { name: "Main Walls", isPartOfSurvey: false, description: "", components: [], images: [] },
      { name: "Damp Proof Courses", isPartOfSurvey: false, description: "", components: [], images: [] },
      { name: "Windows and Doors", isPartOfSurvey: false, description: "", components: [], images: [] },
      { name: "Roof Void", isPartOfSurvey: false, description: "", components: [], images: [] },
      { name: "Ceilings", isPartOfSurvey: false, description: "", components: [], images: [] },
      { name: "Walls and Partitions", isPartOfSurvey: false, description: "", components: [], images: [] },
      { name: "Floors", isPartOfSurvey: false, description: "", components: [], images: [] },
      { name: "Sanitaryware & Kitchen", isPartOfSurvey: false, description: "", components: [], images: [] },
      { name: "Electrical Installation", isPartOfSurvey: false, description: "", components: [], images: [] },
      { name: "Gas/Oil Installations", isPartOfSurvey: false, description: "", components: [], images: [] },
      { name: "Cold Water Supply", isPartOfSurvey: false, description: "", components: [], images: [] },
      { name: "Boundaries, Fencing, Drives, Lawn, etc", isPartOfSurvey: false, description: "", components: [], images: [] }
    ],
  };

  const methods = useForm<BuildingSurveyData>({ defaultValues });
  const { register, handleSubmit, watch } = methods;

  const onSubmit = () => {
    setInitialValue(
      renderToString(<BuildingSurveyReport form={watch()} />)
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
    <div className="md:grid md:grid-cols-4 ">
      <div className="col-start-2 col-span-2">
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div>
              <InputText labelTitle="Address" register={() => register("address", { required: true })} />
              <InputText labelTitle="Client" register={() => register("clientName", { required: true })} />
              <div>
                <label className="mt-2" htmlFor="file-input">Front Elevation Image</label>
                <InputImage register={() => register("frontElevationImage")} />
              </div>
              {defaultValues.conditionSections.map((k, i) => (
                <section className="mt-2">
                  <ToggleSection label={k.name} register={() => register(`conditionSections.${i}.isPartOfForm`)}>
                    <div>
                      <SmartTextArea 
                        label={k.name} 
                        placeholder={`Description of the ${k.name.toLowerCase()}...`}
                        register={() => register(`conditionSections.${i}.description`)} />
                      <DefectInput register={() => register(`conditionSections.${i}.defects`)}></DefectInput>
                      <InputImage register={() => register(`conditionSections.${i}.images`)} />
                    </div>
                  </ToggleSection>
                </section>
              ))}
            </div>
            <div className="flex justify-center mt-8 mb-8">
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
            menubar: true,
            skin: 'oxide-dark',
            plugins: [
              'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
              'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
              'insertdatetime', 'media', 'table', 'help', 'wordcount', 'export', 'pagebreak'
            ],
            toolbar: 'export | undo redo | blocks pagebreak | ' +
              'bold italic backcolor | alignleft aligncenter ' +
              'alignright alignjustify | bullist numlist outdent indent | ' +
              'removeformat | help',
            content_css: contentCss,
            pagebreak_separator: "<p>---------</p>",
          }}
        />

        {dirty && <p>You have unsaved content!</p>}
        <div className="flex justify-end mt-8 mb-8">
          <PrimaryBtn onClick={save} disabled={!dirty}>Save</PrimaryBtn>
        </div>
      </div>
    </div>
  );
}