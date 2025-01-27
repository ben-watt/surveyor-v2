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
  ImageUpload,
} from "./Dexie";
import client from "./AmplifyDataClient";
import { Schema } from "@/amplify/data/resource";
import { BuildingSurveyFormData } from "@/app/app/surveys/building-survey-reports/BuildingSurveyReportSchema";
import { Draft } from "immer";
import { uploadData, remove, list } from 'aws-amplify/storage';
import { Ok, Err, Result } from 'ts-results';
import { getErrorMessage } from '../utils/handleError';

const mapToSurvey = (data: any): DexieSurvey => ({
  id: data.id,
  syncStatus: SyncStatus.Synced,
  content: JSON.parse(data.content),
  updatedAt: data.updatedAt,
  createdAt: data.createdAt,
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
        const serverData = {
          id: data.id,
          syncStatus: SyncStatus.Synced,
          content: JSON.stringify(data.content),
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        }

        console.log("[createSurveyStore] Creating survey", serverData);
        const response = await client.models.Surveys.create(serverData);
        if (response.errors) {
          return Err(new Error(response.errors.map(e => e.message).join(", ")));
        }
        return Ok(mapToSurvey(response.data));
      },
      update: async (data): Promise<Result<DexieSurvey, Error>> => {
        const serverData = {
          id: data.id,
          syncStatus: SyncStatus.Synced,
          content: JSON.stringify(data.content),
        }

        console.log("[createSurveyStore] Updating survey", serverData); 
        const response = await client.models.Surveys.update(serverData);
        if (response.errors) {
          return Err(new Error(response.errors.map(e => e.message).join(", ")));
        }
        return Ok(mapToSurvey(response.data));
      },
      delete: async (id): Promise<Result<void, Error>> => {
        const response = await client.models.Surveys.delete({ id });
        if (response.errors) {
          return Err(new Error(response.errors.map(e => e.message).join(", ")));
        }
        return Ok(undefined);
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
    const response = await client.models.Components.create(data);
    if (response.errors) {
      return Err(new Error(response.errors.map(e => e.message).join(", ")));
    }
    return Ok(mapToComponent(response.data));
  },
  update: async (data): Promise<Result<Component, Error>> => {
    const response = await client.models.Components.update(data);
    if (response.errors) {
      return Err(new Error(response.errors.map(e => e.message).join(", ")));
    }
    return Ok(mapToComponent(response.data));
  },
  delete: async (id): Promise<Result<void, Error>> => {
    const response = await client.models.Components.delete({ id });
    if (response.errors) {
      return Err(new Error(response.errors.map(e => e.message).join(", ")));
    }
    return Ok(undefined);
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
    const response = await client.models.Elements.create(data);
    if (response.errors) {
      return Err(new Error(response.errors.map(e => e.message).join(", ")));
    }
    return Ok(mapToElement(response.data));
  },
  update: async (data): Promise<Result<BuildingSurveyElement, Error>> => {
    const response = await client.models.Elements.update(data);
    if (response.errors) {
      return Err(new Error(response.errors.map(e => e.message).join(", ")));
    }
    return Ok(mapToElement(response.data));
  },
  delete: async (id): Promise<Result<void, Error>> => {
    const response = await client.models.Elements.delete({ id });
    if (response.errors) {
      return Err(new Error(response.errors.map(e => e.message).join(", ")));
    }
    return Ok(undefined);
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
      const response = await client.models.Sections.create(data);
      if (response.errors) {
        return Err(new Error(response.errors.map(e => e.message).join(", ")));
      }
      console.log("[createSectionStore] Created section", response);
      return Ok(mapToSection(response.data));
    },
    update: async (data): Promise<Result<Section, Error>> => {
      const response = await client.models.Sections.update(data);
      if (response.errors) {
        return Err(new Error(response.errors.map(e => e.message).join(", ")));
      }
      return Ok(mapToSection(response.data));
    },
    delete: async (id): Promise<Result<void, Error>> => {
      const response = await client.models.Sections.delete({ id });
      if (response.errors) {
        return Err(new Error(response.errors.map(e => e.message).join(", ")));
      }
      return Ok(undefined);
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
    const response = await client.models.Phrases.create(data);
    if (response.errors) {
      return Err(new Error(response.errors.map(e => e.message).join(", ")));
    }
    return Ok(mapToPhrase(response.data));
  },
  update: async (data): Promise<Result<Phrase, Error>> => {
    const response = await client.models.Phrases.update(data);
    if (response.errors) {
      return Err(new Error(response.errors.map(e => e.message).join(", ")));
    }
    return Ok(mapToPhrase(response.data));
  },
  delete: async (id): Promise<Result<void, Error>> => {
    const response = await client.models.Phrases.delete({ id });
    if (response.errors) {
      return Err(new Error(response.errors.map(e => e.message).join(", ")));
    }
    return Ok(undefined);
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
    list: async (): Promise<Result<Location[], Error>> => {
      const response = await client.models.Locations.list();
      if (response.errors) {
        return Err(new Error(response.errors.map(e => e.message).join(", ")));
      }
      return Ok(response.data.map(mapToLocation));
    },
    create: async (data): Promise<Result<Location, Error>> => {
      const response = await client.models.Locations.create(data);
      if (response.errors) {
        return Err(new Error(response.errors.map(e => e.message).join(", ")));
      }
      return Ok(mapToLocation(response.data));
    },
    update: async (data): Promise<Result<Location, Error>> => {
      const response = await client.models.Locations.update(data);
      if (response.errors) {
        return Err(new Error(response.errors.map(e => e.message).join(", ")));
      }
      return Ok(mapToLocation(response.data));
    },
    delete: async (id): Promise<Result<void, Error>> => {
      const response = await client.models.Locations.delete({ id });
      if (response.errors) {
        return Err(new Error(response.errors.map(e => e.message).join(", ")));
      }
      return Ok(undefined);
    },
  }
);

