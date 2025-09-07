import { DynamicComboBox } from "@/app/home/components/Input";
import Input from "@/app/home/components/Input/InputText";
import TextAreaInput from "@/app/home/components/Input/TextAreaInput";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { surveyStore } from "@/app/home/clients/Database";
import { memo } from "react";
import { useRouter } from "next/navigation";
import { useDynamicDrawer } from "@/app/home/components/Drawer";
import { useAutoSaveForm } from "@/app/home/hooks/useAutoSaveForm";
import { LastSavedIndicator } from "@/app/home/components/LastSavedIndicator";
import { 
  propertyDescriptionSchema, 
  PropertyDescriptionInput
} from "../../schemas/propertyDescription";
import { updatePropertyDescriptionStatus } from "../../schemas";

interface PropertyDescriptionFormProps {
  surveyId: string;
  propertyDescription: PropertyDescriptionInput;
}

const TenureField = memo(({ control, errors }: any) => (
  <div>
    <DynamicComboBox
      labelTitle="Tenure"
      data={[
        { label: "Freehold", value: "Freehold" },
        { label: "Leasehold", value: "Leasehold" },
        { label: "Commonhold", value: "Commonhold" },
        { label: "Unknown", value: "Unknown" },
      ]}
      name="tenure"
      control={control}
      errors={errors}
    />
  </div>
));
TenureField.displayName = 'TenureField';

const EnergyRatingField = memo(({ control, errors }: any) => (
  <div>
    <DynamicComboBox
      labelTitle="Energy Rating"
      data={[
        { label: "A", value: "A" },
        { label: "B", value: "B" },
        { label: "C", value: "C" },
        { label: "D", value: "D" },
        { label: "E", value: "E" },
        { label: "F", value: "F" },
        { label: "G", value: "G" },
        { label: "Unknown", value: "Unknown" },
      ]}
      name="energyRating"
      control={control}
      errors={errors}
    />
  </div>
));
EnergyRatingField.displayName = 'EnergyRatingField';

const PropertyDescriptionForm = ({ propertyDescription, surveyId }: PropertyDescriptionFormProps) => {
  const methods = useForm<PropertyDescriptionInput>({
    resolver: zodResolver(propertyDescriptionSchema),
    defaultValues: propertyDescription,
    mode: 'onChange' // Enable validation on change
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

  const saveData = async (data: PropertyDescriptionInput, { auto = false } = {}) => {
    if (!surveyId) return;

    console.log("[PropertyDescriptionForm] Save data", data);

    try {
      // Update form metadata with current validation status
      const updatedMeta = updatePropertyDescriptionStatus(data);
      const dataWithMeta = {
        ...data,
        _meta: updatedMeta
      };

      await surveyStore.update(surveyId, (survey) => {
        survey.propertyDescription = dataWithMeta;
      });

      if (!auto) {
        // For manual saves, close drawer and navigate
        drawerContext.closeDrawer();
        router.push(`/home/surveys/${surveyId}`);
      }
    } catch (error) {
      console.error("[PropertyDescriptionForm] Save failed", error);
      throw error; // Re-throw for autosave error handling
    }
  };

  const { saveStatus, isSaving, lastSavedAt } = useAutoSaveForm(
    saveData,
    watch,
    getValues,
    trigger,
    {
      enabled: !!surveyId,
      validateBeforeSave: false, // Allow saving partial/invalid data
    }
  );

  return (
    <FormProvider {...methods}>
      <div className="space-y-2">
        <div>
          <Input
            labelTitle="Property Type"
            placeholder="Detached, Semi-detached, Terraced, Flat, Bungalow, Maisonette, Other"
            register={() => register("propertyType")}
          />
        </div>

        <div>
          <TextAreaInput
            labelTitle="Construction Details"
            placeholder="Brick, Stone, Timber, Concrete, Steel, Glass, Other"
            register={() => register("constructionDetails")}
          />
        </div>
        
        <div>
          <Input
            labelTitle="Year of Construction"
            placeholder="presumed 1990s - side extension"
            register={() => register("yearOfConstruction")}
          />
        </div>

        <div>
          <Input
            labelTitle="Year of Extensions"
            placeholder="2012"
            register={() => register("yearOfExtensions")}
          />
        </div>

        <div>
          <Input
            labelTitle="Year of Conversions"
            placeholder="2004"
            register={() => register("yearOfConversions")}
          />
        </div>

        <div>
          <TextAreaInput
            labelTitle="Grounds"
            placeholder="Garden, Yard, Paved, Lawn, Other"
            register={() => register("grounds")}
          />
        </div>

        <div>
          <Input
            labelTitle="Services"
            placeholder="Electricity, Gas, Water, Drainage, Telephone, Broadband, Other"
            register={() => register("services")}
          />
        </div>

        <div>
          <Input
            labelTitle="Other Services"
            placeholder="Cable TV, Satellite TV, Solar Panels, Other"
            register={() => register("otherServices")}
          />
        </div>

        <EnergyRatingField control={control} errors={errors} />

        <div>
          <Input
            labelTitle="Number of Bedrooms"
            placeholder="Number of Bedrooms"
            type="number"
            register={() => register("numberOfBedrooms", { 
              valueAsNumber: true
            })}
          />
        </div>

        <div>
          <Input
            labelTitle="Number of Bathrooms"
            placeholder="Number of Bathrooms"
            type="number"
            register={() => register("numberOfBathrooms", { 
              valueAsNumber: true
            })}
          />
        </div>

        <TenureField control={control} errors={errors} />
        
        <LastSavedIndicator
          status={saveStatus}
          lastSavedAt={lastSavedAt}
          className="text-sm justify-center"
        />
      </div>
    </FormProvider>
  );
};

export default memo(PropertyDescriptionForm);