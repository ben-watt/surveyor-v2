import {
  Component,
  db,
  Survey as DexieSurvey,
  Element as BuildingSurveyElement,
  SyncStatus,
  CreateDexieHooks,
  Phrase,
  Location,
  Section,
} from "./Dexie";
import client from "./AmplifyDataClient";
import { Schema } from "@/amplify/data/resource";
import { BuildingSurveyFormData } from "@/app/app/surveys/building-survey-reports/BuildingSurveyReportSchema";
import { Draft } from "immer";

const mapToSurvey = (data: any): DexieSurvey => ({
  id: data.id,
  syncStatus: SyncStatus.Synced,
  content: data.content,
  updatedAt: data.updatedAt,
  createdAt: data.createdAt,
});

type UpdateSurvey = Partial<DexieSurvey> & { id: string };
type CreateSurvey = Omit<DexieSurvey, "updatedAt" | "createdAt">;

// Create a wrapper for the survey store
const createSurveyStore = () => {
  const store = CreateDexieHooks<DexieSurvey, CreateSurvey, UpdateSurvey>(
    db,
    "surveys",
    {
      list: async () => {
        const response = await client.models.Surveys.list();
        return response.data.map(mapToSurvey);
      },
      create: async (data) => {
        const response = await client.models.Surveys.create(data);
        return mapToSurvey(response.data);
      },
      update: async (data) => {
        const response = await client.models.Surveys.update(data);
        return mapToSurvey(response.data);
      },
      delete: async (id) => {
        await client.models.Surveys.delete({ id });
      },
    }
  );

  return {
    ...store,
    useGet: (id: string): [boolean, BuildingSurveyFormData | null] => {
      const [isHydrated, survey] = store.useGet(id);
      if (!isHydrated || !survey) return [isHydrated, null];
      return [isHydrated, survey.content as BuildingSurveyFormData];
    },
    useList: (): [boolean, BuildingSurveyFormData[]] => {
      const [isHydrated, surveys] = store.useList();
      if (!isHydrated) return [isHydrated, []];
      return [isHydrated, surveys.map(s => s.content as BuildingSurveyFormData)];
    },
    useRawList: (): [boolean, DexieSurvey[]] => {
      const [isHydrated, surveys] = store.useList();
      return [isHydrated, surveys];
    },
    update: async (id: string, updater: (survey: Draft<BuildingSurveyFormData>) => void) => {
      return store.update(id, (dexieSurvey: Draft<DexieSurvey>) => {
        updater(dexieSurvey.content as BuildingSurveyFormData);
      });
    }
  };
};

export const surveyStore = createSurveyStore();

const mapToComponent = (data: any): Component => ({
  id: data.id,
  syncStatus: SyncStatus.Synced,
  updatedAt: data.updatedAt,
  createdAt: data.createdAt,
  name: data.name,
  materials: data.materials,
  elementId: data.elementId,
});

export type UpdateComponent = Partial<Component> & { id: string };
export type CreateComponent = Omit<Component, "updatedAt" | "createdAt">;

export const componentStore = CreateDexieHooks<
  Component,
  CreateComponent,
  UpdateComponent
>(db, "components", {
  list: async () => {
    const response = await client.models.Components.list();
    return response.data.map(mapToComponent);
  },
  create: async (data) => {
    const response = await client.models.Components.create(data);
    return mapToComponent(response.data);
  },
  update: async (data) => {
    const response = await client.models.Components.update(data);
    return mapToComponent(response.data);
  },
  delete: async (id) => {
    await client.models.Components.delete({ id });
  },
});

const mapToElement = (data: any): BuildingSurveyElement => ({
  id: data.id,
  syncStatus: SyncStatus.Synced,
  updatedAt: data.updatedAt,
  createdAt: data.createdAt,
  name: data.name,
  order: data.order,
  sectionId: data.sectionId,
  description: data.description,
});

export type UpdateElement = Partial<BuildingSurveyElement> & { id: string };
export type CreateElement = Omit<
  BuildingSurveyElement,
  "updatedAt" | "createdAt"
>;

export const elementStore = CreateDexieHooks<
  BuildingSurveyElement,
  CreateElement,
  UpdateElement
