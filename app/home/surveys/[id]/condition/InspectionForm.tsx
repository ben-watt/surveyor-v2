import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { useForm, FormProvider, useFieldArray, useFormContext } from 'react-hook-form';
import { FormSection } from '@/app/home/components/FormSection';
import { merge } from 'lodash';
import { Button } from '@/components/ui/button';
import { v4 as uuidv4 } from 'uuid';
import {
  componentStore,
  elementStore,
  phraseStore,
  surveyStore,
  sectionStore,
} from '@/app/home/clients/Database';
import TextAreaInput from '@/app/home/components/Input/TextAreaInput';
import { DynamicComboBox } from '@/app/home/components/Input';
import { useDynamicDrawer } from '@/app/home/components/Drawer';
import toast from 'react-hot-toast';

import { Edit, PenLine, X } from 'lucide-react';
import ElementForm from './ElementForm';
import { Skeleton } from '@/components/ui/skeleton';
import { DataForm as ElementDataForm } from '@/app/home/elements/form';
// Removed global component creation from this flow in favor of local
// import { DataForm as ComponentDataForm } from "@/app/home/building-components/form";
import { DataForm as PhraseDataForm } from '@/app/home/conditions/form';
import Input from '@/app/home/components/Input/InputText';
import { resolveDocToText } from '@/lib/conditions/resolver';
import {
  addOrUpdateComponent,
  findComponent,
  getLocalComponentDefs,
  addOrUpdateLocalComponentDef,
  getLocalConditionDefs,
  addOrUpdateLocalConditionDef,
} from '@/app/home/surveys/building-survey-reports/Survey';
import { useLocalDefs } from '@/app/home/surveys/hooks/useLocalDefs';
import { ID_PREFIX, isLocalInstanceId } from '@/app/home/surveys/constants/localIds';
import { instantiateLocalComponentDef } from '@/app/home/surveys/utils/localDefInstance';
import ConditionsList from './ConditionsList';
import { FormPhrase, InspectionFormData, InspectionFormProps, RAG_OPTIONS } from './types';
import InputMoney from '@/app/home/components/Input/InputMoney';
import { useAutoSaveFormWithImages } from '@/app/home/hooks/useAutoSaveFormWithImages';
import { LastSavedIndicatorWithUploads } from '@/app/home/components/LastSavedIndicatorWithUploads';
import { FormErrorBoundary } from '@/app/home/components/FormErrorBoundary';
import { FORM_DEBOUNCE_DELAYS } from '@/app/home/config/formConstants';
import InlineTemplateComposer from '@/components/conditions/InlineTemplateComposer';
import { docToTokens, tokensToDoc } from '@/lib/conditions/interop';
import type { JSONContent } from '@tiptap/core';

function CostingsFieldArray() {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'costings',
  });

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <div key={field.id} className="rounded-md border p-2">
          <div className="relative flex items-end justify-between">
            <InputMoney
              name={`costings.${index}.cost`}
              control={control}
              labelTitle="Cost"
              rules={{ required: 'Amount is required' }}
            />
            <Button
              className="absolute right-0 top-0"
              type="button"
              variant="ghost"
              onClick={() => remove(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div>
            <Input
              labelTitle="Reason"
              placeholder="Description of the cost"
              register={() =>
                register(`costings.${index}.description` as const, {
                  required: 'Description is required',
                  validate: (value) => value.length > 0 || 'Description cannot be empty',
                })
              }
              errors={errors}
            />
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() => append({ cost: 0, description: '' })}
      >
        Add Costing
      </Button>
    </div>
  );
}

