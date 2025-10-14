'use client';

import Input from '@/app/home/components/Input/InputText';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DynamicComboBox } from '@/app/home/components/Input';
import { Phrase } from '../clients/Dexie';
import { componentStore, elementStore, phraseStore } from '../clients/Database';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { useAutoSaveForm } from '../hooks/useAutoSaveForm';
import { LastSavedIndicator } from '../components/LastSavedIndicator';
import { getAutoSaveTimings } from '../utils/autosaveTimings';
import InlineTemplateComposer, {
  type InlineTemplateComposerAction,
} from '@/components/conditions/InlineTemplateComposer';
import { Wand2 } from 'lucide-react';
import type { JSONContent } from '@tiptap/core';
import { docToTokens, tokensToDoc } from '@/lib/conditions/interop';
import { validateDoc } from '@/lib/conditions/validator';

// Zod schema for condition/phrase validation
const conditionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  phrase: z.string().min(1, 'Phrase is required'),
  phraseDoc: z.any().optional(),
  phraseLevel2: z.string().nullable().optional(),
  phraseLevel2Doc: z.any().optional(),
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
      phraseDoc: undefined as unknown as JSONContent,
      phraseLevel2: undefined,
      phraseLevel2Doc: undefined as unknown as JSONContent,
      associatedComponentIds: [],
      ...defaultValues,
    },
    mode: 'onChange',
    resolver: zodResolver(conditionSchema),
  });
  const {
    register,
    control,
    setValue,
    watch,
    getValues,
    trigger,
    formState: { errors },
  } = methods;
  const [componentsHydrated, components] = componentStore.useList();
  const [phraseHydrated, phrase] = phraseStore.useGet(idRef.current);

  // Track if we've done the initial reset to prevent wiping user input on autosave
  const [hasInitialReset, setHasInitialReset] = useState(false);

  // Autosave functionality
  const savePhrase = useCallback(
    async (data: ConditionFormData, { auto = false }: { auto?: boolean } = {}) => {
      try {
        // Ensure we have TipTap docs; backfill from tokens if missing
        const ensureDoc = (tokens: string, doc?: JSONContent | null): JSONContent => {
          if (doc && typeof doc === 'object') return doc as JSONContent;
          try {
            return tokensToDoc(tokens) as JSONContent;
          } catch (e) {
            return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: tokens }]}] } as any;
          }
        };

        const phraseDoc: JSONContent = ensureDoc(data.phrase ?? '', (data as any).phraseDoc as JSONContent);
        const phraseLevel2Doc: JSONContent | undefined = data.phraseLevel2
          ? ensureDoc(data.phraseLevel2, (data as any).phraseLevel2Doc as JSONContent)
          : undefined;

        // Basic validation using shared validator
        const v1 = validateDoc(phraseDoc);
        const v2 = phraseLevel2Doc ? validateDoc(phraseLevel2Doc) : { ok: true, issues: [] };
        if (!v1.ok || !v2.ok) {
          const first = [...v1.issues, ...v2.issues][0]?.message || 'Invalid template';
          if (!auto) toast.error(first);
          throw new Error(first);
        }

        // Normalize tokens from docs to keep template strings in sync
        const normalizedPhrase = docToTokens(phraseDoc as any);
        const normalizedPhraseLevel2 = phraseLevel2Doc ? docToTokens(phraseLevel2Doc as any) : data.phraseLevel2;

        if (phraseHydrated && phrase) {
          await phraseStore.update(idRef.current, (draft) => {
            draft.name = data.name;
            draft.type = 'condition';
            draft.phrase = normalizedPhrase;
            (draft as any).phraseDoc = phraseDoc as any;
            draft.phraseLevel2 = normalizedPhraseLevel2 as any;
            (draft as any).phraseLevel2Doc = (phraseLevel2Doc as any) ?? undefined;
            draft.associatedComponentIds = data.associatedComponentIds ?? [];
          });
          if (!auto) toast.success('Phrase updated');
        } else {
          await phraseStore.add({
            id: idRef.current,
            name: data.name,
            order: 0,
            type: 'condition',
            phrase: normalizedPhrase,
            phraseDoc: phraseDoc as any,
            phraseLevel2: normalizedPhraseLevel2 as any,
            phraseLevel2Doc: (phraseLevel2Doc as any) ?? undefined,
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
          phraseDoc: (phrase as any).phraseDoc ?? undefined,
          phraseLevel2: phrase.phraseLevel2 ?? undefined,
          phraseLevel2Doc: (phrase as any).phraseLevel2Doc ?? undefined,
          associatedComponentIds: phrase.associatedComponentIds ?? [],
        } as any,
        { keepDirtyValues: true },
      );
      setHasInitialReset(true);
    }
  }, [phraseHydrated, phrase, methods, hasInitialReset, skipNextChange]);

  const insertSampleAction = useMemo<InlineTemplateComposerAction>(
    () => ({
      label: 'Insert sample select',
      icon: <Wand2 className="h-5 w-5" />,
      onSelect: (api) => {
        const key = `select_${Math.random().toString(36).slice(2, 8)}`;
        if (api.getMode() === 'visual') {
          api.insertInlineSelect({
            key,
            options: [...SAMPLE_SELECT_OPTIONS],
            allowCustom: true,
          });
          return;
        }
        api.insertSampleToken();
      },
    }),
    [],
  );
  const insertSampleActions = useMemo(() => [insertSampleAction], [insertSampleAction]);

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
                label="Phrase (Level 3)"
                value={field.value ?? ''}
                onChange={(next) => {
                  field.onChange(next);
                  if (!fieldState.isTouched) {
                    field.onBlur();
                  }
                }}
                onDocChange={(doc) => setValue('phraseDoc', doc as any, { shouldDirty: true })}
                tokenModeActions={insertSampleActions}
                visualModeActions={insertSampleActions}
              />
              {errors.phrase ? (
                <p className="text-sm text-red-600">{errors.phrase.message as string}</p>
              ) : null}
            </div>
          )}
        />
        <Controller
          name="phraseLevel2"
          control={control}
          render={({ field, fieldState }) => (
            <div className="space-y-2">
              <InlineTemplateComposer
                label="Phrase (Level 2)"
                value={field.value ?? ''}
                onChange={(next) => {
                  field.onChange(next);
                  if (!fieldState.isTouched) {
                    field.onBlur();
                  }
                }}
                onDocChange={(doc) => setValue('phraseLevel2Doc', doc as any, { shouldDirty: true })}
                tokenModeActions={insertSampleActions}
                visualModeActions={insertSampleActions}
              />
              {errors.phraseLevel2 ? (
                <p className="text-sm text-red-600">{errors.phraseLevel2.message as string}</p>
              ) : null}
            </div>
          )}
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