// Add image upload store - this uses Amplify Storage for file operations
export type UpdateImageUpload = Partial<ImageUpload> & { id: string };
export type CreateImageUpload = Omit<ImageUpload, "updatedAt" | "syncStatus" | "syncError">;

export const imageUploadStore = CreateDexieHooks<ImageUpload, CreateImageUpload, UpdateImageUpload>(
  db,
  "imageUploads",
  {
    list: async (): Promise<Result<ImageUpload[], Error>> => {
      try {
        // TODO this should return the remote files only, the issue is it's per path ideally.
        const response = await list({
          path: 'report-images/'
        });
        return Ok(response.items.map(item => ({
          id: "",
          file: new Blob(),
          path: item.path,
          metadata: {},
          updatedAt: new Date().toISOString(),
          syncStatus: SyncStatus.Synced,
        })));
      } catch (error) {
        return Err(new Error(getErrorMessage(error)));
      }
    },
    create: async (data): Promise<Result<ImageUpload, Error>> => {
      const now = new Date().toISOString();
      
      // Upload file to S3 via Amplify Storage
      try {
        const response = await uploadData({
          path: data.path,
          data: data.file,
          options: {
            contentType: data.file.type,
            metadata: data.metadata,
          }
        });

        const imageUpload: ImageUpload = {
          id: data.id,
          file: data.file,
          path: data.path,
          metadata: data.metadata,
          updatedAt: now,
          syncStatus: SyncStatus.Synced,
        };
        await db.imageUploads.add(imageUpload);
        return Ok(imageUpload);
      } catch (error) {
        console.error("[imageUploadStore] Failed to upload file:", error);
        const imageUpload: ImageUpload = {
          id: data.id,
          file: data.file,
          path: data.path,
          metadata: data.metadata,
          updatedAt: now,
          syncStatus: SyncStatus.Failed,
          syncError: error instanceof Error ? error.message : "Failed to upload file",
        };
        await db.imageUploads.add(imageUpload);
        return Ok(imageUpload);
      }
    },
    update: async (data): Promise<Result<ImageUpload, Error>> => {
      try {
        const existing = await db.imageUploads.get(data.id);
        if (!existing) {
          return Err(new Error("Image upload not found"));
        }

        // Don't allow updates to deleted items
        if (existing.syncStatus === SyncStatus.PendingDelete) {
          return Err(new Error("Cannot update a deleted image"));
        }

        const now = new Date().toISOString();
        
        // If file has changed, update in S3
        if (data.file && data.file !== existing.file) {
          try {
            await uploadData({
              path: data.path || existing.path,
              data: data.file,
              options: {
                contentType: data.file.type,
                metadata: data.metadata || existing.metadata,
              }
            });

            const imageUpload: ImageUpload = {
              ...existing,
              ...data,
              updatedAt: now,
              syncStatus: SyncStatus.Synced,
            };
            await db.imageUploads.put(imageUpload);
            return Ok(imageUpload);
          } catch (error) {
            console.error("[imageUploadStore] Failed to update file:", error);
            const imageUpload: ImageUpload = {
              ...existing,
              ...data,
              updatedAt: now,
              syncStatus: SyncStatus.Failed,
              syncError: error instanceof Error ? error.message : "Failed to update file",
            };
            await db.imageUploads.put(imageUpload);
            return Ok(imageUpload);
          }
        }

        // If only metadata changed
        const imageUpload: ImageUpload = {
          ...existing,
          ...data,
          updatedAt: now,
          syncStatus: SyncStatus.Synced,
        };
        await db.imageUploads.put(imageUpload);
        return Ok(imageUpload);
      } catch (error) {
        return Err(new Error(getErrorMessage(error)));
      }
    },
    delete: async (id): Promise<Result<void, Error>> => {
      try {
        const existing = await db.imageUploads.get(id);
        if (existing) {
          // Mark for deletion instead of deleting immediately
          await db.imageUploads.put({
            ...existing,
            syncStatus: SyncStatus.PendingDelete,
            updatedAt: new Date().toISOString(),
          });
        }
        return Ok(undefined);
      } catch (error) {
        return Err(new Error(getErrorMessage(error)));
      }
    },
    syncWithServer: async () => {
      // Handle actual deletion of pending deletes
      const pendingDeletes = await db.imageUploads
        .where('syncStatus')
        .equals(SyncStatus.PendingDelete)
        .toArray();

      for (const item of pendingDeletes) {
        try {
          // Attempt to delete from S3
          await remove({ path: item.path });
          // If successful, remove from local DB
          await db.imageUploads.delete(item.id);
        } catch (error) {
          console.error(`[imageUploadStore] Failed to delete file ${item.path} from S3:`, error);
          // Mark as failed if S3 deletion fails
          await db.imageUploads.put({
            ...item,
            syncStatus: SyncStatus.Failed,
            syncError: error instanceof Error ? error.message : "Failed to delete file",
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // Handle queued uploads
      const queuedUploads = await db.imageUploads
        .where('syncStatus')
        .equals(SyncStatus.Queued)
        .toArray(); 

      for (const item of queuedUploads) {
        try {
          await uploadData({
            path: item.path,
            data: item.file,
            options: {
              contentType: item.file.type,
              metadata: item.metadata,
            }
          });
          // If successful, mark as synced
          await db.imageUploads.put({
            ...item,
            syncStatus: SyncStatus.Synced,
            syncError: undefined,
            updatedAt: new Date().toISOString(),
          });
        } catch (error) {
          console.error(`[imageUploadStore] Failed to retry upload for ${item.path}:`, error);
          // Update error message and timestamp
          await db.imageUploads.put({
            ...item,
            syncError: error instanceof Error ? error.message : "Failed to upload file",
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }
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
