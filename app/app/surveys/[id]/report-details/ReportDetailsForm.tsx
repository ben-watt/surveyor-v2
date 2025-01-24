import { Combobox } from "@/app/app/components/Input/ComboBox";
import InputDate from "@/app/app/components/Input/InputDate";
import Input from "@/app/app/components/Input/InputText";
import TextAreaInput from "@/app/app/components/Input/TextAreaInput";
import { FormProvider, SubmitErrorHandler, useForm } from "react-hook-form";
import { ReportDetails } from "../../building-survey-reports/BuildingSurveyReportSchema";
import { PrimaryBtn } from "@/app/app/components/Buttons";
import { surveyStore } from "@/app/app/clients/Database";
import { memo } from "react";
import { useRouter } from "next/navigation";
import { InputImageComponent } from "@/app/app/components/Input/InputImage";
import { useDynamicDrawer } from "@/app/app/components/Drawer";
import AddressInput from "@/app/app/components/Input/AddressInput";

interface ReportDetailsFormProps {
  surveyId: string;
  reportDetails: ReportDetails;
}

// Memoized input components for better performance
const AddressField = memo(({ control, errors }: any) => (
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
));
AddressField.displayName = 'AddressField';

const LevelField = memo(({ control }: any) => (
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
));
LevelField.displayName = 'LevelField';

const ImageField = memo(({ surveyId, fieldName, label, minFiles = 1, validate }: any) => (
  <div>
    <InputImageComponent.rhfImage
      labelText={label}
      rhfProps={{
        name: fieldName,
        rules: {
          required: true,
          validate,
        },
      }}
      minNumberOfFiles={minFiles}
      path={`report-images/${surveyId}/${fieldName}/`}
    />
  </div>
));
ImageField.displayName = 'ImageField';

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

    drawerContext.closeDrawer();
    router.push(`/app/surveys/${surveyId}`);
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
        <LevelField control={control} />
        <AddressField control={control} errors={errors} />
        
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
                  return new Date(v) < endOfDay || "Date cannot be in the future";
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

        <ImageField 
          surveyId={surveyId}
          fieldName="moneyShot"
          label="Money Shot"
          validate={(v: any) => v.length === 1 || "Only one image is required"}
        />

        <ImageField 
          surveyId={surveyId}
          fieldName="frontElevationImagesUri"
          label="Front Elevation Images"
          validate={(v: any) => v.length > 0 || "One or more images are required"}
        />

        <PrimaryBtn type="submit">Save</PrimaryBtn>
      </form>
    </FormProvider>
  );
};

export default memo(ReportDetailsForm); 