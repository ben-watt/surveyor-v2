import { Checkbox } from "@/components/ui/checkbox";
import {
  FieldValues,
  Path,
  useController,
  UseControllerProps,
} from "react-hook-form";

interface InputCheckboxProps {
  labelText?: string;
  rhfName: Path<FieldValues>;
  controllerProps?: Omit<UseControllerProps<FieldValues>, "name">;
}

export function InputCheckbox({
  rhfName,
  labelText,
  controllerProps,
}: InputCheckboxProps) {
  const { field } = useController({ name: rhfName, ...controllerProps });

  return (
    <div className="flex items-center space-x-2" >
        <Checkbox id={rhfName} checked={field.value} onCheckedChange={field.onChange} {...field}/>
        <label
          htmlFor={rhfName}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {labelText}
        </label>
    </div>
  );
}
