import { Combobox } from "@/app/home/components/Input/ComboBox";
import InputDate from "@/app/home/components/Input/InputDate";
import Input from "@/app/home/components/Input/InputText";
import TextAreaInput from "@/app/home/components/Input/TextAreaInput";
import { FormProvider, SubmitErrorHandler, useForm } from "react-hook-form";
import { FormStatus, ReportDetails } from "../../building-survey-reports/BuildingSurveyReportSchema";
import { surveyStore } from "@/app/home/clients/Database";
import { memo } from "react";
import { useRouter } from "next/navigation";
import { RhfDropZoneInputImage } from "@/app/home/components/InputImage/RhfDropZoneInputImage";
import { useDynamicDrawer } from "@/app/home/components/Drawer";
import AddressInput from "@/app/home/components/Input/AddressInput";
import SaveButtonWithUploadStatus from "@/app/home/components/SaveButtonWithUploadStatus";

interface ReportDetailsFormProps {
  surveyId: string;
  reportDetails: ReportDetails;
}

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

const ReportDetailsForm = ({ reportDetails, surveyId }: ReportDetailsFormProps) => {
  const methods = useForm<ReportDetails>({
    defaultValues: reportDetails,
  });
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = methods;
  const router = useRouter();
  const drawerContext = useDynamicDrawer();

  const onValidHandler = async (data: any): Promise<void> => {
    if (!surveyId) return;

    console.log("[ReportDetailsForm] onValidHandler", data);

    await surveyStore.update(surveyId, (survey) => {
      survey.reportDetails = {
        ...data,
        status: { status: "complete", errors: [] },
      };
    });

    drawerContext.closeDrawer();
    router.push(`/home/surveys/${surveyId}`);
  };

  const onInvalidHandler: SubmitErrorHandler<ReportDetails> = async (errors) => {
    if (!surveyId) return;

    await surveyStore.update(surveyId, (survey) => {
      survey.reportDetails.status = {
        status: FormStatus.Error,
        errors: Object.values(errors).map((e) => e.message ?? ""),
      };
    });
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onValidHandler, onInvalidHandler)} className="space-y-2">
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
          <Input
            labelTitle="Reference"
            placeholder="24.123"
            register={() => register("reference", { required: true })}
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
          <InputDate
            labelTitle="Report Date"
            controllerProps={{
              name: "reportDate",
              rules: {
                required: true,
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
          <label className="text-sm">Cover Photo</label>
          <RhfDropZoneInputImage
            path={`report-images/${surveyId}/moneyShot/`}
            minFiles={1}
            maxFiles={1}
            features={{
              archive: false,
              metadata: false
            }}
            rhfProps={{
              name: 'moneyShot',
              rules: { required: "At least one image is required" }
            }}
          />
        </div>

        <div>
          <label className="text-sm">Front Elevation</label>
          <RhfDropZoneInputImage
            path={`report-images/${surveyId}/frontElevationImagesUri/`}
            minFiles={1}
            maxFiles={4}
            features={{
              archive: true,
              metadata: true
            }}
            rhfProps={{
              name: 'frontElevationImagesUri',
              rules: { validate: (v) => v.length >= 4 || "At least four images are required" }
            }}
          />
        </div>
        <SaveButtonWithUploadStatus 
          isSubmitting={isSubmitting}
          paths={[
            `report-images/${surveyId}/moneyShot/`,
            `report-images/${surveyId}/frontElevationImagesUri/`
          ]}
        />
      </form>
    </FormProvider>
  );
};

export default memo(ReportDetailsForm); 