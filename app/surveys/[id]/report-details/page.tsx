"use client";

import { FormSection } from "@/app/components/FormSection";
import { Combobox } from "@/app/components/Input/ComboBox";
import InputDate from "@/app/components/Input/InputDate";
import Input from "@/app/components/Input/InputText";
import TextAreaInput from "@/app/components/Input/TextAreaInput";
import { FormProvider, SubmitErrorHandler, useForm } from "react-hook-form";
import { ReportDetails } from "../../building-survey-reports/BuildingSurveyReportSchema";
import { PrimaryBtn } from "@/app/components/Buttons";
import { surveyStore } from "@/app/clients/Database";
import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Survey } from "@/app/clients/Dexie";
import { InputImageComponent } from "@/app/components/Input/InputImage";
import { useDynamicDrawer } from "@/app/components/Drawer";

interface ReportDetailsFormPageProps {
  params: {
    id: string;
  },
}

export const ReportDetailFormPage = ({ params: { id } }: ReportDetailsFormPageProps) => {
  const [isHydrated, survey] = surveyStore.useGet(id); 

  return (
    <div>
      {!isHydrated && <div>Loading...</div>}
      {isHydrated && survey && <ReportDetailsForm survey={survey} />}
    </div>
  );
};

interface ReportDetailsFormProps {
  survey: Survey;
}

const ReportDetailsForm = ({ survey }: ReportDetailsFormProps) => {
  const methods = useForm<ReportDetails>({ defaultValues: survey.content.reportDetails });
  const { register, handleSubmit, control } = methods;
  const router = useRouter();
  const drawerContext = useDynamicDrawer();

  const onValidHandler = (data: any): void => {
    if(!survey) return;

    surveyStore.update(survey.id, survey => ({
      ...survey,
      id: survey.id,
      content: {
        ...survey.content,
        reportDetails: {
          ...data,
          status: { status: "complete", errors: [] },
        },
      }
    }));

    router.push(`/surveys/${survey.id}`);
    drawerContext.closeDrawer();
  };

  const onInvalidHandler: SubmitErrorHandler<ReportDetails> = (errors) => {
    if(!survey) return;

    surveyStore.update(survey.id, survey => ({
      ...survey,
      id: survey.id,
      content: {
        ...survey.content,
        reportDetails: {
          ...survey.content.reportDetails,
          status: {
            status: "error",
            errors: Object.values(errors).map((e) => e.message ?? ""),
          },
        },
      },
    }));
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onValidHandler, onInvalidHandler)}>
          <div>
            <Combobox
              labelTitle="Level"
              data={[
                { label: "Level 2", value: "2" },
                { label: "Level 3", value: "3" },
              ]}
              name="level"
              control={control}
              rules={{ required: true }}
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
            <InputImageComponent.rhfImage
              labelText="Money Shot"
              rhfProps={{
                name: "moneyShot",
                rules: {
                  required: true,
                  validate: (v) => v.length === 1 || "Only one image is required",
                },
              }}
              minNumberOfFiles={1}
              path={`report-images/${survey.id}/moneyShot/`}
            />
          </div>
          <div>
            <InputImageComponent.rhfImage
              labelText="Front Elevation Images"
              rhfProps={{
                name: "frontElevationImagesUri",
                rules: {
                  required: true,
                  validate: (v) => v.length > 0 || "One or more images are required",
                },
              }}
              minNumberOfFiles={1}
              path={`report-images/${survey.id}/frontElevationImages/`}
            />
          </div>
        <PrimaryBtn type="submit">Save</PrimaryBtn>
      </form>
    </FormProvider>
  );
};

export default ReportDetailFormPage;