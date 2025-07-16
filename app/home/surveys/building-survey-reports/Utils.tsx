import { Control, FieldValues, Path, UseFormRegister, FieldErrors } from "react-hook-form";
import { Input as InputT } from "./BuildingSurveyReportSchema";
import TextAreaInput from "@/app/home/components/Input/TextAreaInput";
import { InputCheckbox } from "@/app/home/components/Input/InputCheckbox";
import { Combobox } from "@/app/home/components/Input/ComboBox";
import Input from "@/app/home/components/Input/InputText";

export function mapToInputType<T, K extends FieldValues>(
  input: InputT<T>,
  registerName: Path<K>,
  register: UseFormRegister<K>,
  control: Control<K>,
  errors?: FieldErrors<K>
) {
  try {
    console.log("[mapToInputType]", input, registerName, register);

    if (!register) {
      throw new Error("Register function is null or undefined");
    }

    switch (input.type) {
      case "text":
        return (
          <Input
            labelTitle={input.label}
            placeholder={input.placeholder}
            register={() =>
              register(registerName, { required: input.required })
            }
            errors={errors}
          />
        );
      case "number":
        return (
          <Input
            type="number"
            labelTitle={input.label}
            placeholder={input.placeholder}
            register={() =>
              register(registerName, { required: input.required })
            }
            errors={errors}
          />
        );
      case "textarea":
        return (
          <TextAreaInput
            labelTitle={input.label}
            placeholder={input.placeholder}
            register={() =>
              register(registerName, { required: input.required })
            }
            errors={errors}
          />
        );
      case "checkbox":
        return (
          <InputCheckbox
            labelText={input.label}
            rhfProps={{
              name: registerName,
              rules: { required: input.required },
            }}
          />
        );
      case "always-true-checkbox":
        return (
          <InputCheckbox
            labelText={input.label}
            rhfProps={{
              name: registerName,
              rules: {
                required: input.required,
                validate: (value) => value === true,
              },
            }}
          />
        );
      case "select":
        return (
          <>
            <label htmlFor={input.label} className="text-sm">
              {input.label}
            </label>
            <Combobox
              data={[
                { label: "Freehold", value: "Freehold" },
                { label: "Leasehold", value: "Leasehold" },
                { label: "Commonhold", value: "Commonhold" },
                { label: "Other", value: "Other" },
                { label: "Unknown", value: "Unknown" },
              ]}
              name={registerName}
              rules={{ required: input.required }}
              control={control}
            />
          </>
        );
      default:
        return (
          <Input
            labelTitle={input.label}
            register={() =>
              register(registerName, {
                required: input.required,
              })
            }
          />
        );
    }
  } catch (err) {
    console.error("[mapToInputType] Error:", err, {
      input,
      registerName,
      register,
    });
  }
}
