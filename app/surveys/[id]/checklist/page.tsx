"use client";

import { FormSection } from "@/app/components/FormSection";
import {
  FormProvider,
  SubmitErrorHandler,
  SubmitHandler,
  useForm,
} from "react-hook-form";
import {
  PropertyDescription,
  Checklist,
} from "../../building-survey-reports/BuildingSurveyReportSchema";
import { surveyStore } from "@/app/clients/Database";
import { mapToInputType } from "../../building-survey-reports/Utils";
import { PrimaryBtn } from "@/app/components/Buttons";
import { useRouter } from "next/navigation";
import { DynamicDrawer } from "@/app/components/Drawer";
import { useEffect, useState } from "react";

interface ChecklistPageProps {
  params: {
    id: string;
  };
}

export const ChecklistPage = ({
  params: { id },
}: ChecklistPageProps) => {
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
          drawerId={id + "/checklist"}
          isOpen={isOpen}
          handleClose={handleClose}
          title="Checklist"
          description="Checklist"
          content={
            <ChecklistForm
              id={id}
              initValues={survey.checklist}
            />
          }
        />
      )}
    </div>
  );
};

interface ChecklistFormProps {
  id: string;
  initValues: Checklist;
}

const ChecklistForm = ({ id, initValues }: ChecklistFormProps) => {
  const methods = useForm<Checklist>({ defaultValues: initValues });
  const { register, handleSubmit, control } = methods;
  const router = useRouter();

  // TODO: Need to ensure I don't overwrite the existing data
  // for the property data fields.
  const onValidSubmit: SubmitHandler<Checklist> = (data) => {
    surveyStore.update(id, (currentState) => {
      currentState.checklist = {
        ...currentState.checklist,
        ...data,
        status: {
          status: "complete",
          errors: [],
        },
      };
    });

    router.push(`/surveys/${id}`);
  };

  const onInvalidSubmit: SubmitErrorHandler<PropertyDescription> = (errors) => {
    surveyStore.update(id, (currentState) => {
      currentState.checklist.status = {
        status: "error",
        errors: Object.values(errors).map((error) => error.message ?? ""),
      };
    });
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onValidSubmit, onInvalidSubmit)}>
          {initValues.items.map((checklist, index) => {
            return (
              <div className="mt-4 mb-4" key={index}>
                <div>
                  {mapToInputType(checklist, `items.${index}.value`, register, control)}
                </div>
              </div>
            );
          })}
        <PrimaryBtn type="submit">Save</PrimaryBtn>
      </form>
    </FormProvider>
  );
};

export default ChecklistPage;
