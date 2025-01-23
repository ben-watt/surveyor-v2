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
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { InputImageComponent } from "@/app/components/Input/InputImage";
import { DynamicDrawer, useDynamicDrawer } from "@/app/components/Drawer";
import AddressInput from "@/app/components/Input/AddressInput";

interface ReportDetailsFormPageProps {
  params: {
    id: string;
  };
}

export const ReportDetailFormPage = ({
  params: { id },
}: ReportDetailsFormPageProps) => {
  const [isHydrated, survey] = surveyStore.useGet(id);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleClose = () => {
    setIsOpen(false);
    router.back();
  };

  useEffect(() => {
    if (isHydrated) {
      setIsOpen(true);
    }
  }, [isHydrated]);

  return (
    <div>
      {!isHydrated && <div>Loading...</div>}
      {isHydrated && survey && (
        <DynamicDrawer
          drawerId={id + "/report-details"}
          isOpen={isOpen}
          handleClose={handleClose}
          title="Report Details"
          description="Report Details"
          content={<ReportDetailsForm surveyId={id} reportDetails={survey.reportDetails} />}
        />
      )}
    </div>
  );
};

interface ReportDetailsFormProps {
  surveyId: string;
  reportDetails: ReportDetails;
}

const ReportDetailsForm = ({ reportDetails, surveyId }: ReportDetailsFormProps) => {
  const methods = useForm<ReportDetails>({
    defaultValues: reportDetails,
  });
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = methods;
  const router = useRouter();
  const drawerContext = useDynamicDrawer();

  const onValidHandler = (data: any): void => {
    if (!surveyId) return;

    surveyStore.update(surveyId, (survey) => {
      survey.reportDetails = {
        ...data,
        status: { status: "complete", errors: [] },
      };
    });

    router.push(`/surveys/${surveyId}`);
    drawerContext.closeDrawer();
  };

  const onInvalidHandler: SubmitErrorHandler<ReportDetails> = (errors) => {
    if (!surveyId) return;

    surveyStore.update(surveyId, (survey) => {
      survey.reportDetails.status = {
        status: "error",
        errors: Object.values(errors).map((e) => e.message ?? ""),
      };
    });
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
          <AddressInput
            labelTitle="Address"
            placeholder="123 Main St, London, UK"
            name="address"
            control={control}
            rules={{ required: true }}
            errors={errors}
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
            path={`report-images/${surveyId}/moneyShot/`}
          />
        </div>
        <div>
          <InputImageComponent.rhfImage
            labelText="Front Elevation Images"
            rhfProps={{
              name: "frontElevationImagesUri",
              rules: {
                required: true,
                validate: (v) =>
                  v.length > 0 || "One or more images are required",
              },
            }}
            minNumberOfFiles={1}
            path={`report-images/${surveyId}/frontElevationImages/`}
          />
        </div>
        <PrimaryBtn type="submit">Save</PrimaryBtn>
      </form>
    </FormProvider>
  );
};

export default ReportDetailFormPage;
