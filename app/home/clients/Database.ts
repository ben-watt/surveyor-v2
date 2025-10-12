import {
  Component,
  db,
  Survey as DexieSurvey,
  Element as BuildingSurveyElement,
  SyncStatus,
  CreateDexieHooks,
  Phrase,
  Section,
} from './Dexie';
import client from './AmplifyDataClient';
import { Schema } from '@/amplify/data/resource';
import { BuildingSurveyFormData } from '@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema';
import { Draft } from 'immer';
import { Ok, Err, Result } from 'ts-results';
import { withTenantId, getCurrentTenantId } from '@/app/home/utils/tenant-utils';
import { getErrorMessage } from '../utils/handleError';

// Helper function to fetch all paginated results
async function fetchAllPages<T>(
  listFn: (params?: {
    nextToken?: string | null;
    limit?: number;
  }) => Promise<{ data: T[]; nextToken?: string | null; errors?: any[] }>,
): Promise<{ data: T[]; errors?: any[] }> {
  const allItems: T[] = [];
  let nextToken: string | null = null;
  let errors: any[] = [];

  do {
    const response = await listFn({ nextToken, limit: 1000 }); // Use higher limit

    if (response.errors) {
      errors.push(...response.errors);
      break;
    }

    allItems.push(...response.data);
    nextToken = response.nextToken || null;
  } while (nextToken);

  return { data: allItems, errors: errors.length > 0 ? errors : undefined };
}

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
  const store = CreateDexieHooks<DexieSurvey, CreateSurvey, UpdateSurvey>(db, 'surveys', {
    list: async (): Promise<Result<DexieSurvey[], Error>> => {
      const response = await fetchAllPages((params) => client.models.Surveys.list(params));
      if (response.errors) {
        return Err(new Error(response.errors.map((e) => e.message).join(', ')));
      }
      return Ok(response.data.map(mapToSurvey));
    },
    create: async (data): Promise<Result<DexieSurvey, Error>> => {
      // Add tenant ID to new survey
      const baseData = {
        id: data.id,
        syncStatus: SyncStatus.Synced,
        content: typeof data.content === 'string' ? data.content : JSON.stringify(data.content),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
      const serverData = await withTenantId(baseData);

      console.log('[createSurveyStore] Creating survey', serverData);
      const response = await client.models.Surveys.create(serverData);
      if (response.errors) {
        return Err(new Error(response.errors.map((e) => e.message).join(', ')));
      }
      return Ok(mapToSurvey(response.data));
    },
    update: async (data): Promise<Result<DexieSurvey, Error>> => {
      // Add tenant ID to update
      const baseData = {
        id: data.id,
        syncStatus: SyncStatus.Synced,
        content: typeof data.content === 'string' ? data.content : JSON.stringify(data.content),
      };
      const serverData = await withTenantId(baseData);

      console.log('[createSurveyStore] Updating survey', serverData);
      const response = await client.models.Surveys.update(serverData);
      if (response.errors) {
        return Err(new Error(response.errors.map((e) => e.message).join(', ')));
      }
      return Ok(mapToSurvey(response.data));
    },
    delete: async (id): Promise<Result<string, Error>> => {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        return Err(new Error('No tenant ID available for delete operation'));
      }
      const response = await client.models.Surveys.delete(
        { id, tenantId },
        { authMode: 'userPool' },
      );
      if (response.errors) {
        return Err(new Error(response.errors.map((e) => e.message).join(', ')));
      }
      return Ok(id);
    },
  });

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
      return [isHydrated, surveys.map((s) => s.content as BuildingSurveyFormData)];
    },
    useRawList: (): [boolean, DexieSurvey[]] => {
      const [isHydrated, surveys] = store.useList();
      return [isHydrated, surveys];
    },
    update: async (id: string, updater: (survey: Draft<BuildingSurveyFormData>) => void) => {
      return store.update(id, (dexieSurvey: Draft<DexieSurvey>) => {
        updater(dexieSurvey.content as BuildingSurveyFormData);
      });
    },
    forceSync: store.forceSync,
  };
};

export const surveyStore = createSurveyStore();

const mapToComponent = (data: any): Component => ({
  id: data.id,
  syncStatus: SyncStatus.Synced,
  updatedAt: data.updatedAt,
  createdAt: data.createdAt,
  name: data.name,
  order: data.order || 0,
  materials: data.materials,
  elementId: data.elementId,
  tenantId: data.tenantId,
});

