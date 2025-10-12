import { useMemo } from 'react';
import { elementStore, surveyStore } from '@/app/home/clients/Database';
import {
  BuildingSurveyFormData,
  LocalComponentDef,
  LocalConditionDef,
} from '@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema';
import {
  addOrUpdateLocalComponentDef,
  addOrUpdateLocalConditionDef,
  getLocalComponentDefs,
  getLocalConditionDefs,
} from '@/app/home/surveys/building-survey-reports/Survey';
import { ID_PREFIX } from '../constants/localIds';
import { v4 as uuidv4 } from 'uuid';

type UseLocalDefsResult = {
  sectionId?: string;
  componentDefs: LocalComponentDef[];
  conditionDefs: LocalConditionDef[];
  addComponentDef: (
    surveyId: string,
    elementId: string,
    name: string,
  ) => Promise<LocalComponentDef | null>;
  addConditionDef: (
    surveyId: string,
    elementId: string,
    name: string,
    text: string,
  ) => Promise<LocalConditionDef | null>;
};

export function useLocalDefs(
  survey: BuildingSurveyFormData | null,
  elements: Array<{ id: string; sectionId: string }>,
  elementId?: string,
  surveySectionId?: string,
): UseLocalDefsResult {
  const sectionId = useMemo(() => {
    if (surveySectionId) return surveySectionId;
    if (!elementId) return undefined;
    const el = elements.find((e) => e.id === elementId);
    return el?.sectionId;
  }, [surveySectionId, elements, elementId]);

  const componentDefs = useMemo(() => {
    if (!survey || !elementId || !sectionId) return [];
    return getLocalComponentDefs(survey, sectionId, elementId);
  }, [survey, sectionId, elementId]);

  const conditionDefs = useMemo(() => {
    if (!survey || !elementId || !sectionId) return [];
    return getLocalConditionDefs(survey, sectionId, elementId);
  }, [survey, sectionId, elementId]);

  async function addComponentDef(surveyId: string, elId: string, name: string) {
    const secId = elements.find((e) => e.id === elId)?.sectionId || sectionId;
    if (!secId) return null;
    const def: LocalComponentDef = { id: `${ID_PREFIX.compDef}${uuidv4()}`, name, elementId: elId };
    await surveyStore.update(surveyId, (draft) => {
      addOrUpdateLocalComponentDef(draft as any, secId, elId, def);
    });
    return def;
  }

  async function addConditionDef(surveyId: string, elId: string, name: string, text: string) {
    const secId = elements.find((e) => e.id === elId)?.sectionId || sectionId;
    if (!secId) return null;
    const def: LocalConditionDef = { id: `${ID_PREFIX.condDef}${uuidv4()}`, name, text };
    await surveyStore.update(surveyId, (draft) => {
      addOrUpdateLocalConditionDef(draft as any, secId, elId, def);
    });
    return def;
  }

  return { sectionId, componentDefs, conditionDefs, addComponentDef, addConditionDef };
}
