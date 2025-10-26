'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { templateStore } from '@/app/home/clients/Database';
import { PlusCircle, FileText, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Template } from '@/app/home/clients/Dexie';

export default function TemplatesPage() {
  const [isHydrated, templates] = templateStore.useList();

  const handleDelete = async (template: Template) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await templateStore.remove(template.id);
      toast.success('Template deleted successfully');
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template');
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'level2':
        return 'Level 2 HomeBuyer';
      case 'level3':
        return 'Level 3 Building Survey';
      case 'summary':
        return 'Executive Summary';
      case 'custom':
        return 'Custom';
      default:
        return category;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'level2':
        return 'bg-blue-100 text-blue-800';
      case 'level3':
        return 'bg-purple-100 text-purple-800';
      case 'summary':
        return 'bg-green-100 text-green-800';
      case 'custom':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isHydrated) {
    return (
      <PageHeader title="Templates" subtitle="Loading templates...">
        <div>Loading...</div>
      </PageHeader>
    );
  }

  return (
    <PageHeader
      title="Report Templates"
      subtitle="Create and manage reusable report templates"
      actions={
        <Link href="/home/configuration/templates/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </Link>
      }
    >
      <div className="space-y-4">
        {templates.length === 0 ? (
          <Card>
            <CardHeader className="text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <CardTitle>No templates yet</CardTitle>
              <CardDescription>
                Create your first template to quickly generate survey reports
              </CardDescription>
              <div className="pt-4">
                <Link href="/home/configuration/templates/new">
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Template
                  </Button>
                </Link>
              </div>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-5 w-5 text-gray-500" />
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(template.category)}`}
                        >
                          {getCategoryLabel(template.category)}
                        </span>
                      </div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="mt-2 line-clamp-2">
                        {template.description}
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-xs text-gray-500">
                      v{template.version} • {new Date(template.updatedAt).toLocaleDateString()}
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/home/configuration/templates/${template.id}`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(template)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageHeader>
  );
}