export type UpdateComponent = Partial<Component> & { id: string };
export type CreateComponent = Schema['Components']['createType'];

export const componentStore = CreateDexieHooks<Component, CreateComponent, UpdateComponent>(
  db,
  'components',
  {
    list: async (): Promise<Result<Component[], Error>> => {
      const response = await fetchAllPages((params) => client.models.Components.list(params));
      if (response.errors) {
        return Err(new Error(response.errors.map((e) => e.message).join(', ')));
      }
      return Ok(response.data.map(mapToComponent));
    },
    create: async (data): Promise<Result<Component, Error>> => {
      // Add tenant ID to new component
      const serverData = await withTenantId(data);
      const response = await client.models.Components.create(serverData);
      if (response.errors) {
        return Err(new Error(response.errors.map((e) => e.message).join(', ')));
      }
      return Ok(mapToComponent(response.data));
    },
    update: async (data): Promise<Result<Component, Error>> => {
      // Add tenant ID to update
      const serverData = await withTenantId(data);
      const response = await client.models.Components.update(serverData);
      if (response.errors) {
        return Err(new Error(response.errors.map((e) => e.message).join(', ')));
      }
      return Ok(mapToComponent(response.data));
    },
    delete: async (id): Promise<Result<string, Error>> => {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        return Err(new Error('No tenant ID available for delete operation'));
      }
      const response = await client.models.Components.delete({ id, tenantId });
      if (response.errors) {
        return Err(new Error(response.errors.map((e) => e.message).join(', ')));
      }
      return Ok(id);
    },
  },
);

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

export const elementStore = CreateDexieHooks<BuildingSurveyElement, CreateElement, UpdateElement>(
  db,
  'elements',
  {
    list: async (): Promise<Result<BuildingSurveyElement[], Error>> => {
      const response = await fetchAllPages((params) => client.models.Elements.list(params));
      if (response.errors) {
        return Err(new Error(response.errors.map((e) => e.message).join(', ')));
      }
      return Ok(response.data.map(mapToElement));
    },
    create: async (data): Promise<Result<BuildingSurveyElement, Error>> => {
      // Add tenant ID to new element
      const serverData = await withTenantId(data);
      const response = await client.models.Elements.create(serverData);
      if (response.errors) {
        return Err(new Error(response.errors.map((e) => e.message).join(', ')));
      }
      return Ok(mapToElement(response.data));
    },
    update: async (data): Promise<Result<BuildingSurveyElement, Error>> => {
      // Add tenant ID to update
      const serverData = await withTenantId(data);
      const response = await client.models.Elements.update(serverData);
      if (response.errors) {
        return Err(new Error(response.errors.map((e) => e.message).join(', ')));
      }
      return Ok(mapToElement(response.data));
    },
    delete: async (id): Promise<Result<string, Error>> => {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        return Err(new Error('No tenant ID available for delete operation'));
      }
      const response = await client.models.Elements.delete({ id, tenantId });
      if (response.errors) {
        return Err(new Error(response.errors.map((e) => e.message).join(', ')));
      }
      return Ok(id);
    },
  },
);

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
  'sections',
  {
    list: async (): Promise<Result<Section[], Error>> => {
      const response = await fetchAllPages((params) => client.models.Sections.list(params));
      if (response.errors) {
        return Err(new Error(response.errors.map((e) => e.message).join(', ')));
      }
      return Ok(response.data.map(mapToSection));
    },
    create: async (data): Promise<Result<Section, Error>> => {
      const serverData = await withTenantId(data);
      const response = await client.models.Sections.create(serverData);
      if (response.errors) {
        return Err(new Error(response.errors.map((e) => e.message).join(', ')));
      }
      return Ok(mapToSection(response.data));
    },
    update: async (data): Promise<Result<Section, Error>> => {
      const serverData = await withTenantId(data);
      const response = await client.models.Sections.update(serverData);
      if (response.errors) {
        return Err(new Error(response.errors.map((e) => e.message).join(', ')));
      }
      return Ok(mapToSection(response.data));
    },
    delete: async (id): Promise<Result<string, Error>> => {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        return Err(new Error('No tenant ID available for delete operation'));
      }
      const response = await client.models.Sections.delete({ id, tenantId });
      if (response.errors) {
        return Err(new Error(response.errors.map((e) => e.message).join(', ')));
      }
      return Ok(id);
    },
  },
);

