import { Input } from "@/components/ui/input";
import { UseFormRegisterReturn } from "react-hook-form";

interface InputTextProps {
  labelTitle: string;
  defaultValue?: string;
  register: () => UseFormRegisterReturn<string>
}

function InputText({ labelTitle, defaultValue, register }: InputTextProps) {
  return (
    <Input className="focus:ring-0 focus:border-none" type="text" placeholder={labelTitle} defaultValue={defaultValue} {...register()} />
  );
}

export default InputText;