'use client';

import Input from '@/app/home/components/Input/InputText';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Template } from '@/app/home/clients/Dexie';
import { templateStore } from '@/app/home/clients/Database';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { useAutoSaveForm } from '@/app/home/hooks/useAutoSaveForm';
import { LastSavedIndicator } from '@/app/home/components/LastSavedIndicator';
import { getAutoSaveTimings } from '@/app/home/utils/autosaveTimings';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { renderTemplate, validateTemplate } from '@/app/home/surveys/templates/renderer';
import { mockSurveyData } from '@/app/home/surveys/mocks/mockSurveyData';
import { AlertCircle, Eye, Edit } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { NewEditor } from '@/app/home/components/Input/BlockEditor';
import { VariableBrowser } from './components/VariableBrowser';

// Zod schema for template validation
const templateSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Template name is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.enum(['level2', 'level3', 'summary', 'custom']),
  content: z.string().min(1, 'Template content is required'),
  version: z.number(),
  createdBy: z.string(),
  tags: z.array(z.string()),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface TemplateFormProps {
  id?: string;
  defaultValues?: Partial<Template>;
  onSave?: () => void;
}

export function TemplateForm({ id, defaultValues, onSave }: TemplateFormProps) {
  const idRef = useRef(id ?? uuidv4());
  const editorRef = useRef<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const methods = useForm<TemplateFormData>({
    defaultValues: {
      id: idRef.current,
      name: '',
      description: '',
      category: 'custom',
      content: '',
      version: 1,
      createdBy: '',
      tags: [],
      ...defaultValues,
    },
    mode: 'onChange',
    resolver: zodResolver(templateSchema),
  });

  const {
    register,
    control,
    watch,
    getValues,
    trigger,
    formState: { errors },
  } = methods;

  const [templateHydrated, template] = templateStore.useGet(idRef.current);
  const [hasInitialReset, setHasInitialReset] = useState(false);

  // Watch content for preview updates
  const contentValue = watch('content');

  // Update preview when content changes
  useEffect(() => {
    if (showPreview && contentValue) {
      try {
        const validation = validateTemplate(contentValue);
        if (validation.isValid) {
          const rendered = renderTemplate(contentValue, mockSurveyData);
          setPreviewHtml(rendered);
          setValidationError(null);
        } else {
          setValidationError(validation.error || 'Template validation failed');
        }
      } catch (error) {
        setValidationError(
          error instanceof Error ? error.message : 'Failed to render template',
        );
      }
    }
  }, [contentValue, showPreview]);

  // Autosave functionality
  const saveTemplate = useCallback(
    async (data: TemplateFormData, { auto = false }: { auto?: boolean } = {}) => {
      try {
        // Validate template syntax
        const validation = validateTemplate(data.content);
        if (!validation.isValid) {
          if (!auto) toast.error(`Template syntax error: ${validation.error}`);
          throw new Error(validation.error);
        }

        if (templateHydrated && template) {
          await templateStore.update(idRef.current, (draft) => {
            draft.name = data.name;
            draft.description = data.description;
            draft.category = data.category;
            draft.content = data.content;
            draft.version = (draft.version || 0) + 1;
            draft.tags = data.tags;
          });
          if (!auto) toast.success('Template updated');
        } else {
          await templateStore.add({
            id: idRef.current,
            name: data.name,
            description: data.description,
            category: data.category,
            content: data.content,
            version: 1,
            createdBy: data.createdBy || 'current-user',
            tags: data.tags,
          });
          if (!auto) toast.success('Template created');
        }
        if (!auto) onSave?.();
      } catch (error) {
        console.error('Failed to save template', error);
        if (!auto) toast.error('Error saving template');
        throw error;
      }
    },
    [templateHydrated, template, onSave],
  );

  const timings = getAutoSaveTimings();
  const { saveStatus, lastSavedAt, skipNextChange } = useAutoSaveForm(
    saveTemplate,
    watch,
    getValues,
    trigger,
    {
      delay: timings.delay,
      watchDelay: timings.watchDelay,
      showToast: false,
      enabled: templateHydrated,
      validateBeforeSave: true,
    },
  );

  useEffect(() => {
    if (templateHydrated && template && !hasInitialReset) {
      skipNextChange();
      methods.reset(
        {
          id: template.id,
          name: template.name,
          description: template.description,
          category: template.category,
          content: template.content,
          version: template.version,
          createdBy: template.createdBy,
          tags: template.tags || [],
        },
        { keepDirtyValues: true },
      );
      setHasInitialReset(true);
    }
  }, [templateHydrated, template, methods, hasInitialReset, skipNextChange]);

  // Handle variable insertion from VariableBrowser
  const handleInsertVariable = useCallback((path: string) => {
    if (editorRef.current?.commands) {
      editorRef.current.commands.insertContent(`{{${path}}}`);
      editorRef.current.commands.focus();
    }
  }, []);

  if (!templateHydrated) {
    return <div>Loading...</div>;
  }

  return (
    <FormProvider {...methods}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6">
        {/* Main Content Column */}
        <div className="grid gap-6">
          {/* Basic Info Section */}
          <div className="grid gap-4">
            <Input labelTitle="Template Name" register={() => register('name')} errors={errors} />

            <div>
              <Label htmlFor="description">Description</Label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <Textarea
                    id="description"
                    placeholder="Describe what this template is for..."
                    className="min-h-[80px]"
                    {...field}
                  />
                )}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message as string}</p>
              )}
            </div>
          </div>

          {/* Template Content Section */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="content">Template Content</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? (
                  <>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </>
                )}
              </Button>
            </div>

            {!showPreview && (
              <div className="space-y-2">
                <Controller
                  name="content"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      <NewEditor
                        ref={editorRef}
                        editorId={`template-editor-${idRef.current}`}
                        content={field.value || ''}
                        onUpdate={({ editor }) => {
                          field.onChange(editor.getHTML());
                        }}
                        onCreate={({ editor }) => {
                          editorRef.current = editor;
                        }}
                        onPrint={(_layout) => {}}
                        onSave={() => {}}
                        isSaving={false}
                        saveStatus="idle"
                        enableHandlebarsHighlight={true}
                      />
                      {errors.content && (
                        <p className="mt-2 text-sm text-red-600">{errors.content.message as string}</p>
                      )}
                    </div>
                  )}
                />

              {/* Helper text */}
              <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
                <p className="font-semibold mb-1">💡 Template Variables:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Insert variables: Type <code className="bg-blue-100 px-1 rounded">{'{{reportDetails.clientName}}'}</code> directly in the editor</li>
                  <li>Use loops: <code className="bg-blue-100 px-1 rounded">{'{{#each sections}}...{{/each}}'}</code></li>
                  <li>Add conditionals: <code className="bg-blue-100 px-1 rounded">{'{{#if field}}...{{/if}}'}</code></li>
                  <li>Click Preview to see the template rendered with mock data</li>
                </ul>
              </div>
            </div>
          )}

          {showPreview && (
            <div className="rounded-md border">
              {validationError ? (
                <div className="p-4">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{validationError}</AlertDescription>
                  </Alert>
                </div>
              ) : (
                <NewEditor
                  editorId={`template-preview-${idRef.current}`}
                  content={previewHtml}
                  onPrint={(_layout) => {}}
                  onSave={() => {}}
                  isSaving={false}
                  saveStatus="idle"
                />
              )}
            </div>
          )}
        </div>

          {/* Save Status */}
          <LastSavedIndicator
            status={saveStatus}
            lastSavedAt={lastSavedAt || undefined}
            entityUpdatedAt={template?.updatedAt}
            className="justify-center text-sm"
          />
        </div>

        {/* Variable Browser Column */}
        {!showPreview && (
          <div className="hidden lg:block">
            <div className="sticky top-4 h-[calc(100vh-8rem)] border rounded-lg p-4 bg-white shadow-sm">
              <VariableBrowser onInsert={handleInsertVariable} className="h-full" />
            </div>
          </div>
        )}
      </div>
    </FormProvider>
  );
}