const mapToPhrase = (data: any): Phrase => ({
  id: data.id,
  syncStatus: SyncStatus.Synced,
  updatedAt: data.updatedAt,
  createdAt: data.createdAt,
  name: data.name,
  order: data.order || 0,
  type: data.type,
  associatedComponentIds: data.associatedComponentIds,
  phrase: data.phrase,
  phraseLevel2: data.phraseLevel2,
  owner: data.owner,
  tenantId: data.tenantId,
});

export type UpdatePhrase = Partial<Phrase> & { id: string };
export type CreatePhrase = Schema['Phrases']['createType'];

export const phraseStore = CreateDexieHooks<Phrase, CreatePhrase, UpdatePhrase>(db, 'phrases', {
  list: async (): Promise<Result<Phrase[], Error>> => {
    const response = await fetchAllPages((params) => client.models.Phrases.list(params));
    if (response.errors) {
      return Err(new Error(response.errors.map((e) => e.message).join(', ')));
    }
    return Ok(response.data.map(mapToPhrase));
  },
  create: async (data): Promise<Result<Phrase, Error>> => {
    // Add tenant ID to new phrase
    const serverData = await withTenantId(data);
    const response = await client.models.Phrases.create(serverData);
    if (response.errors) {
      return Err(new Error(response.errors.map((e) => e.message).join(', ')));
    }
    return Ok(mapToPhrase(response.data));
  },
  update: async (data): Promise<Result<Phrase, Error>> => {
    // Add tenant ID to update
    const serverData = await withTenantId(data);
    const response = await client.models.Phrases.update(serverData);
    if (response.errors) {
      return Err(new Error(response.errors.map((e) => e.message).join(', ')));
    }
    return Ok(mapToPhrase(response.data));
  },
  delete: async (id): Promise<Result<string, Error>> => {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) {
      return Err(new Error('No tenant ID available for delete operation'));
    }
    const response = await client.models.Phrases.delete({ id, tenantId });
    if (response.errors) {
      return Err(new Error(response.errors.map((e) => e.message).join(', ')));
    }
    return Ok(id);
  },
});

type ServerImageMetadata = Schema['ImageMetadata']['type'];

type LocalOnlyImageFields = {
  uploadProgress?: number; // Upload progress percentage (0-100)
  localFileData?: ArrayBuffer; // Temporary storage for offline uploads (using ArrayBuffer instead of File)
  localFileType?: string; // MIME type for reconstructing File from ArrayBuffer
  localFileName?: string; // File name for reconstructing File from ArrayBuffer
};

// Client ImageMetadata is the server type, but with a stronger SyncStatus type and extra local-only fields
export type ImageMetadata = Omit<ServerImageMetadata, 'syncStatus'> & {
  syncStatus: SyncStatus;
} & LocalOnlyImageFields;

// Fields that should never be sent to the server (local-only)
export const IMAGE_METADATA_LOCAL_ONLY_FIELDS = [
  'uploadProgress',
  'localFileData',
  'localFileType',
  'localFileName',
] as const;

// Canonical set of server-synced fields for ImageMetadata.
// Keep in sync with amplify/data/resource.ts -> ImageMetadata model.
// Compile-time check: ensure client/server fields stay aligned (excluding local-only fields and syncStatus type)
type NonLocalClientKeys = Exclude<
  keyof ImageMetadata,
  (typeof IMAGE_METADATA_LOCAL_ONLY_FIELDS)[number]
>;
type ServerKeys = keyof ServerImageMetadata;
type ClientMissingFromServer = Exclude<NonLocalClientKeys, ServerKeys>;
type ServerMissingFromClient = Exclude<ServerKeys, NonLocalClientKeys>;
// If either is not never, TS will error here
const _imageMetadataKeysTypeCheck: [ClientMissingFromServer, ServerMissingFromClient] = [
  undefined as never,
  undefined as never,
];

// Helper to remove local-only fields before syncing to server
const removeLocalOnlyFields = (data: any): any => {
  const { uploadProgress, localFileData, localFileType, localFileName, ...serverData } = data;

  // Convert SyncStatus enum to string for server
  const convertedData = {
    ...serverData,
    syncStatus:
      serverData.syncStatus === SyncStatus.Queued
        ? 'queued'
        : serverData.syncStatus === SyncStatus.Synced
          ? 'synced'
          : serverData.syncStatus === SyncStatus.Failed
            ? 'failed'
            : serverData.syncStatus || 'queued', // Default to queued
  };

  // Ensure required fields are not null/undefined
  return {
    ...convertedData,
    imagePath: convertedData.imagePath || '',
    createdAt: convertedData.createdAt || new Date().toISOString(),
    updatedAt: convertedData.updatedAt || new Date().toISOString(),
  };
};

