'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TemplateForm } from '../form';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TemplateEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = decodeURIComponent(rawId);

  return (
    <PageHeader
      title="Edit Template"
      subtitle="Modify your report template"
      actions={
        <Link href="/home/configuration/templates">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Button>
        </Link>
      }
    >
      <TemplateForm
        id={id}
        onSave={() => {
          router.push('/home/configuration/templates');
        }}
      />
    </PageHeader>
  );
}

