import { Input as ShadInput } from "@/components/ui/input";
import { UseFormRegisterReturn } from "react-hook-form";

interface InputTextProps {
  labelTitle: string;
  type?: string;
  defaultValue?: string | number;
  placeholder?: string;
  register: () => UseFormRegisterReturn<string>
}

function Input({ labelTitle, defaultValue, placeholder, type = "text", register }: InputTextProps) {
  return (
    <>
      <label>
        <span className="text-sm">{labelTitle}</span>
      </label>
      <ShadInput className="focus:ring-0 focus:border-none" type={type} defaultValue={defaultValue} placeholder={placeholder} {...register()} />
    </>
  );
}

export default Input;