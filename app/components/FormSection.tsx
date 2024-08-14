import React, { PropsWithChildren } from 'react'

interface FormSectionProps {
  title?: string;
}

export const FormSection = ({ title, children } : PropsWithChildren<FormSectionProps>) => {
  return (
    <div className="space-y-4 border border-grey-600 mt-2 mb-2 rounded p-2">
      {title && <h2 className="text-lg font-semibold">{title}</h2>}
      {children}
    </div>
  );
};