// Data loading wrapper component
export default function InspectionFormWrapper({
  surveyId,
  componentId,
  defaultValues,
}: InspectionFormProps) {
  const [componentsHydrated, components] = componentStore.useList();
  const [elementsHydrated, elements] = elementStore.useList();
  const [phrasesHydrated, phrases] = phraseStore.useList();
  const [isHydrated, survey] = surveyStore.useGet(surveyId);
  const [surveySectionsHydrated, surveySections] = sectionStore.useList();

  // Wait for all data to be hydrated
  if (
    !isHydrated ||
    !componentsHydrated ||
    !elementsHydrated ||
    !phrasesHydrated ||
    !surveySectionsHydrated
  ) {
    return (
      <div className="space-y-6">
        <FormSection title="Basic Information">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </FormSection>
        <FormSection title="Component Details">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </FormSection>
      </div>
    );
  }

  // If we have a componentId, find the existing data
  let initialValues: InspectionFormData | undefined;
  if (componentId && survey) {
    const { component, elementSection, section } = findComponent(survey, componentId);
    if (component && elementSection && section) {
      initialValues = {
        inspectionId: component.inspectionId || uuidv4(),
        location: component.location || '',
        surveySection: { id: section.id, name: section.name },
        element: { id: elementSection.id, name: elementSection.name },
        component: { id: component.id, name: component.name },
        nameOverride: component.nameOverride || component.name,
        useNameOverride: component.useNameOverride || false,
        ragStatus: component.ragStatus,
        conditions: component.conditions || [],
        additionalDescription: component.additionalDescription || '',
        images: component.images || [],
        costings: component.costings || [],
      };
    }
  }

  // Merge with any provided default values
  const mergedValues = merge(
    {},
    {
      inspectionId: uuidv4(),
      location: '',
      surveySection: { id: '', name: '' },
      element: { id: '', name: '' },
      component: { id: '', name: '' },
      nameOverride: '',
      useNameOverride: false,
      additionalDescription: '',
      images: [],
      ragStatus: 'N/I',
      conditions: [],
      costings: [],
    },
    initialValues,
    defaultValues,
  );

  return (
    <InspectionFormContent
      surveyId={surveyId}
      level={survey?.reportDetails?.level || ''}
      survey={survey}
      initialValues={mergedValues}
      components={components}
      elements={elements}
      phrases={phrases}
      surveySections={surveySections}
    />
  );
}

