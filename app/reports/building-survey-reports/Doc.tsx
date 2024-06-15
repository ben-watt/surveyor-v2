import React, {  } from "react";
import { v4 as uuidv4 } from "uuid";

import { BuildingSurveyFormData, ElementSection } from "./BuildingSurveyReportData";

import { useForm, FormProvider } from "react-hook-form";
import { ComponentInput, ToggleSection } from "./Defects";
import { PrimaryBtn } from "@/app/components/Buttons";
import InputText from "../../components/Input/InputText";
import InputImage from "../../components/Input/ImageInput";
import SmartTextArea from "../../components/Input/SmartTextArea";
import InputError from "@/app/components/InputError";
import reportClient from "@/app/clients/ReportsClient";
import { successToast } from "@/app/components/Toasts";
import { useRouter } from 'next/navigation'

export default function Report(props: any) {

  const createDefaultElementSection = (name: string) : ElementSection => ({
    name,
    isPartOfSurvey: false,
    description: "",
    components: [],
    images: [],
  });

  const elementSections = [
    "Foundations and Substructure",
    "Roof Coverings",
    "Chimneys",
    "Rainwater Disposal System",
    "Sofits and Fascias",
    "Main Walls",
    "Damp Proof Courses",
    "Windows and Doors",
    "Roof Structure",
    "Ceilings",
    "Walls and Partitions",
    "Floors",
    "Internal Joinery",
    "Sanitaryware & Kitchen",
    "Fireplaces",
    "Electrical Installation",
    "Gas/Oil Installations",
    "Cold Water Supply",
    "Hot Water Supply / Heating Installations",
    "Surface water soil & drainage",
    "Boundaries, Fencing, Drives, Lawn, etc",
  ].map(createDefaultElementSection);

  const defaultValues: BuildingSurveyFormData = {
    id: uuidv4(),
    reportDate: new Date(),
    address: "",
    clientName: "",
    frontElevationImage: [],
    elementSections: elementSections,
  };

  const methods = useForm<BuildingSurveyFormData>({ defaultValues });
  const { register, handleSubmit, watch, formState } = methods;
  const router = useRouter();

  const onSubmit = async () => {
    try {
      let form = watch();
      let _ = await reportClient.models.Reports.create({
        id: form.id,
        content: JSON.stringify(form),
      });

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
                    register={() => register("frontElevationImage")}
                  />
                </div>
              </div>
              {defaultValues.elementSections.map((k, i) => (
                <section key={i} className="mt-2">
                  <ToggleSection
                    label={k.name}
                    register={() =>
                      register(`elementSections.${i}.isPartOfSurvey`)
                    }
                  >
                    <div className="flex-row space-y-2">
                      <SmartTextArea
                        label={k.name}
                        placeholder={`Description of the ${k.name.toLowerCase()}...`}
                        register={() =>
                          register(`elementSections.${i}.description`)
                        }
                      />
                      <InputImage
                        register={() =>
                          register(`elementSections.${i}.images`)
                        }
                      />
                      <ComponentInput
                        register={() =>
                          register(`elementSections.${i}.components`)
                        }
                      ></ComponentInput>
                    </div>
                  </ToggleSection>
                </section>
              ))}
            </div>
            <div className="mt-8 mb-8">
              <PrimaryBtn className="w-full flex justify-center" type="submit">Save</PrimaryBtn>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}