>(db, "elements", {
  list: async () => {
    const response = await client.models.Elements.list();
    return response.data.map(mapToElement);
  },
  create: async (data) => {
    const response = await client.models.Elements.create(data);
    return mapToElement(response.data);
  },
  update: async (data) => {
    const response = await client.models.Elements.update(data);
    return mapToElement(response.data);
  },
  delete: async (id) => {
    await client.models.Elements.delete({ id });
  },
});

const mapToSection = (data: any): Section => ({
  id: data.id,
  syncStatus: SyncStatus.Synced,
  updatedAt: data.updatedAt,
  createdAt: data.createdAt,
  name: data.name,
  order: data.order || 0,
});

export type UpdateSection = Partial<Section> & { id: string };
export type CreateSection = Omit<Section, "updatedAt" | "createdAt">;

export const sectionStore = CreateDexieHooks<Section, CreateSection, UpdateSection>(
  db,
  "sections",
  {
    list: async () => {
      const response = await client.models.Sections.list();
      return response.data.map(mapToSection);
    },
    create: async (data) => {
      const response = await client.models.Sections.create(data);
      return mapToSection(response.data);
    },
    update: async (data) => {
      const response = await client.models.Sections.update(data);
      return mapToSection(response.data);
    },
    delete: async (id) => {
      await client.models.Sections.delete({ id });
    },
  }
);

const mapToPhrase = (data: any): Phrase => ({
  id: data.id,
  syncStatus: SyncStatus.Synced,
  updatedAt: data.updatedAt,
  createdAt: data.createdAt,
  name: data.name,
  type: data.type,
  associatedMaterialIds: data.associatedMaterialIds,
  associatedElementIds: data.associatedElementIds,
  associatedComponentIds: data.associatedComponentIds,
  phrase: data.phrase,
  owner: data.owner,
});

export type UpdatePhrase = Partial<Phrase> & { id: string };
export type CreatePhrase = Omit<Phrase, "updatedAt" | "createdAt">;

export const phraseStore = CreateDexieHooks<Phrase, CreatePhrase, UpdatePhrase>(db, "phrases", {
  list: async () => {
    const response = await client.models.Phrases.list();
    return response.data.map(mapToPhrase);
  },
  create: async (data) => {
    const response = await client.models.Phrases.create(data);
    return mapToPhrase(response.data);
  },
  update: async (data) => {
    const response = await client.models.Phrases.update(data);
    return mapToPhrase(response.data);
  },
  delete: async (id) => {
    await client.models.Phrases.delete({ id });
  },
});

const mapToLocation = (data: any): Location => ({
  id: data.id,
  syncStatus: SyncStatus.Synced,
  updatedAt: data.updatedAt,
  createdAt: data.createdAt,
  name: data.name,
  parentId: data.parentId,
});

export type CreateLocation = Schema['Locations']['createType'];
export type UpdateLocation = Schema['Locations']['updateType'];

export const locationStore = CreateDexieHooks<Location, CreateLocation, UpdateLocation>(
  db,
  "locations",
  {
    list: async () => {
      const response = await client.models.Locations.list();
      if(response.errors) {
        throw new Error(response.errors.map(e => e.message).join(", "));
      }
      return response.data.map(mapToLocation);
    },
    create: async (data) => {
      const response = await client.models.Locations.create(data);
      if(response.errors) {
        throw new Error(response.errors.map(e => e.message).join(", "));
      }
      return mapToLocation(response.data);
    },
    update: async (data) => {
      const response = await client.models.Locations.update(data);
      if(response.errors) {
        throw new Error(response.errors.map(e => e.message).join(", "));
      }
      return mapToLocation(response.data);
    },
    delete: async (id) => {
      const response = await client.models.Locations.delete({ id });
      if(response.errors) {
        throw new Error(response.errors.map(e => e.message).join(", "));
      }
    },
  }
);

// Add utility method for building location tree
export type LocationTree = {
  value: string;
  label: string;
  children: LocationTree[];
}

export const buildLocationTree = (items: Location[], parentId?: string): LocationTree[] => {
  return items
    .filter(item => item.parentId === parentId || (!parentId && item.parentId == null))
    .map(item => ({
      value: item.id,
      label: item.name,
      children: buildLocationTree(items, item.id)
    }));
};
