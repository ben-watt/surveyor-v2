import React, { useEffect } from 'react';
import { UseControllerProps, useFormContext } from 'react-hook-form';
import { ErrorMessage } from '@hookform/error-message';
import { Label } from '../Input/Label';
import InputError from '../InputError';
import { MemoizedInputImage, InputImageProps } from './InputImage';

export interface RhfInputImageProps extends Omit<InputImageProps, 'onChange'> {
  labelText?: string;
  rhfProps: UseControllerProps;
}

export const RhfInputImage: React.FC<RhfInputImageProps> = ({
  path,
  labelText,
  rhfProps,
  ...props
}) => {
  const { setValue, formState, register } = useFormContext();

  console.log('[RhfInputImage] Rendering');

  const onChange = (fileSources: string[]) => {
    setValue(rhfProps.name, fileSources);
  };

  useEffect(() => {
    register(rhfProps.name);
  }, [rhfProps.name, register]);

  return (
    <div>
      {labelText && <Label text={labelText} />}
      <MemoizedInputImage
        id={path}
        path={path}
        onChange={onChange}
        {...props}
      />
      <ErrorMessage
        errors={formState.errors}
        name={rhfProps.name}
        render={({ message }) => InputError({ message })}
      />
    </div>
  );
}; 