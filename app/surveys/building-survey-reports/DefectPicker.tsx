import React, {  } from "react";

import {
  Defect,
} from "./BuildingSurveyReportSchema";

import {
  Controller,
  useFormContext,
} from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@aws-amplify/ui-react";
import TextAreaInput from "@/app/components/Input/TextAreaInput";

interface DefectCheckboxProps {
    key: string;
    defect: Defect;
    name: string;
  }
  
  export const DefectCheckbox = ({ defect, name }: DefectCheckboxProps) => {
    const typedName =
      name as `sections.0.elementSections.0.materialComponents.0.defects.0`;
    const { register, control, watch } = useFormContext();
  
    const isChecked = watch(`${typedName}.isChecked`);
  
    return (
      <Controller
        name={`${typedName}.isChecked` as const}
        control={control}
        render={({ field }) => (
          <div>
            <div className="flex items-center gap-3">
              <Checkbox
                id={field.name}
                name={field.name}
                onCheckedChange={field.onChange}
                ref={field.ref}
                checked={field.value}
                onBlur={field.onBlur}
              />
              <Label htmlFor={field.name} className="text-sm cursor-pointer">
                {defect.name}
              </Label>
            </div>
            {isChecked && (
              <div className="p-2">
                <input
                  type="hidden"
                  {...register(`${typedName}.name` as const, {
                    shouldUnregister: true,
                  })}
                  value={defect.name}
                />
                <TextAreaInput
                  defaultValue={defect.description}
                  placeholder={"Defect text..."}
                  register={() =>
                    register(`${typedName}.description` as const, {
                      required: true,
                      shouldUnregister: true,
                    })
                  }
                />
              </div>
            )}
          </div>
        )}
      ></Controller>
    );
  };
  