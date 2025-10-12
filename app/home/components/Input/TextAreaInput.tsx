import { Textarea } from '@/components/ui/textarea';
import { FieldErrors, FieldValues, UseFormRegisterReturn } from 'react-hook-form';
import { Label } from './Label';
import { ErrorMessage } from '@hookform/error-message';
import InputError from '../InputError';

interface TextAreaInputProps {
  labelTitle?: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  register: () => UseFormRegisterReturn<string>;
  errors?: FieldErrors<FieldValues>;
}

export default function TextAreaInput({
  register,
  labelTitle = '',
  defaultValue = '',
  placeholder = '',
  errors,
  className = '',
}: TextAreaInputProps) {
  const reg = register();
  return (
    <div>
      {labelTitle && <Label text={labelTitle} htmlFor={reg.name} />}
      <Textarea
        {...reg}
        id={reg.name}
        className={className}
        placeholder={placeholder}
        defaultValue={defaultValue}
      />
      <ErrorMessage
        errors={errors}
        name={reg.name}
        render={({ message }) => InputError({ message })}
      />
    </div>
  );
}
