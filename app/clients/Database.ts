import Dexie from "dexie";
import { useEffect, useState } from "react";
import { db, Survey } from "./Dexie";
import client from "./AmplifyDataClient";
import { Draft, produce } from "immer";

// Utility to Map Server Responses to Survey Type
const mapToSurvey = (data: any): Survey => ({
  id: data.id,
  syncStatus: "synced",
  content: data.content,
  updatedAt: data.updatedAt,
  createdAt: data.createdAt,
});


type TableEntity = {
  id: string;
  updatedAt: string;
  syncStatus: string; //"synced" | "draft" | "queued" | "failed";
}

// Factory for Dexie Hooks
export function CreateDexieHooks<T extends TableEntity, TCreate, TUpdate extends { id: string }>(
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
    const remoteData = await remoteHandlers.list();
    for (const remote of remoteData) {
      const local = await table.get(remote.id);
      if (!local || new Date(remote.updatedAt) > new Date(local.updatedAt)) {
        await table.put({ ...remote, syncStatus: "synced" });
      }
    }

    const allLocal = await table.toArray();
    for (const local of allLocal) {
      if (local.syncStatus === "queued") {
        try {
          const updated = local.id
            ? await remoteHandlers.update(local as unknown as TUpdate)
            : await remoteHandlers.create(local as unknown as TCreate);

          await table.put({ ...updated, syncStatus: "synced" });
        } catch {
          await table.put({ ...local, syncStatus: "failed" });
        }
      }
    }
  };

  const add = async (data: Omit<TCreate, "syncStatus">) => {
    await table.add({
      ...data,
      syncStatus: "draft",
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

  return {
    useList,
    useGet,
    syncWithServer,
    add,
    update,
    remove,
  };
}

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
