import { Checkbox } from '@/components/ui/checkbox';
import { ErrorMessage } from '@hookform/error-message';
import { FieldValues, useController, UseControllerProps } from 'react-hook-form';
import InputError from '../InputError';

interface InputCheckboxProps {
  labelText?: string;
  rhfProps: UseControllerProps<FieldValues>;
}

export function InputCheckbox({ labelText, rhfProps: controllerProps }: InputCheckboxProps) {
  const { field, formState } = useController(controllerProps);

  return (
    <div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id={controllerProps.name}
          checked={field.value}
          onCheckedChange={field.onChange}
          {...field}
        />
        <label
          htmlFor={controllerProps.name}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {labelText}
        </label>
      </div>
      <ErrorMessage
        errors={formState.errors}
        name={field.name}
        render={({ message }) => InputError({ message })}
      />
    </div>
  );
}
