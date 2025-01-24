import { cn } from "@/lib/utils";
import { Control, useController } from "react-hook-form";
import { Label } from "./Label";
import { Input as ShadInput } from "@/components/ui/input";
import InputError from "../InputError";
import { useEffect, useState } from "react";

interface InputMoneyProps {
  labelTitle?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  hidden?: boolean;
  name: string;
  control: Control<any>;
  rules?: Record<string, any>;
}

const moneyFormatter = Intl.NumberFormat("en-GB", {
  currency: "GBP",
  currencyDisplay: "symbol",
  currencySign: "standard",
  style: "currency",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const formatValue = (value: string): string => {
    return value ? moneyFormatter.format(Number(value)) : "£0.00";
}

const InputMoney = ({
  labelTitle,
  placeholder,
  className,
  disabled,
  hidden,
  name,
  control,
  rules,
}: InputMoneyProps) => {
  const {
    field,
    fieldState: { error },
  } = useController({
    name,
    control,
    rules,
  });

  const [displayValue, setDisplayValue] = useState(formatValue(field.value));

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;
    const digits = inputValue.replace(/\D/g, "");
    const realValue = Number(digits) / 100;
    field.onChange(realValue);
  };

  useEffect(() => {
    setDisplayValue(formatValue(field.value));
  }, [field.value]);

  return (
    <div className={cn(hidden && "hidden")}>
      {labelTitle && <Label text={labelTitle} />}
      <ShadInput
        className={cn("focus:ring-0 focus:border-none", className)}
        type="text"
        placeholder={placeholder}
        disabled={disabled}
        onChange={handleChange}
        value={displayValue}
        onBlur={field.onBlur}
        name={field.name}
      />
      {error && <InputError message={error.message} />}
    </div>
  );
};

export default InputMoney;
