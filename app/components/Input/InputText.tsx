import { Input as ShadInput } from "@/components/ui/input";
import { UseFormRegisterReturn } from "react-hook-form";
import { Label } from "./Label";

interface InputTextProps {
  labelTitle?: string;
  type?: string;
  defaultValue?: string | number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  register?: () => UseFormRegisterReturn<string>;
}

function Input({
  labelTitle,
  defaultValue,
  placeholder,
  type = "text",
  className = "",
  disabled = false,
  register,
}: InputTextProps) {
  const reg = register ? register() : {};
  return (
    <div>
      {labelTitle && <Label text={labelTitle} /> }
      <ShadInput
        className="focus:ring-0 focus:border-none h-auto"
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled}
        {...reg}
      />
    </div>
  );
}

export default Input;
