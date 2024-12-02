"use client";

import { FormSection } from "@/app/components/FormSection";
import { FormProvider, useForm } from "react-hook-form";
import {
  PropertyDescription,
  Input,
} from "../../building-survey-reports/BuildingSurveyReportSchema";
import { surveyStore } from "@/app/clients/Database";
import { mapToInputType } from "../../building-survey-reports/Utils";
import { PrimaryBtn } from "@/app/components/Buttons";
import { Router } from "lucide-react";
import { useRouter } from "next/navigation";

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

  return (
    <div>
      {!isHydrated && <div>Loading...</div>}
      {isHydrated && survey && (
        <PropertyDescriptionForm
          id={id}
          initValues={survey.content.propertyDescription}
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
  const methods = useForm<PropertyDescription>();
  const { register, handleSubmit } = methods;
  const router = useRouter();

  const onValidSubmit = (data: PropertyDescription) => {
    surveyStore.update(id, (currentState) => ({
      ...currentState,
      content: {
        ...currentState.content,
        propertyDescription: {
          ...data,
          status: {
            status: "complete",
            errors: [],
          },
        },
      },
    }));

    router.push(`/surveys/${id}`);
  };

  const onInvalidSubmit = (errors: any) => {
    surveyStore.update(id, (currentState) => ({
      ...currentState,
      content: {
        ...currentState.content,
        propertyDescription: {
          ...currentState.content.propertyDescription,
          status: {
            status: "incomplete",
            errors: errors,
          },
        },
      },
    }));
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onValidSubmit, onInvalidSubmit)}>
        <FormSection title="Property Description">
          {Object.keys(initValues).map((key) => {
            const propKey = key as keyof Omit<PropertyDescription, "status">;
            const property = initValues[propKey] as Input<any>;
            if (isInputT(property)) {
              const reqName = `${propKey}.value` as const;

              return (
                <div key={key} className="mt-1 mb-1">
                  {mapToInputType(property, reqName, register)}
                </div>
              );
            } else {
              return null;
            }
          })}
        </FormSection>
        <PrimaryBtn type="submit">Save</PrimaryBtn>
      </form>
    </FormProvider>
  );
};

export default PropertyDescriptionPage;
