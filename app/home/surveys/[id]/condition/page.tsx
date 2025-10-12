'use client';

import { FormSection } from '@/app/home/components/FormSection';
import { SurveySection } from '../../building-survey-reports/BuildingSurveyReportSchema';
import { surveyStore } from '@/app/home/clients/Database';
import { ClipboardList, Search } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DynamicDrawer, useDynamicDrawer } from '@/app/home/components/Drawer';
import InspectionForm from './InspectionForm';
import { ElementSectionComponent } from './ElementSectionComponent';

const ConditionPage = () => {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [isHydrated, survey] = surveyStore.useGet(id);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleClose = () => {
    setIsOpen(false);
    router.back();
  };

  useEffect(() => {
    if (isHydrated) {
      setIsOpen(true);
    }
  }, [isHydrated]);

  return (
    <div>
      {!isHydrated && <div>Loading...</div>}
      {isHydrated && survey && (
        <DynamicDrawer
          id={id + '-condition'}
          isOpen={isOpen}
          handleClose={handleClose}
          title="Property Condition"
          content={<ConditionForm id={id} initValues={survey.sections} />}
        />
      )}
    </div>
  );
};

interface ConditionFormProps {
  id: string;
  initValues: SurveySection[];
}

const ConditionForm = ({ id, initValues }: ConditionFormProps) => {
  const { openDrawer } = useDynamicDrawer();
  const [searchTerm, setSearchTerm] = useState('');

  const onStartNewInspection = () => {
    openDrawer({
      id: `${id}-condition-inspect`,
      title: 'Inspect Component',
      description: 'Inspect the component',
      content: <InspectionForm surveyId={id} />,
    });
  };

  if (initValues.length == 0) {
    return (
      <div className="p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <ClipboardList className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="mb-2 text-2xl font-semibold">No Inspections Yet</h2>
        <p className="mb-6 text-muted-foreground">
          You haven't inspected any components in this building.
        </p>
        <Button onClick={onStartNewInspection}>Start New Inspection</Button>
      </div>
    );
  }

  const filteredSections = initValues
    // Filter out sections with missing/empty names
    .filter((section) => (section?.name ?? '').trim().length > 0)
    .map((section) => ({
      ...section,
      elementSections: section.elementSections.filter((element) =>
        (element.name ?? '').toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    }));

  return (
    <div>
      <div className="relative mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search elements..."
            className="w-full rounded-md border bg-background p-2 pl-9 transition-colors hover:bg-accent/50 focus:bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-muted-foreground">
            <Search className="h-5 w-5" />
          </div>
        </div>
      </div>
      {filteredSections.map((section, sectionIndex) => (
        <FormSection
          key={section.id}
          title={section.name ?? 'Untitled Section'}
          collapsable
          defaultCollapsed={!(searchTerm.length > 0)}
        >
          {section.elementSections.map((elementSection) => (
            <ElementSectionComponent
              key={elementSection.id}
              elementSection={elementSection}
              sectionId={section.id}
              surveyId={id}
            />
          ))}
          {section.elementSections.length == 0 && (
            <div className="p-6 text-center">
              <p className="mb-6 text-muted-foreground">No elements found for this section.</p>
            </div>
          )}
        </FormSection>
      ))}
      <div className="space-y-2">
        <Button className="w-full" variant="default" onClick={onStartNewInspection}>
          Inspect Component
        </Button>
      </div>
    </div>
  );
};

export default ConditionPage;
