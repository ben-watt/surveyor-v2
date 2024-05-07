import React, { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";

import { renderToString } from "react-dom/server";
import { BuildingSurveyFormData } from "./BuildingSurveyReportData";

import { useForm, FormProvider } from "react-hook-form";
import type { Editor as TinyMCEEditor } from "tinymce";
import BuildingSurveyReport from "./BuildingSurveyReportTiny";
import { DefectInput, ToggleSection } from "./Defects";
import { PrimaryBtn } from "@/app/components/Buttons";
import InputText from "../Input/InputText";
import InputImage from "../Input/ImageInput";
import SmartTextArea from "../Input/SmartTextArea";
import InputError from "@/app/components/InputError";
import reportClient from "@/app/clients/ReportsClient";
import { successToast } from "@/app/components/Toasts";
import { TextEditor } from "../../components/TextEditor";

export default function Report(props: any) {
  const [dirty, setDirty] = useState(false);
  const editorRef = useRef<TinyMCEEditor>();
  const [initialValue, setInitialValue] = useState("");
  const [contentCss, setContentCss] = useState("writer");

  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) {
      setContentCss("document");
    }
  });

  const defaultValues: BuildingSurveyFormData = {
    id: uuidv4(),
    reportDate: new Date(),
    address: "",
    clientName: "",
    frontElevationImage: [],
    conditionSections: [
      {
        name: "Foundations and Substructure",
        isPartOfSurvey: false,
        description: "",
        components: [],
        images: [],
      },
      {
        name: "Roof Coverings",
        isPartOfSurvey: false,
        description: "",
        components: [],
        images: [],
      },
      {
        name: "Chimneys",
        isPartOfSurvey: false,
        description: "",
        components: [],
        images: [],
      },
      {
        name: "Rainwater Disposal System",
        isPartOfSurvey: false,
        description: "",
        components: [],
        images: [],
      },
      {
        name: "Sofits and Fascias",
        isPartOfSurvey: false,
        description: "",
        components: [],
        images: [],
      },
      {
        name: "Main Walls",
        isPartOfSurvey: false,
        description: "",
        components: [],
        images: [],
      },
      {
        name: "Damp Proof Courses",
        isPartOfSurvey: false,
        description: "",
        components: [],
        images: [],
      },
      {
        name: "Windows and Doors",
        isPartOfSurvey: false,
        description: "",
        components: [],
        images: [],
      },
      {
        name: "Roof Structure",
        isPartOfSurvey: false,
        description: "",
        components: [],
        images: [],
      },
      {
        name: "Ceilings",
        isPartOfSurvey: false,
        description: "",
        components: [],
        images: [],
      },
      {
        name: "Walls and Partitions",
        isPartOfSurvey: false,
        description: "",
        components: [],
        images: [],
      },
      {
        name: "Floors",
        isPartOfSurvey: false,
        description: "",
        components: [],
        images: [],
      },
      {
        name: "Internal Joinery",
        isPartOfSurvey: false,
        description: "",
        components: [],
        images: [],
      },
      {
        name: "Sanitaryware & Kitchen",
        isPartOfSurvey: false,
        description: "",
        components: [],
        images: [],
      },
      {
        name: "Fireplaces",
        isPartOfSurvey: false,
        description: "",
        components: [],
        images: [],
      },
      {
        name: "Electrical Installation",
        isPartOfSurvey: false,
        description: "",
        components: [],
        images: [],
      },
      {
        name: "Gas/Oil Installations",
        isPartOfSurvey: false,
        description: "",
        components: [],
        images: [],
      },
      {
        name: "Cold Water Supply",
        isPartOfSurvey: false,
        description: "",
        components: [],
        images: [],
      },
      {
        name: "Hot Water Supply / Heating Installations",
        isPartOfSurvey: false,
        description: "",
        components: [],
        images: [],
      },
      {
        name: "Surface water soil & drainage",
        isPartOfSurvey: false,
        description: "",
        components: [],
        images: [],
      },
      {
        name: "Boundaries, Fencing, Drives, Lawn, etc",
        isPartOfSurvey: false,
        description: "",
        components: [],
        images: [],
      },
    ],
  };

  const methods = useForm<BuildingSurveyFormData>({ defaultValues });
  const { register, handleSubmit, watch, formState } = methods;

  const onSubmit = async () => {
    try {
      let form = watch();
      let _ = await reportClient.models.Reports.create({
        id: form.id,
        content: JSON.stringify(form),
      });
      successToast("Report created");
    } catch (error) {
      console.error(error);
    }

    setInitialValue(renderToString(<BuildingSurveyReport form={watch()} />));
  };

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
              <div className="space-y-4">
                <div>
                  <InputText
                    labelTitle="Address"
                    register={() =>
                      register("address", { required: "Address is required" })
                    }
                  />
                  <InputError message={formState.errors.address?.message} />
                </div>
                <div>
                  <InputText
                    labelTitle="Client"
                    register={() => register("clientName", { required: true })}
                  />
                  <InputError message={formState.errors.clientName?.message} />
                </div>
                <div>
                  <label className="mt-2" htmlFor="file-input">
                    Front Elevation Image
                  </label>
                  <InputImage
                    register={() => register("frontElevationImage")}
                  />
                </div>
              </div>
              {defaultValues.conditionSections.map((k, i) => (
                <section key={i} className="mt-2">
                  <ToggleSection
                    label={k.name}
                    register={() =>
                      register(`conditionSections.${i}.isPartOfSurvey`)
                    }
                  >
                    <div className="p-5">
                      <SmartTextArea
                        label={k.name}
                        placeholder={`Description of the ${k.name.toLowerCase()}...`}
                        register={() =>
                          register(`conditionSections.${i}.description`)
                        }
                      />
                      <DefectInput
                        register={() =>
                          register(`conditionSections.${i}.components`)
                        }
                      ></DefectInput>
                      <InputImage
                        register={() =>
                          register(`conditionSections.${i}.images`)
                        }
                      />
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
        <TextEditor
          onInit={(evt, editor) => {
            editorRef.current = editor;
          }}
          initialValue={initialValue}
          contentCss={contentCss}
          onDirty={() => setDirty(true)}
        />
        {dirty && <p>You have unsaved content!</p>}
        <div className="flex justify-end mt-8 mb-8">
          <PrimaryBtn onClick={save} disabled={!dirty}>
            Save
          </PrimaryBtn>
        </div>
      </div>
    </div>
  );
}


