import React from 'react';
import { FieldValues, Path, UseControllerProps, useController } from 'react-hook-form';
import { DropZoneInputFile, DropZoneInputImage, DropZoneInputImageProps } from './index';
import { ErrorMessage } from '@hookform/error-message';
import { Label } from '../Input/Label';
import InputError from '../InputError';

export interface RhfDropZoneInputImageProps<
  TFieldValues extends FieldValues,
  TName extends Path<TFieldValues>
> extends Omit<DropZoneInputImageProps, 'onChange'> {
  rhfProps: UseControllerProps<TFieldValues, TName>;
  labelText?: string;
}

const MemoizedDropZoneInputImage = React.memo(DropZoneInputImage);

export function RhfDropZoneInputImage<
  TFieldValues extends FieldValues,
  TName extends Path<TFieldValues>
>({
  path,
  rhfProps,
  labelText,
  ...props
}: RhfDropZoneInputImageProps<TFieldValues, TName>) {
  const { field } = useController<TFieldValues, TName>(rhfProps);

  const handleChange = (files: DropZoneInputFile[]) => {
    const mappedFiles = files.map(file => ({ path: file.path, isArchived: file.isArchived, hasMetadata: file.hasMetadata }));
    field.onChange(mappedFiles as any);
  };

  return (
    <div>
      {labelText && <Label text={labelText} />}
      <MemoizedDropZoneInputImage
        path={path}
        value={Array.isArray(field.value) ? (field.value as any) : []}
        onChange={handleChange}
        onReorder={handleChange}
        {...props}
      />
      <ErrorMessage
        name={rhfProps.name as string}
        render={({ message }) => InputError({ message })}
      />
    </div>
  );
}
