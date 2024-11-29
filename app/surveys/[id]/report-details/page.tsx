"use client";

import { FormSection } from "@/app/components/FormSection";
import { Combobox } from "@/app/components/Input/ComboBox";
import InputDate from "@/app/components/Input/InputDate";
import Input from "@/app/components/Input/InputText";
import TextAreaInput from "@/app/components/Input/TextAreaInput";
import dynamic from "next/dynamic";
import { Form, FormProvider, useForm, useFormContext } from "react-hook-form";
import { BuildingSurveyFormData } from "../../building-survey-reports/BuildingSurveyReportSchema";
import { PrimaryBtn } from "@/app/components/Buttons";

const ImageInput = dynamic(
  () =>
    import("@/app/components/Input/UppyInputImage").then(
      (x) => x.input.rhfImage
    ),
  { ssr: false }
);

const ReportDetails = (initFormValues: BuildingSurveyFormData) => {
  const methods = useForm<BuildingSurveyFormData>({
    defaultValues: initFormValues,
  });

  const { register } = methods;

  const handleSubmit = (data: any): void => {
    console.log("submit", data);
    // Todo Add to some form of state management... maybe dexie?
  };

  return (
    <FormProvider {...methods}>
      <Form onSubmit={handleSubmit}>
          <FormSection title="Report Details" defaultCollapsed={false}>
            <div>
              <Combobox
                labelTitle="Level"
                data={[
                  { label: "Level 2", value: "2" },
                  { label: "Level 3", value: "3" },
                ]}
                controllerProps={{
                  name: "level",
                  rules: { required: true },
                }}
              />
            </div>
            <div>
              <Input
                labelTitle="Address"
                placeholder="123 Main St, London, UK"
                register={() => register("address", { required: true })}
              />
            </div>
            <div>
              <Input
                labelTitle="Client"
                placeholder="Mr John Doe"
                register={() => register("clientName", { required: true })}
              />
            </div>
            <div>
              <InputDate
                labelTitle="Inspection Date"
                controllerProps={{
                  name: "inspectionDate",
                  rules: {
                    required: true,
                    validate: (v) => {
                      const endOfDay = new Date();
                      endOfDay.setHours(23, 59, 59, 999);
                      return (
                        new Date(v) < endOfDay || "Date cannot be in the future"
                      );
                    },
                  },
                }}
              />
            </div>
            <div>
              <Input
                labelTitle="Weather"
                placeholder="Sunny, clear, 20°C"
                register={() => register("weather", { required: true })}
              />
            </div>
            <div>
              <TextAreaInput
                labelTitle="Orientation"
                register={() => register("orientation", { required: true })}
              />
            </div>
            <div>
              <TextAreaInput
                labelTitle="Situation"
                register={() => register("situation", { required: true })}
              />
            </div>
            <div>
              <ImageInput
                labelText="Money Shot"
                rhfProps={{
                  name: "moneyShot",
                  rules: {
                    validate: (v) =>
                      v.length == 1 || "Only one image is required",
                  },
                }}
                minNumberOfFiles={1}
                maxNumberOfFiles={1}
                path={`report-images/${initFormValues.id}/moneyShot/`}
              />
            </div>
            <div>
              <ImageInput
                labelText="Front Elevation Images"
                rhfProps={{
                  name: "frontElevationImagesUri",
                  rules: {
                    validate: (v) =>
                      v.length > 0 ||
                      "At least one elevation image is required",
                  },
                }}
                path={`report-images/${initFormValues.id}/frontElevationImages/`}
              />
            </div>
          </FormSection>
          <PrimaryBtn type="submit">Submit</PrimaryBtn>
      </Form>
    </FormProvider>
  );
};

export default ReportDetails;
