import React, { useEffect, useMemo } from 'react';

import {
  Input as InputT,
  BuildingSurveyFormData as BuildingSurveyForm,
  FormStatus,
  SurveySection,
} from './BuildingSurveyReportSchema';

import { useForm, FormProvider } from 'react-hook-form';
import InputError from '@/app/home/components/InputError';
import { useRouter } from 'next/navigation';
import { surveyStore, sectionStore, elementStore } from '@/app/home/clients/Database';
import { Section, Element } from '@/app/home/clients/Dexie';
import { Ok, Result } from 'ts-results';

import { useAsyncError } from '@/app/home/hooks/useAsyncError';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { useUserAttributes } from '../../utils/useUser';
import { SurveyHeader } from '../components/SurveyHeader';
import { SurveyProgressStepper } from '../components/SurveyProgressStepper';
import { EnhancedFormSection } from '../components/EnhancedFormSection';
import { getSectionStatusesFromSurvey } from '../utils/progress';

interface BuildingSurveyFormProps {
  id: string;
}

const shouldBeTrueCheckBox = (label: string): InputT<boolean> => ({
  type: 'checkbox',
  placeholder: '',
  value: false,
  label: label,
  required: true,
  order: 0,
});

const createDefaultFormValues = (
  id: string,
  dbSections: Section[],
  dbElements: Element[],
  user: { sub?: string; name?: string; email?: string; picture?: string },
): Result<BuildingSurveyForm, Error> => {
  // Sort sections by order
  const orderedSections = [...dbSections].sort((a, b) => (a.order || 0) - (b.order || 0));

  // Sort elements by order
  const orderedElements = [...dbElements].sort((a, b) => (a.order || 0) - (b.order || 0));

  // Create sections array with pre-populated elements
  const formSections: SurveySection[] = orderedSections.map((section) => ({
    id: section.id,
    name: section.name,
    elementSections: orderedElements
      .filter((element) => element.sectionId === section.id)
      .map((element) => ({
        id: element.id,
        name: element.name,
        isPartOfSurvey: true,
        description: element.description || '',
        components: [],
        images: [],
      })),
  }));

  return Ok<BuildingSurveyForm>({
    id: id,
    status: 'draft',
    owner: {
      id: user.sub || '',
      name: user.name || '',
      email: user.email || '',
      signaturePath: user.picture ? [user.picture] : [],
    },
    reportDetails: {
      level: '2',
      reference: '',
      address: {
        formatted: '',
        line1: '',
        line2: '',
        line3: '',
        city: '',
        county: '',
        postcode: '',
        location: {
          lat: 0,
          lng: 0,
        },
      },
      clientName: '',
      reportDate: new Date(),
      inspectionDate: new Date(),
      weather: '',
      orientation: '',

      situation: '',
      moneyShot: [],
      frontElevationImagesUri: [],
    },
    propertyDescription: {
      propertyType: '',
      constructionDetails: '',
      yearOfConstruction: '',
      yearOfExtensions: '',
      yearOfConversions: '',
      grounds: '',
      services: '',
      otherServices: '',
      energyRating: '',
      numberOfBedrooms: 0,
      numberOfBathrooms: 0,
      tenure: 'Unknown',
    },
    sections: formSections,
    checklist: {
      items: [
        shouldBeTrueCheckBox('Have you checked for asbestos?'),
        shouldBeTrueCheckBox('Have you lifted manhole covers to drains?'),
        shouldBeTrueCheckBox('Have you checked for Japanese Knotweed?'),
        shouldBeTrueCheckBox(
          'Have you checked external ground levels in relation to DPCs / Air Vents?',
        ),
        shouldBeTrueCheckBox('Have you located services, elecs, gas, water, etc...?'),
        shouldBeTrueCheckBox('Have you checked if chimney breasts been removed internally?'),
        shouldBeTrueCheckBox(
          'Have you checked the locations and severity of all cracks been logged?',
        ),
        shouldBeTrueCheckBox(
          'Have you checked if there are any mature trees in close proximity to the building?',
        ),
        shouldBeTrueCheckBox('I confirm that the information provided is accurate'),
      ],
    },
  });
};

