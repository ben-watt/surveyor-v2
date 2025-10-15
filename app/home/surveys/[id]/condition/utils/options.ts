import { resolveDocToText } from '@/lib/conditions/resolver';
import { stripInlineSelectChoices } from '@/lib/conditions/interop';
import { ID_PREFIX } from '@/app/home/surveys/constants/localIds';
import { FormPhrase } from '../types';

export function buildComponentOptions(
  components: any[],
  elementId: string,
  component: any,
  derivedSectionId: string | undefined,
  componentDefs: any[],
) {
  const globalOptions = components
    .filter((c) => c.elementId === elementId)
    .map((c) => ({ value: { id: c.id, name: c.name }, label: c.name }));

  const localDefOptions = (() => {
    if (!elementId || !derivedSectionId) return [] as any[];
    const defs = componentDefs;
    return defs.map((d: any) => ({
      value: { localDefId: d.id, name: d.name },
      label: `${d.name} - (survey only)`,
    }));
  })();

  const isLocalSelected =
    component &&
    component.id &&
    (!components.some((gc) => gc.id === component.id) || String(component.id).startsWith(ID_PREFIX.instance));

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
}

export function buildPhrasesOptions(
  phrases: any[],
  level: string,
  component: any,
  components: any[],
  conditions: any[],
  elementId: string,
  conditionDefs: any[],
  derivedSectionId: string | undefined,
): { value: FormPhrase; label: string }[] {
  const isLocalSelected =
    component &&
    component.id &&
    (!components.some((gc) => gc.id === component.id) || String(component.id).startsWith(ID_PREFIX.instance));

  const globals = (phrases || [])
    .filter((p) => String(p.type).toLowerCase() === 'condition')
    .filter((p) => (isLocalSelected ? true : p.associatedComponentIds.includes(component.id)))
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((p) => {
      const docL3 = (p as any).phraseDoc;
      const docL2 = (p as any).phraseLevel2Doc;
      const isLevel2 = level === '2';
      const chosenDoc = isLevel2 ? docL2 : docL3;
      const phraseText = isLevel2 ? p.phraseLevel2 || 'No level 2 text' : p.phrase || 'No level 3 text';
      return {
        value: {
          id: p.id,
          name: p.name,
          phrase: phraseText,
          doc: stripInlineSelectChoices(chosenDoc) || undefined,
        } as FormPhrase,
        label: p.name,
      };
    });

  const localDefs = (() => {
    if (!elementId || !derivedSectionId) return [] as { value: FormPhrase; label: string }[];
    const defs = conditionDefs;
    return defs.map((d: any) => ({
      value: { id: d.id, name: d.name, phrase: d.text } as FormPhrase,
      label: `${d.name} - (survey only)`,
    }));
  })();

  const current = (Array.isArray(conditions) ? conditions : []).map((c: any) => ({
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
}


