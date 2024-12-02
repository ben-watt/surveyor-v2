import Dexie from "dexie";
import { useEffect, useState } from "react";
import { db, Survey } from "./Dexie";
import client from "./AmplifyDataClient";

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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchLocal = async () => {
        const localData = await table.toArray();
        setData(localData);
        setLoading(false);
      };

      fetchLocal();
    }, []);

    return [loading, data];
  };

  const useGet = (id: string): [boolean, T | undefined] => {
    const [data, setData] = useState<T | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchLocal = async () => {
        const localData = await table.get(id);
        setData(localData);
        setLoading(false);
      };

      fetchLocal();
    }, [id]);

    return [loading, data];
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

  const add = async (data: TCreate) => {
    await table.add({
      ...data,
      syncStatus: "draft",
    } as unknown as T);
  };

  const update = async (data: TUpdate) => {
    const local = await table.get(data.id);
    if(local === undefined) {
      throw new Error("Item not found");
    }

    await table.put({
      ...local,
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

// Export Surveys API
export const surveyStore = CreateDexieHooks<Survey, Survey, Partial<Survey> & { id: string }>(
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
