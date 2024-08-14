import { Input as ShadInput } from "@/components/ui/input";
import { UseFormRegisterReturn } from "react-hook-form";
import { Label } from "./Label";

interface InputTextProps {
  labelTitle?: string;
  type?: string;
  defaultValue?: string | number;
  placeholder?: string;
  register: () => UseFormRegisterReturn<string>;
}

function Input({
  labelTitle,
  defaultValue,
  placeholder,
  type = "text",
  register,
}: InputTextProps) {
  return (
    <>
      {labelTitle && <Label text={labelTitle} /> }
      <ShadInput
        className="focus:ring-0 focus:border-none"
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        {...register()}
      />
    </>
  );
}

export default Input;
