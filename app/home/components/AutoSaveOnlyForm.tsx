import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useAutoSaveForm } from '../hooks/useAutoSaveForm';
import { LastSavedIndicator } from './LastSavedIndicator';
import Input from './Input/InputText';

interface ExampleFormData {
  title: string;
  description: string;
  email: string;
}

interface AutoSaveOnlyFormProps {
  initialData?: Partial<ExampleFormData>;
  onSave?: (data: ExampleFormData) => Promise<void>;
}

/**
 * Example form component that demonstrates autosave-only functionality
 * without a manual save button
 */
export function AutoSaveOnlyForm({ initialData, onSave }: AutoSaveOnlyFormProps) {
  const form = useForm<ExampleFormData>({
    defaultValues: initialData || {
      title: '',
      description: '',
      email: '',
    },
  });

  const { register, watch, getValues, trigger } = form;

  // Autosave function
  const saveData = async (data: ExampleFormData, { auto = false }: { auto?: boolean } = {}) => {
    if (onSave) {
      await onSave(data);
    }
    // In a real implementation, you would save to your backend here
    console.log('Saving data:', data, { auto });
  };

  // Autosave hook - no manual save button needed
  const { saveStatus, isSaving, lastSavedAt } = useAutoSaveForm(
    saveData,
    watch,
    getValues,
    trigger,
    {
      watchDelay: 500, // 0.5 second delay
      showToast: false,
      enabled: true,
    },
  );

  return (
    <FormProvider {...form}>
      <div className="space-y-6">
        {/* Form header with autosave status */}
        <div className="flex items-center justify-between border-b pb-4">
          <h2 className="text-lg font-semibold">Auto-save Form Example</h2>
          <LastSavedIndicator status={saveStatus} lastSavedAt={lastSavedAt} className="text-sm" />
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          <Input
            labelTitle="Title"
            register={() => register('title', { required: 'Title is required' })}
            placeholder="Enter title"
          />

          <Input
            labelTitle="Description"
            register={() => register('description')}
            placeholder="Enter description"
          />

          <Input
            labelTitle="Email"
            type="email"
            register={() =>
              register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })
            }
            placeholder="Enter email"
          />
        </div>

        {/* Optional: Show current form state for debugging */}
        <div className="border-t pt-4 text-xs text-gray-500">
          <p>Form automatically saves as you type (1.5s delay)</p>
          <p>Current status: {saveStatus}</p>
          {isSaving && <p>Saving in progress...</p>}
        </div>
      </div>
    </FormProvider>
  );
}