// The actual form component
function InspectionFormContent({
  surveyId,
  level,
  survey,
  initialValues,
  components,
  elements,
  phrases,
  surveySections,
}: {
  surveyId: string;
  level: string;
  survey: any | null;
  initialValues: InspectionFormData;
  components: any[];
  elements: any[];
  phrases: any[];
  surveySections: any[];
}) {
  const drawer = useDynamicDrawer();
  const methods = useForm<InspectionFormData>({
    defaultValues: initialValues,
    mode: 'onChange',
  });
  const {
    register,
    watch,
    setValue,
    control,
    getValues,
    trigger,
    formState: { errors },
  } = methods;

  // Only watch specific fields we need
  const surveySection = watch('surveySection');
  const element = watch('element');
  const component = watch('component');
  const useNameOverride = watch('useNameOverride');
  const conditions = watch('conditions');
  const inspectionId = watch('inspectionId');

  const {
    sectionId: derivedSectionId,
    componentDefs,
    conditionDefs,
    addComponentDef,
    addConditionDef,
  } = useLocalDefs(survey as any, elements, element?.id, surveySection?.id);

  function LocalComponentNamePrompt({ onCreate }: { onCreate: (name: string) => void }) {
    const [name, setName] = useState('');
    const canCreate = name.trim().length > 0;
    return (
      <div className="space-y-4 p-2">
        <div>
          <label className="mb-2 block text-sm font-medium">Component Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter component name"
            className="w-full rounded-md border px-3 py-2"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="default"
            onClick={() => onCreate(name.trim())}
            disabled={!canCreate}
          >
            Create
          </Button>
        </div>
      </div>
    );
  }

  // If a user selects a local definition from the combobox, create an instance and switch selection
  useEffect(() => {
    const maybe = component as any;
    if (maybe && maybe.localDefId && element?.id) {
      const defId = maybe.localDefId as string;
      const name = maybe.name as string;
      const newId = `${ID_PREFIX.instance}${uuidv4()}`;
      const current = getValues();
      (async () => {
        try {
          await surveyStore.update(surveyId, (draft) => {
            const elementId = current.element?.id || element.id;
            const sectionId =
              surveySection?.id || elements.find((e: any) => e.id === elementId)?.sectionId;
            if (!elementId || !sectionId) return;
            addOrUpdateLocalComponentDef(draft, sectionId, elementId, {
              id: defId,
              name,
              elementId,
            });
            const { instanceId } = instantiateLocalComponentDef(
              draft as any,
              sectionId,
              elementId,
              name,
              {
                inspectionId: current.inspectionId,
                nameOverride: current.nameOverride,
                useNameOverride: false,
                location: current.location,
                additionalDescription: current.additionalDescription,
                images: current.images || [],
                conditions: (current.conditions || []).map((x: any) => ({
                  id: x.id,
                  name: x.name,
                  phrase: x.phrase || '',
                })),
                ragStatus: current.ragStatus,
                costings: (current.costings || []).map((x: any) => ({
                  cost: x.cost,
                  description: x.description,
                })),
              },
            );
            setValue('component', { id: instanceId, name }, { shouldValidate: true });
          });
          toast.success('Component added from local list');
        } catch (e) {
          console.error(e);
          toast.error('Failed to add component from local list');
        }
      })();
    }
  }, [component, surveySection?.id, element?.id, elements, setValue, surveyId, getValues]);

  function RenameLocalComponentPrompt({
    initialName,
    onRename,
  }: {
    initialName: string;
    onRename: (name: string) => void;
  }) {
    const [name, setName] = useState(initialName || '');
    const canSave = name.trim().length > 0 && name.trim() !== initialName;
    return (
      <div className="space-y-4 p-2">
        <div>
          <label className="mb-2 block text-sm font-medium">Rename Local Component</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter new component name"
            className="w-full rounded-md border px-3 py-2"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="default"
            onClick={() => onRename(name.trim())}
            disabled={!canSave}
          >
            Save
          </Button>
        </div>
      </div>
    );
  }

  function LocalConditionPrompt({ onCreate }: { onCreate: (name: string, text: string) => void }) {
    const [name, setName] = useState('');
    const [text, setText] = useState('');
    const canCreate = name.trim().length > 0 && text.trim().length > 0;
    return (
      <div className="space-y-4 p-2">
        <div>
          <label className="mb-2 block text-sm font-medium">Condition Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Deteriorated mortar"
            className="w-full rounded-md border px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Condition Text</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describe the condition"
            rows={5}
            className="w-full rounded-md border px-3 py-2"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="default"
            onClick={() => onCreate(name.trim(), text.trim())}
            disabled={!canCreate}
          >
            Create & Add
          </Button>
        </div>
      </div>
    );
  }

  // Memoized options for select fields
  const surveySectionOptions = useMemo(() => {
    return surveySections.map((section) => ({
      value: { id: section.id, name: section.name },
      label: section.name,
    }));
  }, [surveySections]);

  const elementOptions = useMemo(
    () =>
      elements
        .filter((element) => !surveySection.id || element.sectionId === surveySection.id)
        .map((element) => ({
          value: { id: element.id, name: element.name },
          label: element.name,
        })),
    [elements, surveySection.id],
  );

  const componentOptions = useMemo(() => {
    const globalOptions = components
      .filter((c) => c.elementId === element.id)
      .map((c) => ({ value: { id: c.id, name: c.name }, label: c.name }));

    const localDefOptions = (() => {
      if (!element?.id || !derivedSectionId) return [] as any[];
      const defs = componentDefs;
      return defs.map((d) => ({
        value: { localDefId: d.id, name: d.name },
        label: `${d.name} - (survey only)`,
      }));
    })();

    const isLocalSelected =
      component &&
      component.id &&
      (isLocalInstanceId(String(component.id)) || !components.some((gc) => gc.id === component.id));

    if (isLocalSelected) {
      const label = `${component.name || '(unnamed)'} - (survey only)`;
      const exists = globalOptions.some((o) => o.value.id === component.id);
      if (!exists) {
        return [
          ...globalOptions,
          ...localDefOptions,
          { value: { id: component.id, name: component.name }, label },
        ];
      }
    }
    return [...globalOptions, ...localDefOptions];
  }, [components, element.id, component, derivedSectionId, componentDefs]);

  const phrasesOptions = useMemo((): { value: FormPhrase; label: string }[] => {
    const isLocalSelected =
      component &&
      component.id &&
      (isLocalInstanceId(String(component.id)) || !components.some((gc) => gc.id === component.id));

    const globals = (phrases || [])
      .filter((p) => String(p.type).toLowerCase() === 'condition')
      .filter((p) => (isLocalSelected ? true : p.associatedComponentIds.includes(component.id)))
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((p) => {
        const docL3 = (p as any).phraseDoc;
        const docL2 = (p as any).phraseLevel2Doc;
        const isLevel2 = level === '2';
        const chosenDoc = isLevel2 ? docL2 : docL3;
        const phraseText = (() => {
          if (chosenDoc) return resolveDocToText(chosenDoc);
          return isLevel2 ? p.phraseLevel2 || 'No level 2 text' : p.phrase || 'No level 3 text';
        })();
        return {
          value: {
            id: p.id,
            name: p.name,
            phrase: phraseText,
            doc: chosenDoc || undefined,
          } as FormPhrase,
          label: p.name,
        };
      });

    const localDefs = (() => {
      if (!element?.id || !derivedSectionId) return [] as { value: FormPhrase; label: string }[];
      const defs = conditionDefs;
      return defs.map((d) => ({
        value: { id: d.id, name: d.name, phrase: d.text } as FormPhrase,
        label: `${d.name} - (survey only)`,
      }));
    })();

    const current = (Array.isArray(conditions) ? conditions : []).map((c) => ({
      value: { id: c.id, name: c.name, phrase: c.phrase || '', doc: (c as any).doc } as FormPhrase,
      label:
        String(c.id).startsWith(ID_PREFIX.condDef) || String(c.id).startsWith(ID_PREFIX.instance)
          ? `${c.name} - (survey only)`
          : c.name,
    }));

    const byId = new Map<string, { value: FormPhrase; label: string }>();
    for (const list of [current, localDefs, globals]) {
      for (const opt of list) {
        if (!byId.has(opt.value.id)) byId.set(opt.value.id, opt);
      }
    }
    return Array.from(byId.values());
  }, [
    phrases,
    component,
    components,
    level,
    conditions,
    element?.id,
    conditionDefs,
    derivedSectionId,
  ]);

  // Reset dependent fields when parent fields change
  useEffect(() => {
    const elementExists = elements.some(
      (e) => e.id === element.id && e.sectionId === surveySection.id,
    );

    if (surveySection.id && !elementExists && element.id) {
      setValue('element', { id: '', name: '' });
      setValue('component', { id: '', name: '' });
    }
  }, [surveySection.id, element.id, setValue, elements]);

  useEffect(() => {
    // Only clear selection when a selected GLOBAL component no longer matches the chosen element
    const globalComp = components.find((c) => c.id === component.id);
    const isLocalSelected =
      !!component?.id && (!globalComp || isLocalInstanceId(String(component.id)));
    const isMismatch = !!globalComp && globalComp.elementId !== element.id;

    if (element && component.id && !isLocalSelected && isMismatch) {
      setValue('component', { id: '', name: '' });
      setValue('conditions', []);
    }
  }, [element, component, components, setValue]);

  useEffect(() => {
    if (element.id) {
      const selectedElement = elements.find((e) => e.id === element.id);
      if (selectedElement) {
        setValue('surveySection', {
          id: selectedElement.sectionId,
          name: surveySections.find((s) => s.id === selectedElement.sectionId)?.name || '',
        });
      }
    }
  }, [element.id, elements, surveySections, setValue]);

  // Memoize the image upload path
  const imageUploadPath = useMemo(
    () => `report-images/${surveyId}/inspections/${initialValues.inspectionId}`,
    [surveyId, initialValues.inspectionId],
  );

  const saveData = useCallback(
    async (data: InspectionFormData, { auto = false } = {}) => {
      try {
        await surveyStore.update(surveyId, (survey) => {
          return addOrUpdateComponent(survey, data.surveySection.id, data.element.id, {
            id: data.component.id,
            inspectionId: data.inspectionId,
            name: data.component.name,
            nameOverride: data.nameOverride,
            useNameOverride: data.useNameOverride,
            location: data.location,
            additionalDescription: data.additionalDescription,
            images: data.images,
            conditions: data.conditions.map((x) => ({
              id: x.id,
              name: x.name,
              phrase: x.phrase || '',
              doc: (x as any).doc,
            })),
            ragStatus: data.ragStatus,
            costings: data.costings.map((x) => ({
              cost: x.cost,
              description: x.description,
            })),
          });
        });

        if (!auto) {
          // For manual saves, close drawer and show toast
          toast.success('Changes saved successfully');
          drawer.closeDrawer();
        }
      } catch (error) {
        console.error('[InspectionForm] Save failed', error);

        if (!auto) {
          toast.error('Failed to save changes');
        }

        throw error; // Re-throw for autosave error handling
      }
    },
    [surveyId, drawer],
  );

  const { saveStatus, isSaving, isUploading, lastSavedAt } = useAutoSaveFormWithImages(
    saveData,
    watch,
    getValues,
    trigger,
    {
      delay: FORM_DEBOUNCE_DELAYS.AUTO_SAVE / 2,
      enabled: !!surveyId && !!initialValues.inspectionId,
      validateBeforeSave: false, // Allow saving partial/invalid data
      imagePaths: [imageUploadPath],
    },
  );

  return (
    <FormProvider {...methods}>
      <FormErrorBoundary formName="Inspection Form">
        <div className="space-y-6">
          <FormSection title="Basic Information">
            <DynamicComboBox
              labelTitle="Survey Section"
              data={surveySectionOptions}
              name="surveySection"
              control={control}
              errors={errors}
              rules={{ validate: (value) => value.id !== '' || 'Survey section is required' }}
            />
            <div className="flex items-end justify-between gap-2">
              <DynamicComboBox
                labelTitle="Element"
                data={elementOptions}
                name="element"
                control={control}
                errors={errors}
                onCreateNew={() => {
                  drawer.openDrawer({
                    id: surveyId + '/element',
                    title: 'Create a new element',
                    description: 'Create a new element for any survey',
                    content: <ElementDataForm />,
                  });
                }}
                rules={{ validate: (value) => value.id !== '' || 'Element is required' }}
              />
              <Button
                className="flex-none"
                variant="outline"
                disabled={!element.id}
                onClick={(e) => {
                  e.preventDefault();
                  drawer.openDrawer({
                    id: surveyId + '/element',
                    title: `Edit Element - ${element.name}`,
                    description: `Edit the ${element.name} element for survey`,
                    content: (
                      <ElementForm
                        surveyId={surveyId}
                        sectionId={surveySection.id}
                        elementId={element.id}
                      />
                    ),
                  });
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </FormSection>

          <FormSection title="Component Details">
            <div className="flex items-end justify-between gap-2">
              <DynamicComboBox
                labelTitle="Component"
                data={componentOptions}
                name="component"
                control={control}
                errors={errors}
                onCreateNew={() => {
                  drawer.openDrawer({
                    id: surveyId + '/local-component',
                    title: 'Create a new component (survey only)',
                    description: 'This component will be saved only within this survey.',
                    content: (
                      <LocalComponentNamePrompt
                        onCreate={async (name) => {
                          const newId = `${ID_PREFIX.instance}${uuidv4()}`;
                          const defId = `localdef_${uuidv4()}`;
                          const current = getValues();
                          try {
                            await surveyStore.update(surveyId, (draft) => {
                              const elementId = current.element?.id || element.id;
                              const sectionId =
                                current.surveySection?.id ||
                                surveySection?.id ||
                                elements.find((e: any) => e.id === elementId)?.sectionId;
                              if (!elementId || !sectionId) return;
                              // Create a local definition for reuse
                              addOrUpdateLocalComponentDef(draft, sectionId, elementId, {
                                id: defId,
                                name,
                                elementId,
                              });
                              // Create the instance for this inspection
                              const { instanceId } = instantiateLocalComponentDef(
                                draft as any,
                                sectionId,
                                elementId,
                                name,
                                {
                                  inspectionId: current.inspectionId,
                                  nameOverride: current.nameOverride,
                                  useNameOverride: false,
                                  location: current.location,
                                  additionalDescription: current.additionalDescription,
                                  images: current.images || [],
                                  conditions: (current.conditions || []).map((x: any) => ({
                                    id: x.id,
                                    name: x.name,
                                    phrase: x.phrase || '',
                                  })),
                                  ragStatus: current.ragStatus,
                                  costings: (current.costings || []).map((x: any) => ({
                                    cost: x.cost,
                                    description: x.description,
                                  })),
                                },
                              );
                              setValue(
                                'component',
                                { id: instanceId, name },
                                { shouldValidate: true },
                              );
                            });

                            setValue('useNameOverride', false);
                            drawer.closeDrawer();
                            toast.success('Local component created');
                          } catch (e) {
                            console.error(e);
                            toast.error('Failed to create local component');
                          }
                        }}
                      />
                    ),
                  });
                }}
                rules={{ required: 'Component is required' }}
              />
              <Button
                className="flex-none"
                variant="outline"
                disabled={!component.id}
                onClick={(e) => {
                  e.preventDefault();
                  const isLocal =
                    component && component.id && isLocalInstanceId(String(component.id));
                  if (isLocal) {
                    drawer.openDrawer({
                      id: surveyId + '/rename-local-component',
                      title: 'Rename local component',
                      description: 'Update the local component name for this survey',
                      content: (
                        <RenameLocalComponentPrompt
                          initialName={component.name || ''}
                          onRename={async (newName) => {
                            const current = getValues();
                            try {
                              await surveyStore.update(surveyId, (draft) => {
                                addOrUpdateComponent(
                                  draft,
                                  current.surveySection?.id || surveySection.id,
                                  current.element?.id || element.id,
                                  {
                                    id: component.id,
                                    inspectionId: current.inspectionId,
                                    name: newName,
                                    nameOverride: current.nameOverride,
                                    useNameOverride: false,
                                    location: current.location,
                                    additionalDescription: current.additionalDescription,
                                    images: current.images || [],
                                    conditions: (current.conditions || []).map((x: any) => ({
                                      id: x.id,
                                      name: x.name,
                                      phrase: x.phrase || '',
                                    })),
                                    ragStatus: current.ragStatus,
                                    costings: (current.costings || []).map((x: any) => ({
                                      cost: x.cost,
                                      description: x.description,
                                    })),
                                  },
                                );
                              });
                              setValue(
                                'component',
                                { id: component.id, name: newName },
                                { shouldValidate: true },
                              );
                              drawer.closeDrawer();
                              toast.success('Local component renamed');
                            } catch (err) {
                              console.error(err);
                              toast.error('Failed to rename local component');
                            }
                          }}
                        />
                      ),
                    });
                  } else {
                    setValue('useNameOverride', !useNameOverride, { shouldValidate: true });
                  }
                }}
              >
                <PenLine className="h-4 w-4" />
              </Button>
            </div>

            {!isLocalInstanceId(String(component?.id || '')) && useNameOverride && component.id && (
              <Input
                type="text"
                labelTitle="Component Name Override"
                register={() =>
                  register('nameOverride', {
                    required: 'Component name override is required when enabled',
                  })
                }
                errors={errors}
                placeholder="Enter custom component name"
              />
            )}

            <DynamicComboBox
              labelTitle="RAG Status"
              data={RAG_OPTIONS.map((x) => ({
                value: x.value,
                label: x.label,
              }))}
              name="ragStatus"
              control={control}
              errors={errors}
              rules={{ required: 'RAG status is required' }}
            />

            <DynamicComboBox
              labelTitle="Condition"
              data={phrasesOptions}
              name="conditions"
              control={control}
              errors={errors}
              isMulti={true}
              onCreateNew={() => {
                drawer.openDrawer({
                  id: surveyId + '/local-condition',
                  title: 'Create a new condition (survey only)',
                  description: 'This condition will be saved only within this survey.',
                  content: (
                    <LocalConditionPrompt
                      onCreate={async (name, text) => {
                        const defId = `${ID_PREFIX.condDef}${uuidv4()}`;
                        const current = getValues();
                        const next = [
                          ...(Array.isArray(current.conditions) ? current.conditions : []),
                        ];
                        // Append selected condition instance to the form
                        next.push({ id: defId, name, phrase: text, doc: tokensToDoc(text) as any });
                        try {
                          await surveyStore.update(surveyId, (draft) => {
                            // Create local condition definition for reuse
                            const elId = current.element?.id || element.id;
                            const secId =
                              current.surveySection?.id ||
                              surveySection?.id ||
                              elements.find((e: any) => e.id === elId)?.sectionId;
                            if (!elId || !secId) return;
                            addOrUpdateLocalConditionDef(draft, secId, elId, {
                              id: defId,
                              name,
                              text,
                            });
                            // Persist the inspection conditions with the new instance
                            addOrUpdateComponent(draft, secId, elId, {
                              id: current.component?.id || '',
                              inspectionId: current.inspectionId,
                              name: current.component?.name || '',
                              nameOverride: current.nameOverride,
                              useNameOverride: current.useNameOverride,
                              location: current.location,
                              additionalDescription: current.additionalDescription,
                              images: current.images || [],
                              conditions: next.map((x: any) => ({
                                id: x.id,
                                name: x.name,
                                phrase: x.phrase || '',
                              })),
                              ragStatus: current.ragStatus,
                              costings: (current.costings || []).map((x: any) => ({
                                cost: x.cost,
                                description: x.description,
                              })),
                            });
                          });
                          setValue('conditions', next, { shouldValidate: true });
                          drawer.closeDrawer();
                          toast.success('Local condition added');
                        } catch (e) {
                          console.error(e);
                          toast.error('Failed to add condition');
                        }
                      }}
                    />
                  ),
                });
              }}
            />

            {Array.isArray(conditions) && (
              <ConditionsList
                conditions={conditions}
                isUnresolved={(index: number) => {
                  const item = (conditions || [])[index] as any;
                  const doc = (item && item.doc) as JSONContent | undefined;
                  if (!doc) return false; // no doc means no inline tokens to resolve
                  let unresolved = false;
                  const walk = (node?: any) => {
                    if (!node) return;
                    if (node.type === 'inlineSelect') {
                      const v = node.attrs?.value ?? node.attrs?.defaultValue ?? '';
                      if (!v) unresolved = true;
                    }
                    if (Array.isArray(node.content)) node.content.forEach(walk);
                  };
                  walk(doc as any);
                  return unresolved;
                }}
                onEdit={(index: number) => {
                  const current = getValues();
                  const item = current.conditions[index];
                  const startValue = (item as any).doc
                    ? docToTokens((item as any).doc)
                    : item.phrase || '';
                  drawer.openDrawer({
                    id: surveyId + '/edit-condition-' + index,
                    title: `Edit Condition – ${item.name}`,
                    description: 'Choose options via dropdowns or edit text as needed.',
                    content: (
                      <div className="p-2">
                        <InlineTemplateComposer
                          value={startValue}
                          initialDoc={(item as any).doc}
                          onChange={() => {}}
                          onDocChange={(doc) => {
                            const next = [...getValues().conditions];
                            (next[index] as any).doc = doc as any;
                            (next[index] as any).phrase = resolveDocToText(doc as any);
                            setValue('conditions', next, {
                              shouldValidate: true,
                              shouldDirty: true,
                            });
                          }}
                          visualModeActions={[]}
                          viewOnly={true}
                        />
                        <div className="mt-4 flex justify-end">
                          <Button
                            type="button"
                            onClick={async () => {
                              try {
                                await saveData(getValues(), { auto: false });
                              } catch {}
                            }}
                          >
                            Done
                          </Button>
                        </div>
                      </div>
                    ),
                  });
                }}
                onMoveUp={(index: number) => {
                  const list = [...(getValues().conditions || [])];
                  if (index <= 0) return;
                  const tmp = list[index - 1];
                  list[index - 1] = list[index];
                  list[index] = tmp;
                  setValue('conditions', list, { shouldValidate: true, shouldDirty: true });
                }}
                onMoveDown={(index: number) => {
                  const list = [...(getValues().conditions || [])];
                  if (index >= list.length - 1) return;
                  const tmp = list[index + 1];
                  list[index + 1] = list[index];
                  list[index] = tmp;
                  setValue('conditions', list, { shouldValidate: true, shouldDirty: true });
                }}
                onRemove={(index: number) => {
                  const list = [...(getValues().conditions || [])];
                  list.splice(index, 1);
                  setValue('conditions', list, { shouldValidate: true, shouldDirty: true });
                }}
              />
            )}

            <TextAreaInput
              labelTitle="Additional Comments"
              register={() => register('additionalDescription')}
              placeholder="Enter component description"
              errors={errors}
            />
          </FormSection>
          {level === '3' && (
            <FormSection title="Costings">
              <CostingsFieldArray />
            </FormSection>
          )}
          <LastSavedIndicatorWithUploads
            status={saveStatus}
            isUploading={isUploading}
            lastSavedAt={lastSavedAt}
            className="justify-center text-sm"
          />
          {Array.isArray(conditions) &&
            conditions.length > 0 &&
            (() => {
              const unresolvedCount = conditions.reduce((acc, _c, i) => {
                const item = (conditions || [])[i] as any;
                const doc = item?.doc as JSONContent | undefined;
                if (!doc) return acc + 1;
                let unresolved = false;
                const walk = (node?: any) => {
                  if (!node) return;
                  if (node.type === 'inlineSelect') {
                    const v = node.attrs?.value ?? node.attrs?.defaultValue ?? '';
                    if (!v) unresolved = true;
                  }
                  if (Array.isArray(node.content)) node.content.forEach(walk);
                };
                walk(doc as any);
                return acc + (unresolved ? 1 : 0);
              }, 0);
              return unresolvedCount > 0 ? (
                <div className="rounded-md border border-red-400 bg-red-50 p-2 text-xs text-red-700">
                  {unresolvedCount} condition{unresolvedCount === 1 ? '' : 's'} need selection(s)
                </div>
              ) : null;
            })()}
        </div>
      </FormErrorBoundary>
    </FormProvider>
  );
}
