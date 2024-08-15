import { Checkbox } from "@/components/ui/checkbox";
import {
  FieldValues,
  Path,
  useController,
  UseControllerProps,
} from "react-hook-form";
import { v4 } from "uuid";

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
  const id = "checkbox-" + v4().slice(0, 8);
  const { field } = useController({ name: rhfName, ...controllerProps });

  return (
    <div className="flex items-center space-x-2" >
        <Checkbox id={id} checked={field.value} onCheckedChange={field.onChange} {...field}/>
        <label
          htmlFor={id}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {labelText}
        </label>
    </div>
  );
}
