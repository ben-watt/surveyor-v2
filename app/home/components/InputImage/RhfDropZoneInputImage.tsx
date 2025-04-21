import React from 'react';
import { UseControllerProps, useController } from 'react-hook-form';
import { DropZoneInputImage, DropZoneInputImageProps } from './DropZoneInputImage';

export interface RhfDropZoneInputImageProps extends Omit<DropZoneInputImageProps, 'onChange'> {
  rhfProps: UseControllerProps;
}

export const RhfDropZoneInputImage: React.FC<RhfDropZoneInputImageProps> = ({
  path,
  rhfProps,
  ...props
}) => {
  const { field } = useController(rhfProps);
  
  const handleChange = (filePaths: string[]) => {
    field.onChange(filePaths);
  };

  return (
    <DropZoneInputImage
      path={path}
      onChange={handleChange}
      {...props}
    />
  );
}; 