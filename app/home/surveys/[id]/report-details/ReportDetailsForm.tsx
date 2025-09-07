import { DynamicComboBox } from "@/app/home/components/Input";
import InputDate from "@/app/home/components/Input/InputDate";
import Input from "@/app/home/components/Input/InputText";
import TextAreaInput from "@/app/home/components/Input/TextAreaInput";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { reportDetailsSchema, ReportDetailsInput } from "../../schemas/reportDetails";
import { FormStatus, ReportDetails } from "../../building-survey-reports/BuildingSurveyReportSchema";
import { surveyStore } from "@/app/home/clients/Database";
import { memo } from "react";
import { useRouter } from "next/navigation";
import { RhfDropZoneInputImage } from "@/app/home/components/InputImage/RhfDropZoneInputImage";
import { useDynamicDrawer } from "@/app/home/components/Drawer";
import AddressInput from "@/app/home/components/Input/AddressInput";
import { useAutoSaveFormWithImages } from "@/app/home/hooks/useAutoSaveFormWithImages";
import { LastSavedIndicatorWithUploads } from "@/app/home/components/LastSavedIndicatorWithUploads";
import { DevTool } from "@hookform/devtools";

interface ReportDetailsFormProps {
  surveyId: string;
  reportDetails: ReportDetailsInput;
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

const LevelField = memo(({ control, errors }: any) => (
  <div>
    <DynamicComboBox
      labelTitle="Level"
      data={[
        { label: "Level 2", value: "2" },
        { label: "Level 3", value: "3" },
      ]}
      name="level"
      control={control}
      rules={{ required: true }}
      errors={errors}
    />
  </div>
));
LevelField.displayName = 'LevelField';

const ReportDetailsForm = ({ reportDetails, surveyId }: ReportDetailsFormProps) => {
  const methods = useForm<ReportDetailsInput>({
    resolver: zodResolver(reportDetailsSchema),
    defaultValues: reportDetails,
    mode: 'onChange'
  });
  const {
    register,
    control,
    formState: { errors },
    watch,
    getValues,
    trigger,
  } = methods;
  
  const router = useRouter();
  const drawerContext = useDynamicDrawer();

  const saveData = async (data: ReportDetailsInput, { auto = false } = {}) => {
    if (!surveyId) return;

    console.log("[ReportDetailsForm] Save data", data);

    try {
      await surveyStore.update(surveyId, (survey) => {
        survey.reportDetails = {
          ...data,
        } as ReportDetails;
      });

      if (!auto) {
        // For manual saves, close drawer and navigate
        drawerContext.closeDrawer();
        router.push(`/home/surveys/${surveyId}`);
      }
    } catch (error) {
      console.error("[ReportDetailsForm] Save failed", error);
      throw error; // Re-throw for autosave error handling
    }
  };

  const { saveStatus, isSaving, isUploading, lastSavedAt } = useAutoSaveFormWithImages(
    saveData,
    watch,
    getValues,
    trigger,
    {
      enabled: !!surveyId,
      validateBeforeSave: false, // Allow saving partial/invalid data
      imagePaths: [
        `report-images/${surveyId}/moneyShot/`,
        `report-images/${surveyId}/frontElevationImagesUri/`
      ]
    }
  );

  return (
    <FormProvider {...methods}>
      <div className="space-y-2">
        <LevelField control={control} errors={errors} />
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
              name: 'moneyShot'
            }}
          />
        </div>

        <div>
          <label className="text-sm">General Photos</label>
          <RhfDropZoneInputImage
            path={`report-images/${surveyId}/frontElevationImagesUri/`}
            minFiles={1}
            maxFiles={4}
            features={{
              archive: true,
              metadata: true
            }}
            rhfProps={{
              name: 'frontElevationImagesUri'
            }}
          />
        </div>
        <LastSavedIndicatorWithUploads
          status={saveStatus}
          isUploading={isUploading}
          lastSavedAt={lastSavedAt}
          className="text-sm justify-center"
        />
      </div>
    </FormProvider>
  );
};

export default memo(ReportDetailsForm); 