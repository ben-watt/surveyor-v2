'use client';

import React from 'react';
import { DataForm } from '../../../elements/form';
import { useSearchParams } from 'next/navigation';

export default function CreateElementPage() {
  const searchParams = useSearchParams();
  const parentType = searchParams.get('parentType');
  const parentId = searchParams.get('parentId');
  const defaultValues = parentType === 'section' && parentId ? { sectionId: parentId } : undefined;
  return (
    <div className="container mx-auto px-5">
      <div className="mb-4 mt-4 flex">
        <h1 className="text-4xl dark:text-white">Create Element</h1>
      </div>
      <DataForm defaultValues={defaultValues} />
    </div>
  );
}
