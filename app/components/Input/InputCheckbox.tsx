import { Checkbox } from "@/components/ui/checkbox";
import {
  FieldValues,
  useController,
  UseControllerProps,
} from "react-hook-form";

interface InputCheckboxProps {
  labelText?: string;
  rhfProps: UseControllerProps<FieldValues>;
}

export function InputCheckbox({
  labelText,
  rhfProps: controllerProps,
}: InputCheckboxProps) {
  const { field } = useController(controllerProps);

  return (
    <div className="flex items-center space-x-2" >
        <Checkbox id={controllerProps.name} checked={field.value} onCheckedChange={field.onChange} {...field}/>
        <label
          htmlFor={controllerProps.name}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {labelText}
        </label>
    </div>
  );
}
