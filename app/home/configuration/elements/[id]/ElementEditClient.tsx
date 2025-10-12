'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { DataForm } from '../../../elements/form';
import { PageHeader } from '@/components/page-header';

export default function ElementEditClient() {
  const params = useParams<{ id: string }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = decodeURIComponent(rawId);

  return (
    <PageHeader title="Edit Element" subtitle="Edit a building element used within a section.">
      <DataForm id={id} />
    </PageHeader>
  );
}