export default function ReportWrapper({ id }: BuildingSurveyFormProps) {
  const [isHydrated, report] = surveyStore.useGet(id);
  const [sectionsHydrated, dbSections] = sectionStore.useList();
  const [elementsHydrated, dbElements] = elementStore.useList();
  const [isUserHydrated, user] = useUserAttributes();
  const router = useRouter();
  const throwError = useAsyncError();

  useEffect(() => {
    async function createNewForm() {
      console.log('[ReportWrapper] createNewForm');
      const newId = uuidv4();

      try {
        if (!sectionsHydrated || !elementsHydrated) {
          console.log('[ReportWrapper] waiting for data to hydrate');
          return;
        }

        if (!isUserHydrated || !user) {
          console.log('[ReportWrapper] waiting for user to hydrate');
          return;
        }

        console.debug('[ReportWrapper] user', user);

        if (!user.sub || !user.name || !user.email || !user.picture) {
          toast(
            "Your profile is missing some information. Please check you've added all your profile information before creating a survey.",
          );
          router.push('/home/profile');
          return;
        }

        const formResult = createDefaultFormValues(newId, dbSections, dbElements, user);

        if (formResult.ok) {
          await surveyStore.add({
            id: newId,
            content: formResult.val,
          });

          router.replace(`/home/surveys/${newId}`);
        } else {
          throwError(formResult.val);
        }
      } catch (error) {
        throwError(error instanceof Error ? error : new Error('Unknown error occurred'));
      }
    }

    console.log('[ReportWrapper] isHydrated', isHydrated);
    console.log('[ReportWrapper] report', report);
    if (isHydrated && !report && id === 'create') {
      createNewForm();
    }
  }, [
    id,
    isHydrated,
    report,
    router,
    throwError,
    sectionsHydrated,
    elementsHydrated,
    dbSections,
    dbElements,
    isUserHydrated,
    user,
  ]);

  if (!sectionsHydrated || !elementsHydrated) {
    return <div>Loading sections and elements...</div>;
  }

  return <>{report ? <Report initFormValues={report} /> : <div>Loading...</div>}</>;
}

interface ReportProps {
  initFormValues: BuildingSurveyForm;
}

function Report({ initFormValues }: ReportProps) {
  const methods = useForm<BuildingSurveyForm>({
    defaultValues: initFormValues,
    mode: 'onChange', // Enable validation on change
  });

  const { handleSubmit, formState, watch, getValues, trigger } = methods;

  const router = useRouter();

  const saveData = async (data: BuildingSurveyForm, { auto = false } = {}) => {
    console.log('[BuildingSurveyForm] saveData', { data, auto });

    try {
      await surveyStore.update(initFormValues.id, (survey) => {
        // Persist any changes already made elsewhere; no forced status mutation
        Object.assign(survey, data);
      });

      if (!auto) {
        toast.success('Saved');
      }
    } catch (error) {
      console.error('[BuildingSurveyForm] Save failed', error);

      if (!auto) {
        toast.error('Failed to save');
      }

      throw error; // Re-throw for autosave error handling
    }
  };

  const saveAsDraft = async () => {
    console.log('[BuildingSurveyForm] saveAsDraft', methods.getValues());
    toast.success('Saved As Draft');
    router.push('/home/surveys');
    router.refresh();
  };

  const isFormValid = () => {
    const defaultValues = formState.defaultValues;
    if (!defaultValues) return false;

    // For now, allow submission regardless of completion status
    // TODO: Implement reactive validation here using the new hooks
    return true;
  };

  const onSubmit = async () => {
    console.log('[BuildingSurveyForm] onSubmit', methods.getValues());
    const currentData = getValues();
    await saveData(currentData, { auto: false });
  };

  const onError = (errors: any) => {
    console.error(errors);
  };

  // Compute section statuses via shared helper
  const sectionStatuses = useMemo(
    () => getSectionStatusesFromSurvey(initFormValues),
    [initFormValues],
  );

  const getSectionStatus = (sectionTitle: string): FormStatus => {
    const statusResult = sectionStatuses[sectionTitle as keyof typeof sectionStatuses];
    return statusResult?.status || FormStatus.Unknown;
  };

  const formSections = [
    {
      title: 'Report Details',
      href: `/home/surveys/${initFormValues.id}/report-details`,
      status: getSectionStatus('Report Details'),
    },
    {
      title: 'Property Description',
      href: `/home/surveys/${initFormValues.id}/property-description`,
      status: getSectionStatus('Property Description'),
    },
    {
      title: 'Property Condition',
      href: `/home/surveys/${initFormValues.id}/condition`,
      status: getSectionStatus('Property Condition'),
    },
    {
      title: 'Checklist',
      href: `/home/surveys/${initFormValues.id}/checklist`,
      status: getSectionStatus('Checklist'),
    },
  ];

  return (
    <div className="space-y-6">
      <FormProvider {...methods}>
        {/* Survey Header */}
        <SurveyHeader survey={initFormValues} />

        {/* Progress Stepper */}
        <SurveyProgressStepper sections={formSections} />

        {/* Form Sections */}
        <div className="space-y-4">
          {formSections.map((section, index) => (
            <EnhancedFormSection
              key={index}
              title={section.title}
              href={section.href}
              status={getSectionStatus(section.title)}
            />
          ))}
        </div>

        {/* Error Display */}
        {Object.values(formState.errors).length > 0 && (
          <div className="mt-4">
            <InputError message="Please fix the errors above before saving" />
          </div>
        )}
      </FormProvider>
    </div>
  );
}
