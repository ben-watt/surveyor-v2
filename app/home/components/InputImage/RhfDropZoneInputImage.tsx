import React from 'react';
import { UseControllerProps, useController } from 'react-hook-form';
import { DropZoneInputImage, DropZoneInputImageProps } from './DropZoneInputImage';

export interface RhfDropZoneInputImageProps extends Omit<DropZoneInputImageProps, 'onChange'> {
  rhfProps: UseControllerProps;
}


const MemoizedDropZoneInputImage = React.memo(DropZoneInputImage);

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
    <MemoizedDropZoneInputImage
      path={path}
      onChange={handleChange}
      {...props}
    />
  );
}; 