import { FieldValues, Path, UseFormRegister } from "react-hook-form";
import { Input as InputT } from "./BuildingSurveyReportSchema";
import TextAreaInput from "@/app/components/Input/TextAreaInput";
import { InputCheckbox } from "@/app/components/Input/InputCheckbox";
import { Combobox } from "@/app/components/Input/ComboBox";
import Input from "@/app/components/Input/InputText";

export function mapToInputType<T, K extends FieldValues>(
  input: InputT<T>,
  registerName: Path<K>,
  register: UseFormRegister<K>
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
              controllerProps={{
                name: registerName,
                rules: { required: input.required },
              }}
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
