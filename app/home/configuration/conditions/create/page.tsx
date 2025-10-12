'use client';

import React from 'react';
import { DataForm } from '../../../conditions/form';
import { useSearchParams } from 'next/navigation';

export default function CreateConditionPage() {
  const searchParams = useSearchParams();
  const parentType = searchParams.get('parentType');
  const parentId = searchParams.get('parentId');
  const defaultValues =
    parentType && parentId
      ? parentType === 'element'
        ? { associatedElementIds: [parentId] }
        : parentType === 'component'
          ? { associatedComponentIds: [parentId] }
          : undefined
      : undefined;
  return (
    <div className="container mx-auto px-5">
      <div className="mb-4 mt-4 flex">
        <h1 className="text-4xl dark:text-white">Create Condition</h1>
      </div>
      <DataForm defaultValues={defaultValues} />
    </div>
  );
}
