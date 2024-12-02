"use client";

import { FormSection } from "@/app/components/FormSection";
import { FormProvider, useForm } from "react-hook-form";
import {
  PropertyDescription,
  Input,
} from "../../building-survey-reports/BuildingSurveyReportSchema";
import { surveyStore } from "@/app/clients/Database";
import { mapToInputType } from "../../building-survey-reports/Utils";

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
          initValues={survey.content.propertyDescription}
        />
      )}
    </div>
  );
};

interface PropertyDescriptionFormProps {
  initValues: PropertyDescription;
}

const PropertyDescriptionForm = ({
  initValues,
}: PropertyDescriptionFormProps) => {
  const methods = useForm<PropertyDescription>();
  const { register } = methods;

  return (
    <FormProvider {...methods}>
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
            return (<div key={key}></div>);
            }
        })}
        </FormSection>
    </FormProvider>
  );
};

export default PropertyDescriptionPage;
