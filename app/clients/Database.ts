import {
  Component,
  db,
  Survey,
  Element as BuildingSurveyElement,
  SyncStatus,
  CreateDexieHooks,
  Phrase,
  Location,
} from "./Dexie";
import client from "./AmplifyDataClient";

const mapToSurvey = (data: any): Survey => ({
  id: data.id,
  syncStatus: SyncStatus.Synced,
  content: data.content,
  updatedAt: data.updatedAt,
  createdAt: data.createdAt,
});

type UpdateSurvey = Partial<Survey> & { id: string };
type CreateSurvey = Omit<Survey, "updatedAt" | "createdAt">;

export const surveyStore = CreateDexieHooks<Survey, CreateSurvey, UpdateSurvey>(
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
  section: data.section,
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

export type UpdateLocation = Partial<Location> & { id: string };
export type CreateLocation = Omit<Location, "updatedAt" | "createdAt">;

export const locationStore = CreateDexieHooks<Location, CreateLocation, UpdateLocation>(
  db,
  "locations",
  {
    list: async () => {
      const response = await client.models.Locations.list();
      return response.data.map(mapToLocation);
    },
    create: async (data) => {
      const response = await client.models.Locations.create(data);
      return mapToLocation(response.data);
    },
    update: async (data) => {
      const response = await client.models.Locations.update(data);
      return mapToLocation(response.data);
    },
    delete: async (id) => {
      await client.models.Locations.delete({ id });
    },
  }
);

// Add utility method for building location tree
export const buildLocationTree = (items: Location[], parentId?: string): any[] => {
  return items
    .filter(item => item.parentId === parentId || (!parentId && item.parentId == null))
    .map(item => ({
      value: item.id,
      label: item.name,
      children: buildLocationTree(items, item.id)
    }));
};
