import { Key, MouseEvent, useState } from 'react';
import ToogleInput from './ToggleInput';
import { useFormContext, UseFormRegisterReturn, useWatch } from 'react-hook-form';

interface ToggleSectionProps {
  label: string;
  children: any;
  register: () => UseFormRegisterReturn<string>;
}

export const InputToggle = ({ label, children, register }: ToggleSectionProps) => {
  const reg = register();
  const fieldValue = useWatch({ name: reg.name });

  return (
    <>
      <ToogleInput
        labelStyle="text-lg font-medium"
        labelTitle={label}
        register={() => reg}
      ></ToogleInput>
      {fieldValue && children}
    </>
  );
};
