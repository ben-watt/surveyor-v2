import React from 'react';
import { UseControllerProps, useController } from 'react-hook-form';
import { DropZoneInputFile, DropZoneInputImage, DropZoneInputImageProps } from './DropZoneInputImage';
import { ErrorMessage } from '@hookform/error-message';
import { Label } from '../Input/Label';
import InputError from '../InputError';

export interface RhfDropZoneInputImageProps extends Omit<DropZoneInputImageProps, 'onChange'> {
  rhfProps: UseControllerProps;
  labelText?: string;
}


const MemoizedDropZoneInputImage = React.memo(DropZoneInputImage);

export const RhfDropZoneInputImage: React.FC<RhfDropZoneInputImageProps> = ({
  path,
  rhfProps,
  labelText,
  ...props
}) => {
  const { field } = useController(rhfProps);
  
  const handleChange = (files: DropZoneInputFile[]) => {
    const mappedFiles = files.map(file => ({ path: file.path, isArchived: file.isArchived, hasMetadata: file.hasMetadata }));
    field.onChange(mappedFiles);
  };

  return (
    <div>
      {labelText && <Label text={labelText} />}
      <MemoizedDropZoneInputImage
        path={path}
        onChange={handleChange}
        {...props}
      />
      <ErrorMessage
        name={rhfProps.name}
        render={({ message }) => InputError({ message })}
      />
    </div>
  );
}; 