const mapToImageMetadata = (data: any): ImageMetadata => ({
  id: data.id,
  syncStatus: SyncStatus.Synced,
  updatedAt: data.updatedAt,
  createdAt: data.createdAt,
  imagePath: data.imagePath,
  thumbnailDataUrl: data.thumbnailDataUrl,
  fileName: data.fileName,
  fileSize: data.fileSize,
  mimeType: data.mimeType,
  width: data.width,
  height: data.height,
  contentHash: data.contentHash,
  caption: data.caption,
  notes: data.notes,
  isArchived: data.isArchived,
  isDeleted: data.isDeleted,
  uploadStatus: data.uploadStatus,
  tenantId: data.tenantId,
});

// Use backend-provided update type for server calls
export type UpdateImageMetadata = Schema['ImageMetadata']['updateType'];
export type CreateImageMetadata = Schema['ImageMetadata']['createType'];

export const imageMetadataStore = CreateDexieHooks<
  ImageMetadata,
  CreateImageMetadata,
  UpdateImageMetadata
>(db, 'imageMetadata', {
  list: async (): Promise<Result<ImageMetadata[], Error>> => {
    const response = await fetchAllPages((params) => client.models.ImageMetadata.list(params));
    if (response.errors) {
      return Err(new Error(response.errors.map((e) => e.message).join(', ')));
    }
    return Ok(response.data.map(mapToImageMetadata));
  },
  create: async (data): Promise<Result<ImageMetadata, Error>> => {
    // Remove local-only fields and add tenant ID
    const cleanData = removeLocalOnlyFields(data);
    const serverData = await withTenantId(cleanData);
    const response = await client.models.ImageMetadata.create(serverData);
    if (response.errors) {
      return Err(new Error(response.errors.map((e) => e.message).join(', ')));
    }
    return Ok(mapToImageMetadata(response.data));
  },
  update: async (data): Promise<Result<ImageMetadata, Error>> => {
    // Remove local-only fields and add tenant ID
    const cleanData = removeLocalOnlyFields(data);
    const serverData = await withTenantId(cleanData);
    const response = await client.models.ImageMetadata.update(serverData);
    if (response.errors) {
      return Err(new Error(response.errors.map((e) => e.message).join(', ')));
    }
    return Ok(mapToImageMetadata(response.data));
  },
  delete: async (id): Promise<Result<string, Error>> => {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) {
      return Err(new Error('No tenant ID available for delete operation'));
    }
    const response = await client.models.ImageMetadata.delete({ id, tenantId });
    if (response.errors) {
      return Err(new Error(response.errors.map((e) => e.message).join(', ')));
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

    const [elements, components, phrases, sections, surveys, imageMetadata] = await Promise.all([
      fetchAllPages((params) =>
        client.models.Elements.list({ ...params, filter: { tenantId: { eq: tenantId } } }),
      ),
      fetchAllPages((params) =>
        client.models.Components.list({ ...params, filter: { tenantId: { eq: tenantId } } }),
      ),
      fetchAllPages((params) =>
        client.models.Phrases.list({ ...params, filter: { tenantId: { eq: tenantId } } }),
      ),
      fetchAllPages((params) =>
        client.models.Sections.list({ ...params, filter: { tenantId: { eq: tenantId } } }),
      ),
      fetchAllPages((params) =>
        client.models.Surveys.list({ ...params, filter: { tenantId: { eq: tenantId } } }),
      ),
      fetchAllPages((params) =>
        client.models.ImageMetadata.list({ ...params, filter: { tenantId: { eq: tenantId } } }),
      ),
    ]);

    return Ok({
      elements: elements.data?.length || 0,
      components: components.data?.length || 0,
      phrases: phrases.data?.length || 0,
      sections: sections.data?.length || 0,
      surveys: surveys.data?.length || 0,
      imageMetadata: imageMetadata.data?.length || 0,
    });
  } catch (error) {
    return Err(new Error(getErrorMessage(error)));
  }
}
