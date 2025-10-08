import { v4 as uuidv4 } from 'uuid';
import { BuildingSurveyFormData, Inspection } from '@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema';
import { addOrUpdateComponent } from '@/app/home/surveys/building-survey-reports/Survey';
import { ID_PREFIX } from '../constants/localIds';

export function instantiateLocalComponentDef(
  survey: BuildingSurveyFormData,
  sectionId: string,
  elementId: string,
  name: string,
  base: Partial<Inspection> & { inspectionId: string }
): { survey: BuildingSurveyFormData; instanceId: string } {
  const instanceId = `${ID_PREFIX.instance}${uuidv4()}`;
  const comp: any = {
    id: instanceId,
    inspectionId: base.inspectionId,
    name,
    nameOverride: base.nameOverride,
    useNameOverride: base.useNameOverride ?? false,
    location: base.location || '',
    additionalDescription: base.additionalDescription || '',
    images: base.images || [],
    conditions: (base.conditions || []).map((x: any) => ({ id: x.id, name: x.name, phrase: x.phrase || '' })),
    ragStatus: base.ragStatus || 'N/I',
    costings: base.costings || [],
  };
  addOrUpdateComponent(survey, sectionId, elementId, comp);
  return { survey, instanceId };
}

