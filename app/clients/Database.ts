import Dexie from "dexie";
import { useEffect, useState } from "react";
import { Component, db, Survey } from "./Dexie";
import client from "./AmplifyDataClient";
import { Draft, produce } from "immer";

type TableEntity = {
  id: string;
  updatedAt: string;
  syncStatus: string;
}

enum SyncStatus {
  Synced = "synced",
  Draft = "draft",
  Queued = "queued",
  Failed = "failed",
}

// Factory for Dexie Hooks
function CreateDexieHooks<T extends TableEntity, TCreate, TUpdate extends { id: string }>(
  db: Dexie,
  tableName: string,
  remoteHandlers: {
    list: () => Promise<T[]>;
    create: (data: TCreate) => Promise<T>;
    update: (data: TUpdate) => Promise<T>;
    delete: (id: string) => Promise<void>;
  }
) {
  const table = db.table<T>(tableName);

  const useList = (): [boolean, T[]] => {
    const [data, setData] = useState<T[]>([]);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
      const fetchLocal = async () => {
        const localData = await table.toArray();

        table.hook("creating", (primKey, obj, transaction) => { setData(prev => [...prev, obj]); });
        table.hook("updating", (mods, primKey, obj, transaction) => { setData(prev => prev.map((d) => d.id === obj.id ? obj : d)); });
        table.hook("deleting", (primKey, obj, transaction) => { setData(prev => prev.filter((d) => d.id !== obj.id)); });

        setData(localData);
        setHydrated(true);
      };

      fetchLocal();
    }, []);

    return [hydrated, data];
  };

  const useGet = (id: string): [boolean, T | undefined] => {
    const [data, setData] = useState<T | undefined>(undefined);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
      const fetchLocal = async () => {
        const localData = await table.get(id);

        table.hook("creating", (primKey, obj, transaction) => { setData(obj); });
        table.hook("updating", (mods, primKey, obj, transaction) => { setData(obj); });
        table.hook("deleting", (primKey, obj, transaction) => { setData(undefined); });

        setData(localData);
        setHydrated(true);
      };

      fetchLocal();
    }, [id]);

    return [hydrated, data];
  };

  const syncWithServer = async () => {
    console.debug("[syncWithServer] Syncing with server");

    try {
      const remoteData = await remoteHandlers.list();
      for (const remote of remoteData) {
        const local = await table.get(remote.id);
        if (!local || new Date(remote.updatedAt) > new Date(local.updatedAt)) {
          await table.put({ ...remote, syncStatus: SyncStatus.Synced });
        }
      }

      const allLocal = await table.toArray();
      for (const local of allLocal) {
        if (local.syncStatus === SyncStatus.Queued) {
          try {
            const exists = remoteData.find(r => r.id === local.id);
            if(exists) {
              const updated = await remoteHandlers.update(local as unknown as TUpdate);
              await table.put({ ...updated, syncStatus: SyncStatus.Synced });
            } else {
              const created = await remoteHandlers.create(local as unknown as TCreate);
              await table.put({ ...created, syncStatus: SyncStatus.Synced });
            }
            
          } catch {
            await table.put({ ...local, syncStatus: SyncStatus.Failed });
          }
        }
      }

      console.debug("[syncWithServer] Synced with server successfully"); 
    } catch (error) {
      console.error("[syncWithServer] Error syncing with server", error);
    }
  };

  const add = async (data: Omit<TCreate, "syncStatus">) => {
    await table.add({
      ...data,
      syncStatus: SyncStatus.Queued,
    } as unknown as T);
  };

  const update = async (id: string, updateFn: (currentState: Draft<T>) => void) => {
    const local = await table.get(id);
    if(local === undefined) {
      throw new Error("Item not found");
    }

    const data = produce(local, updateFn);
    console.log("[update] data", data);
    await table.put({
      ...data,
      syncStatus: "queued",
      updatedAt: new Date().toISOString(),
    });
  };

  const remove = async (id: string) => {
    const local = await table.get(id);
    if (local?.syncStatus === "synced") {
      await remoteHandlers.delete(id);
    }
    await table.delete(id);
  };

  const removeAll = async () => {
    await table.clear();
  };

  return {
    useList,
    useGet,
    syncWithServer,
    add,
    update,
    remove,
    removeAll
  };
}

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

export const componentStore = CreateDexieHooks<Component, CreateComponent, UpdateComponent>(
  db,
  "components",
  {
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
  }
);