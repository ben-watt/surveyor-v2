import { Combobox } from "@/app/app/components/Input/ComboBox";
import InputDate from "@/app/app/components/Input/InputDate";
import Input from "@/app/app/components/Input/InputText";
import TextAreaInput from "@/app/app/components/Input/TextAreaInput";
import { FormProvider, SubmitErrorHandler, useForm } from "react-hook-form";
import { FormStatus, ReportDetails } from "../../building-survey-reports/BuildingSurveyReportSchema";
import { surveyStore } from "@/app/app/clients/Database";
import { memo } from "react";
import { useRouter } from "next/navigation";
import { RhfInputImage } from "@/app/app/components/InputImage";
import { useDynamicDrawer } from "@/app/app/components/Drawer";
import AddressInput from "@/app/app/components/Input/AddressInput";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useImageUploadStatus } from "@/app/app/components/InputImage/useImageUploadStatus";

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

// Isolated component for save button and upload status
const SaveButtonWithUploadStatus = memo(({ 
  surveyId, 
  isSubmitting, 
  paths,
}: { 
  surveyId: string; 
  isSubmitting: boolean;
  paths: string[];
}) => {

  // Use the hook to track upload status
  const { isUploading, checkUploadStatus } = useImageUploadStatus(paths);

  return (
    <>
      {isUploading && (
        <Alert variant="default" className="mb-4 bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-700">
            Images are currently uploading. Please wait until all uploads complete before saving.
          </AlertDescription>
        </Alert>
      )}
      
      <Button 
        variant="default" 
        className="w-full" 
        type="submit" 
        disabled={isSubmitting || isUploading}
      >
        {isUploading ? 'Images Uploading...' : 'Save'}
      </Button>
    </>
  );
});

SaveButtonWithUploadStatus.displayName = 'SaveButtonWithUploadStatus';

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

    await surveyStore.update(surveyId, (survey) => {
      survey.reportDetails = {
        ...data,
        status: { status: "complete", errors: [] },
      };
    });

    drawerContext.closeDrawer();
    router.push(`/app/surveys/${surveyId}`);
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

        <div>
          <RhfInputImage
            labelText={"Cover Photo"}
            rhfProps={{
              name: "moneyShot",
              rules: {
                required: true,
                validate: (v: any) => v.length === 1 || "Only one image is required",
              },
            }}
            minNumberOfFiles={1}
            maxNumberOfFiles={1}
            path={`report-images/${surveyId}/moneyShot/`}
          />
        </div>

        <div className="image-w-50">
          <RhfInputImage
            labelText={"Front Elevation"}
            rhfProps={{
              name: "frontElevationImagesUri",
              rules: {
                required: true,
                validate: (v: any) => v.length > 0 || "One or more images are required",
              },
            }}
            minNumberOfFiles={1}
            path={`report-images/${surveyId}/frontElevationImagesUri/`}
          />
        </div>

        <SaveButtonWithUploadStatus 
          surveyId={surveyId}
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