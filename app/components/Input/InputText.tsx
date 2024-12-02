import { Input as ShadInput } from "@/components/ui/input";
import {
  FieldErrors,
  FieldValues,
  UseFormRegisterReturn,
} from "react-hook-form";
import { Label } from "./Label";
import { ErrorMessage } from "@hookform/error-message";
import InputError from "../InputError";

interface InputTextProps {
  labelTitle?: string;
  type?: string;
  defaultValue?: string | number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  register?: () => UseFormRegisterReturn<string>;
  errors?: FieldErrors<FieldValues>;
}

function Input({
  labelTitle,
  defaultValue,
  placeholder,
  type = "text",
  className = "",
  disabled = false,
  register,
  errors,
}: InputTextProps) {
  let reg = null;
  if (register) {
      reg = register();
  }

  return (
    <div>
      {labelTitle && <Label text={labelTitle} />}
      <ShadInput
        className="focus:ring-0 focus:border-none h-auto"
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled}
        {...reg}
      />
      {reg && (
        <ErrorMessage
          errors={errors}
          name={reg.name}
          render={({ message }) => InputError({ message })}
        />
      )}
    </div>
  );
}

export default Input;
