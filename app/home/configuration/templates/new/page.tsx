'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { TemplateForm } from '../form';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewTemplatePage() {
  const router = useRouter();

  return (
    <PageHeader
      title="Create Template"
      subtitle="Create a new report template"
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
        onSave={() => {
          router.push('/home/configuration/templates');
        }}
      />
    </PageHeader>
  );
}

