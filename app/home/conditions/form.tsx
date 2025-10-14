'use client';

import Input from '@/app/home/components/Input/InputText';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DynamicComboBox } from '@/app/home/components/Input';
import { Phrase } from '../clients/Dexie';
import TextAreaInput from '../components/Input/TextAreaInput';
import { componentStore, elementStore, phraseStore } from '../clients/Database';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { useAutoSaveForm } from '../hooks/useAutoSaveForm';
import { LastSavedIndicator } from '../components/LastSavedIndicator';
import { getAutoSaveTimings } from '../utils/autosaveTimings';
import InlineTemplateComposer, {
  type InlineTemplateComposerHandle,
  type InlineTemplateComposerAction,
} from '@/components/conditions/InlineTemplateComposer';
import { Wand2 } from 'lucide-react';

// Zod schema for condition/phrase validation
const conditionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  phrase: z.string().min(1, 'Phrase is required'),
  phraseLevel2: z.string().nullable().optional(),
  associatedComponentIds: z.array(z.string()).transform((val) => val || []),
});

type ConditionFormData = z.infer<typeof conditionSchema>;

type UpdateForm = Omit<Phrase, 'createdAt' | 'updatedAt' | 'element'>;

interface DataFormProps {
  id?: string;
  defaultValues?: Partial<UpdateForm>;
  onSave?: () => void;
}

const SAMPLE_SELECT_OPTIONS = [
  'a dated consumer unit',
  'older wiring',
  'loose or surface-mounted cabling',
  'dated fittings',
] as const;

export function DataForm({ id, defaultValues, onSave }: DataFormProps) {
  const idRef = useRef(id ?? uuidv4());
  const methods = useForm<ConditionFormData>({
    defaultValues: {
      id: idRef.current,
      name: '',
      phrase: '',
      phraseLevel2: undefined,
      associatedComponentIds: [],
      ...defaultValues,
    },
    mode: 'onChange',
    resolver: zodResolver(conditionSchema),
  });
  const {
    register,
    control,
    watch,
    getValues,
    trigger,
    formState: { errors },
  } = methods;
  const [componentsHydrated, components] = componentStore.useList();
  const [phraseHydrated, phrase] = phraseStore.useGet(idRef.current);

  const composerRef = useRef<InlineTemplateComposerHandle>(null);

  // Track if we've done the initial reset to prevent wiping user input on autosave
  const [hasInitialReset, setHasInitialReset] = useState(false);

  // Autosave functionality
  const savePhrase = useCallback(
    async (data: ConditionFormData, { auto = false }: { auto?: boolean } = {}) => {
      try {
        if (phraseHydrated && phrase) {
          await phraseStore.update(idRef.current, (draft) => {
            draft.name = data.name;
            draft.type = 'condition';
            draft.phrase = data.phrase;
            draft.phraseLevel2 = data.phraseLevel2;
            draft.associatedComponentIds = data.associatedComponentIds ?? [];
          });
          if (!auto) toast.success('Phrase updated');
        } else {
          await phraseStore.add({
            id: idRef.current,
            name: data.name,
            order: 0,
            type: 'condition',
            phrase: data.phrase,
            phraseLevel2: data.phraseLevel2,
            associatedComponentIds: data.associatedComponentIds ?? [],
          });
          if (!auto) toast.success('Phrase created');
        }
        if (!auto) onSave?.();
      } catch (error) {
        console.error('Failed to save phrase', error);
        if (!auto) toast.error('Error saving phrase');
        throw error; // Re-throw for autosave error handling
      }
    },
    [phraseHydrated, phrase, onSave],
  );

  const timings = getAutoSaveTimings();
  const { saveStatus, isSaving, lastSavedAt, skipNextChange } = useAutoSaveForm(
    savePhrase,
    watch,
    getValues,
    trigger,
    {
      delay: timings.delay,
      watchDelay: timings.watchDelay,
      showToast: false, // Don't show toast for autosave
      enabled: phraseHydrated,
      validateBeforeSave: true, // Enable validation before auto-save
    },
  );

  useEffect(() => {
    if (phraseHydrated && phrase && !hasInitialReset) {
      // Skip the next autosave trigger since we're about to reset
      skipNextChange();
      // Only reset on initial load, not on subsequent updates from autosave
      methods.reset(
        {
          id: phrase.id,
          name: phrase.name ?? '',
          phrase: phrase.phrase ?? '',
          phraseLevel2: phrase.phraseLevel2 ?? undefined,
          associatedComponentIds: phrase.associatedComponentIds ?? [],
        } as any,
        { keepDirtyValues: true },
      );
      setHasInitialReset(true);
    }
  }, [phraseHydrated, phrase, methods, hasInitialReset, skipNextChange]);

  const handleInsertSampleSelect = useCallback(() => {
    const composer = composerRef.current;
    if (!composer) return;
    const key = `select_${Math.random().toString(36).slice(2, 8)}`;
    if (composer.getMode() === 'visual') {
      composer.insertInlineSelect({
        key,
        options: [...SAMPLE_SELECT_OPTIONS],
        allowCustom: true,
      });
      return;
    }
    composer.insertSampleToken();
  }, []);

  const insertSampleAction = useMemo<InlineTemplateComposerAction>(
    () => ({
      label: 'Insert sample select',
      icon: <Wand2 className="h-5 w-5" />,
      onSelect: handleInsertSampleSelect,
    }),
    [handleInsertSampleSelect],
  );

  if (!componentsHydrated) {
    return <div>Loading...</div>;
  }

  return (
    <FormProvider {...methods}>
      <div className="grid gap-4">
        <Input labelTitle="Name" register={() => register('name')} errors={errors} />
        <Controller
          name="phrase"
          control={control}
          render={({ field, fieldState }) => (
            <div className="space-y-2">
              <InlineTemplateComposer
                ref={composerRef}
                label="Phrase (Level 3)"
                value={field.value ?? ''}
                onChange={(next) => {
                  field.onChange(next);
                  if (!fieldState.isTouched) {
                    field.onBlur();
                  }
                }}
                tokenModeAction={insertSampleAction}
                visualModeAction={insertSampleAction}
              />
              {errors.phrase ? (
                <p className="text-sm text-red-600">{errors.phrase.message as string}</p>
              ) : null}
            </div>
          )}
        />
        <TextAreaInput
          labelTitle="Phrase (Level 2)"
          placeholder="Simpler wording for Level 2 surveys"
          register={() => register('phraseLevel2')}
          errors={errors}
        />
        <DynamicComboBox
          labelTitle="Associated Components"
          name="associatedComponentIds"
          control={control}
          data={components.map((x) => ({ label: x.name, value: x.id }))}
          isMulti={true}
          errors={errors}
        />
        <LastSavedIndicator
          status={saveStatus}
          lastSavedAt={lastSavedAt || undefined}
          entityUpdatedAt={phrase?.updatedAt}
          className="justify-center text-sm"
        />
      </div>
    </FormProvider>
  );
}
