import React from "react";
import { v4 as uuidv4 } from "uuid";

import {
  BuildingSurveyFormData,
  ElementSection,
} from "./BuildingSurveyReportSchema";

import { useForm, FormProvider, Controller } from "react-hook-form";
import { ToggleSection } from "./Defects";
import { PrimaryBtn } from "@/app/components/Buttons";
import InputText from "../../components/Input/InputText";
import InputImage from "../../components/Input/ImageInput";
import SmartTextArea from "../../components/Input/SmartTextArea";
import InputError from "@/app/components/InputError";
import reportClient from "@/app/clients/ReportsClient";
import { Combobox } from "../../components/Input/ComboBox";
import { successToast } from "@/app/components/Toasts";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Report(props: any) {
  const createDefaultElementSection = (name: string): ElementSection => ({
    name,
    isPartOfSurvey: false,
    ragStatus: "N/A",
    description: "",
    components: [],
    images: [],
  });

  const elementSections = [
    // External Condition
    "Foundations and Substructure",
    "Roof Coverings",
    "Chimneys",
    "Rainwater Disposal System",
    "Sofits and Fascias",
    "Main Walls",
    "Windows and Doors",
    //"Damp Proof Courses",
    // Internal Condition
    "Roof Structure",
    "Ceilings",
    "Walls and Partitions",
    "Floors",
    "Internal Joinery",
    "Sanitaryware & Kitchen",
    "Fireplaces",
    // Services
    "Electrical Installation",
    "Gas Installations",
    "Cold Water Supply",
    "Hot Water Supply / Heating Installations",
    "Surface water & Soil drainage",
    // Grounds
    "Boundaries, Fencing, Drives, Lawn, etc",
  ].map(createDefaultElementSection);

  const defaultValues: BuildingSurveyFormData = {
    id: uuidv4(),
    reportDate: new Date(),
    address: "",
    clientName: "",
    frontElevationImagesUri: [],
    sections: [
      {
        name: "External Condition of Property",
        elementSections: elementSections.slice(0, 6),
      },
      {
        name: "Internal Condition of Property",
        elementSections: elementSections.slice(7, 13),
      },
      { name: "Services", elementSections: elementSections.slice(14, 18) },
      { name: "Grounds", elementSections: elementSections.slice(19, 20) },
    ],
  };

  console.log("reportId", defaultValues.id);

  const methods = useForm<BuildingSurveyFormData>({ defaultValues });
  const { register, handleSubmit, watch, formState, control } = methods;
  const router = useRouter();

  const onSubmit = async () => {
    try {
      let form = watch();
      let _ = await reportClient.models.Reports.create({
        id: form.id,
        content: JSON.stringify(form),
      });

      console.debug(form);
      successToast("Saved");
      router.push("/reports");
    } catch (error) {
      console.error(error);
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
                    register={() => register("frontElevationImagesUri")}
                    path={`report-images/${defaultValues.id}/frontElevationImages/`}
                  />
                </div>
              </div>
              {defaultValues.sections.map((section, sectionIndex) =>
                section.elementSections.map((k, i) => (
                  <section key={`${sectionIndex}.${i}`} className="mt-2">
                    <ToggleSection
                      label={k.name}
                      register={() =>
                        register(
                          `sections.${sectionIndex}.elementSections.${i}.isPartOfSurvey`
                        )
                      }
                    >
                      <div className="flex-row space-y-2">
                        <Controller
                          name={`sections.${sectionIndex}.elementSections.${i}.ragStatus`}
                          render={({ field }) => (
                            <Select
                              {...field}
                              onValueChange={field.onChange}
                              defaultValue={k.ragStatus}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select a RAG Status..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  <SelectLabel>RAG Status</SelectLabel>
                                  <SelectItem value="Red">
                                    <span className="text-red-600">Red</span>
                                  </SelectItem>
                                  <SelectItem value="Amber">
                                    <span className="text-amber-600">
                                      Amber
                                    </span>
                                  </SelectItem>
                                  <SelectItem value="Green">
                                    <span className="text-green-600">
                                      Green
                                    </span>
                                  </SelectItem>
                                  <SelectItem value="N/A">N/A</SelectItem>
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <SmartTextArea
                          label={k.name}
                          placeholder={`Description of the ${k.name.toLowerCase()}...`}
                          register={() =>
                            register(
                              `sections.${sectionIndex}.elementSections.${i}.description`
                            )
                          }
                        />
                        <InputImage
                          register={() =>
                            register(
                              `sections.${sectionIndex}.elementSections.${i}.images`
                            )
                          }
                          path={`report-images/${defaultValues.id}/elementSections/${i}/images`}
                        />
                      </div>  
                    </ToggleSection>
                  </section>
                ))
              )}
            </div>
            <div className="mt-8 mb-8">
              <PrimaryBtn className="w-full flex justify-center" type="submit">
                Save
              </PrimaryBtn>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}
