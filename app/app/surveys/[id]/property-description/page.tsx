"use client";

import { FormProvider, SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import {
  PropertyDescription,
  Input,
} from "../../building-survey-reports/BuildingSurveyReportSchema";
import { surveyStore } from "@/app/app/clients/Database";
import { mapToInputType } from "../../building-survey-reports/Utils";
import { PrimaryBtn } from "@/app/app/components/Buttons";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DynamicDrawer } from "@/app/app/components/Drawer";
import { Button } from "@/components/ui/button";

function isInputT<T>(input: any): input is Input<T> {
  return input.type !== undefined;
}

interface PropertyDescriptionPageProps {
  params: {
    id: string;
  };
}

const PropertyDescriptionPage = ({
  params: { id },
}: PropertyDescriptionPageProps) => {
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
          drawerId={id + "/property-description"}
          isOpen={isOpen}
          handleClose={handleClose}
          title="Property Description"
          description="Property Description"
          content={
            <PropertyDescriptionForm
              id={id}
              initValues={survey.propertyDescription}
            />
          }
        />
      )}
    </div>
  );
};

interface PropertyDescriptionFormProps {
  id: string;
  initValues: PropertyDescription;
}

const PropertyDescriptionForm = ({
  id,
  initValues,
}: PropertyDescriptionFormProps) => {
  const methods = useForm<PropertyDescription>({ defaultValues: initValues });
  const { register, handleSubmit, control, reset } = methods;
  const router = useRouter();

  useEffect(() => {
    reset(initValues);
  }, [initValues, reset]);

  const onValidSubmit: SubmitHandler<PropertyDescription> = async (data) => {
    await surveyStore.update(id, (currentState) => {
      currentState.propertyDescription = {
        ...currentState.propertyDescription,
        ...data,
        status: {
          status: "complete",
          errors: [],
        },
      };
    });

    router.push(`/app/surveys/${id}`);
  };

  const onInvalidSubmit: SubmitErrorHandler<PropertyDescription> = async (errors) => {
    await surveyStore.update(id, (currentState) => {
      currentState.propertyDescription.status = {
        status: "incomplete",
        errors: Object.values(errors).map((error) => error.message ?? ""),
      };
    });
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onValidSubmit, onInvalidSubmit)}>
        {Object.keys(initValues)
          .map((key) => {
            const propKey = key as keyof Omit<PropertyDescription, "status">;
            const property = initValues[propKey] as Input<any>;

            if (isInputT(property)) {
              const reqName = `${propKey}.value` as const;

              return (
                <div key={key} className="mt-1 mb-1">
                  {mapToInputType(property, reqName, register, control)}
                </div>
              );
            } else {
              return null;
            }
          })}
        <Button variant="default" className="w-full mt-2" type="submit">Save</Button>
      </form>
    </FormProvider>
  );
};

export default PropertyDescriptionPage;
