import {
  Component,
  db,
  Survey as DexieSurvey,
  Element as BuildingSurveyElement,
  SyncStatus,
  CreateDexieHooks,
  Phrase,
  Section,
} from "./Dexie";
import client from "./AmplifyDataClient";
import { Schema } from "@/amplify/data/resource";
import { BuildingSurveyFormData } from "@/app/app/surveys/building-survey-reports/BuildingSurveyReportSchema";
import { Draft } from "immer";
import { Ok, Err, Result } from 'ts-results';
import { withTenantId, getCurrentTenantId } from "@/app/app/utils/tenant-utils";
import { getErrorMessage } from "../utils/handleError";

const mapToSurvey = (data: any): DexieSurvey => ({
  id: data.id,
  syncStatus: SyncStatus.Synced,
  content: JSON.parse(data.content),
  updatedAt: data.updatedAt,
  createdAt: data.createdAt,
  tenantId: data.tenantId,
});

type UpdateSurvey = Partial<DexieSurvey> & { id: string };
type CreateSurvey = Schema['Surveys']['createType'];

// Create a wrapper for the survey store
const createSurveyStore = () => {
  const store = CreateDexieHooks<DexieSurvey, CreateSurvey, UpdateSurvey>(
    db,
    "surveys",
    {
      list: async (): Promise<Result<DexieSurvey[], Error>> => {
        const response = await client.models.Surveys.list();
        if (response.errors) {
          return Err(new Error(response.errors.map(e => e.message).join(", ")));
        }
        return Ok(response.data.map(mapToSurvey));
      },
      create: async (data): Promise<Result<DexieSurvey, Error>> => {
        // Add tenant ID to new survey
        const baseData = {
          id: data.id,
          syncStatus: SyncStatus.Synced,
          content: JSON.stringify(data.content),
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
        const serverData = await withTenantId(baseData);

        console.log("[createSurveyStore] Creating survey", serverData);
        const response = await client.models.Surveys.create(serverData);
        if (response.errors) {
          return Err(new Error(response.errors.map(e => e.message).join(", ")));
        }
        return Ok(mapToSurvey(response.data));
      },
      update: async (data): Promise<Result<DexieSurvey, Error>> => {
        // Add tenant ID to update
        const baseData = {
          id: data.id,
          syncStatus: SyncStatus.Synced,
          content: JSON.stringify(data.content),
        };
        const serverData = await withTenantId(baseData);

        console.log("[createSurveyStore] Updating survey", serverData); 
        const response = await client.models.Surveys.update(serverData);
        if (response.errors) {
          return Err(new Error(response.errors.map(e => e.message).join(", ")));
        }
        return Ok(mapToSurvey(response.data));
      },
      delete: async (id): Promise<Result<string, Error>> => {
        const tenantId = await getCurrentTenantId();
        const response = await client.models.Surveys.delete({ id, tenantId: tenantId || "" });
        if (response.errors) {
          return Err(new Error(response.errors.map(e => e.message).join(", ")));
        }
        return Ok(id);
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
  tenantId: data.tenantId,
});

export type UpdateComponent = Partial<Component> & { id: string };
export type CreateComponent = Schema['Components']['createType'];

export const componentStore = CreateDexieHooks<
  Component,
  CreateComponent,
  UpdateComponent
>(db, "components", {
  list: async (): Promise<Result<Component[], Error>> => {
    const response = await client.models.Components.list();
    if (response.errors) {
      return Err(new Error(response.errors.map(e => e.message).join(", ")));
    }
    return Ok(response.data.map(mapToComponent));
  },
  create: async (data): Promise<Result<Component, Error>> => {
    // Add tenant ID to new component
    const serverData = await withTenantId(data);
    const response = await client.models.Components.create(serverData);
    if (response.errors) {
      return Err(new Error(response.errors.map(e => e.message).join(", ")));
    }
    return Ok(mapToComponent(response.data));
  },
  update: async (data): Promise<Result<Component, Error>> => {
    // Add tenant ID to update
    const serverData = await withTenantId(data);
    const response = await client.models.Components.update(serverData);
    if (response.errors) {
      return Err(new Error(response.errors.map(e => e.message).join(", ")));
    }
    return Ok(mapToComponent(response.data));
  },
  delete: async (id): Promise<Result<string, Error>> => {
    const tenantId = await getCurrentTenantId();
    const response = await client.models.Components.delete({ id, tenantId: tenantId || "" });
    if (response.errors) {
      return Err(new Error(response.errors.map(e => e.message).join(", ")));
    }
    return Ok(id);
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
  tenantId: data.tenantId,
});

export type UpdateElement = Partial<BuildingSurveyElement> & { id: string };
export type CreateElement = Schema['Elements']['createType'];

export const elementStore = CreateDexieHooks<
  BuildingSurveyElement,
  CreateElement,
  UpdateElement
>(db, "elements", {
  list: async (): Promise<Result<BuildingSurveyElement[], Error>> => {
    const response = await client.models.Elements.list();
    if (response.errors) {
      return Err(new Error(response.errors.map(e => e.message).join(", ")));
    }
    return Ok(response.data.map(mapToElement));
  },
  create: async (data): Promise<Result<BuildingSurveyElement, Error>> => {
    // Add tenant ID to new element
    const serverData = await withTenantId(data);
    const response = await client.models.Elements.create(serverData);
    if (response.errors) {
      return Err(new Error(response.errors.map(e => e.message).join(", ")));
    }
    return Ok(mapToElement(response.data));
  },
  update: async (data): Promise<Result<BuildingSurveyElement, Error>> => {
    // Add tenant ID to update
    const serverData = await withTenantId(data);
    const response = await client.models.Elements.update(serverData);
    if (response.errors) {
      return Err(new Error(response.errors.map(e => e.message).join(", ")));
    }
    return Ok(mapToElement(response.data));
  },
  delete: async (id): Promise<Result<string, Error>> => {
    const tenantId = await getCurrentTenantId();
    const response = await client.models.Elements.delete({ id, tenantId: tenantId || "" });
    if (response.errors) {
      return Err(new Error(response.errors.map(e => e.message).join(", ")));
    }
    return Ok(id);
  },
});

const mapToSection = (data: any): Section => ({
  id: data.id,
  syncStatus: SyncStatus.Synced,
  updatedAt: data.updatedAt,
  createdAt: data.createdAt,
  name: data.name,
  order: data.order || 0,
  tenantId: data.tenantId,
});

export type UpdateSection = Partial<Section> & { id: string };
export type CreateSection = Schema['Sections']['createType'];

export const sectionStore = CreateDexieHooks<Section, CreateSection, UpdateSection>(
  db,
  "sections",
  {
    list: async (): Promise<Result<Section[], Error>> => {
      const response = await client.models.Sections.list();
      if (response.errors) {
        return Err(new Error(response.errors.map(e => e.message).join(", ")));
      }
      return Ok(response.data.map(mapToSection));
    },
    create: async (data): Promise<Result<Section, Error>> => {
      // Add tenant ID to new section
      const serverData = await withTenantId(data);
      const response = await client.models.Sections.create(serverData);
      if (response.errors) {
        return Err(new Error(response.errors.map(e => e.message).join(", ")));
      }
      console.log("[createSectionStore] Created section", response);
      return Ok(mapToSection(response.data));
    },
    update: async (data): Promise<Result<Section, Error>> => {
      // Add tenant ID to update
      const serverData = await withTenantId(data);
      const response = await client.models.Sections.update(serverData);
      if (response.errors) {
        return Err(new Error(response.errors.map(e => e.message).join(", ")));
      }
      return Ok(mapToSection(response.data));
    },
    delete: async (id): Promise<Result<string, Error>> => {
      const tenantId = await getCurrentTenantId();
      const response = await client.models.Sections.delete({ id, tenantId: tenantId || "" });
      if (response.errors) {
        return Err(new Error(response.errors.map(e => e.message).join(", ")));
      }
      return Ok(id);
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
  tenantId: data.tenantId,
});

export type UpdatePhrase = Partial<Phrase> & { id: string };
export type CreatePhrase = Schema['Phrases']['createType'];

export const phraseStore = CreateDexieHooks<Phrase, CreatePhrase, UpdatePhrase>(db, "phrases", {
  list: async (): Promise<Result<Phrase[], Error>> => {
    const response = await client.models.Phrases.list();
    if (response.errors) {
      return Err(new Error(response.errors.map(e => e.message).join(", ")));
    }
    return Ok(response.data.map(mapToPhrase));
  },
  create: async (data): Promise<Result<Phrase, Error>> => {
    // Add tenant ID to new phrase
    const serverData = await withTenantId(data);
    const response = await client.models.Phrases.create(serverData);
    if (response.errors) {
      return Err(new Error(response.errors.map(e => e.message).join(", ")));
    }
    return Ok(mapToPhrase(response.data));
  },
  update: async (data): Promise<Result<Phrase, Error>> => {
    // Add tenant ID to update
    const serverData = await withTenantId(data);
    const response = await client.models.Phrases.update(serverData);
    if (response.errors) {
      return Err(new Error(response.errors.map(e => e.message).join(", ")));
    }
    return Ok(mapToPhrase(response.data));
  },
  delete: async (id): Promise<Result<string, Error>> => {
    const tenantId = await getCurrentTenantId();
    const response = await client.models.Phrases.delete({ id, tenantId: tenantId || "" });
    if (response.errors) {
      return Err(new Error(response.errors.map(e => e.message).join(", ")));
    }
    return Ok(id);
  },
});

export async function getRawCounts(): Promise<Result<{ [key: string]: number }, Error>> {
  try {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) {
      return Err(new Error('No tenant ID available'));
    }

    const [
      elements,
      components,
      phrases,
      sections,
      surveys
    ] = await Promise.all([
      client.models.Elements.list({ filter: { tenantId: { eq: tenantId } } }),
      client.models.Components.list({ filter: { tenantId: { eq: tenantId } } }),
      client.models.Phrases.list({ filter: { tenantId: { eq: tenantId } } }),
      client.models.Sections.list({ filter: { tenantId: { eq: tenantId } } }),
      client.models.Surveys.list({ filter: { tenantId: { eq: tenantId } } })
    ]);

    return Ok({
      elements: elements.data?.length || 0,
      components: components.data?.length || 0,
      phrases: phrases.data?.length || 0,
      sections: sections.data?.length || 0,
      surveys: surveys.data?.length || 0,
    });
  } catch (error) {
    return Err(new Error(getErrorMessage(error)));
  }
}
