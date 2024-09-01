import { useEffect, useState } from "react";
import { CreateSurvey, db as dexieDb, Survey, UpdateSurvey } from "./Dexie";
import Dexie from "dexie";
import client from "./AmplifyDataClient";


interface RemoteData {
  id: string;
  updatedAt: string | undefined;
}

interface DexieData<T extends RemoteData> {
    id: string;
    updatedAt: Date;
    syncState: "local" | "synced";
    data: T;
}

interface Result<T> {
  data: T | null;
  errors: string[] | null;
}

type OptionalExceptFor<T, TRequired extends keyof T> = Partial<T> & Pick<T, TRequired>;

type CreateDexieHooksProps<T extends RemoteData, TCreate, TUpdate> = {
  db: Dexie;
  tableName: string;
  remoteList: () => Promise<T[]>;
  remoteAdd: (data: TCreate) => Promise<Result<T>>;
  remoteDelete: (id: string) => Promise<Result<T>>;
  remoteUpdate: (data: TUpdate) => Promise<Result<T>>;
  remoteGet: (id: string) => Promise<Result<T>>;
};

function CreateDexieHooks<T extends RemoteData, TCreate, TUpdate extends OptionalExceptFor<T, 'id'>>({
  db,
  tableName,
  remoteList: remoteQuery,
  remoteAdd,
  remoteDelete,
  remoteUpdate,
  remoteGet,
}: CreateDexieHooksProps<T, TCreate, TUpdate>) {

  const tbl = db.table<DexieData<T>>(tableName);

  const updateLocalDbIfNewer = async (
    remote: T
  ): Promise<boolean> => {
    if (remote.id === undefined) {
      return false;
    }

    const localData = await tbl.get(remote.id as never);
    if (remote.updatedAt === undefined) {
      return false;
    }

    if (localData && localData.updatedAt) {
      if (new Date(remote.updatedAt) > new Date(localData.updatedAt)) {
        await tbl.put({ id: remote.id, syncState: "synced", updatedAt: new Date(), data: remote });
        return true;
      }
      return false;
    } else {
      await tbl.add({ id: remote.id, syncState: "synced", updatedAt: new Date(), data: remote });
      return true;
    }
  };

  const useList = (): [boolean, T[]] => {
    const [data, setData] = useState<T[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      tbl.hook("creating", (ctx, survey) => {
        setData((prev) => [...prev, survey.data]);
      });

      tbl.hook("deleting", (pk, obj, transaction) => {
        setData((prev) => {
          return prev.filter((s) => s.id !== (pk as string));
        });
      });

      tbl.hook("updating", (mod, pk, obj, transaction) => {
        setData((prev) => prev.map((s) => (s.id === obj.id ? obj.data : s)));
      });
    }, []);

    useEffect(() => {
      const fetchLocal = async (): Promise<void> => {
        const data = await tbl.toArray();
        setData(data.map((d) => d.data));
        setIsLoading(false);
      };

      /// Fetches the surveys from the server and updates the local database
      /// with the latest data. If we have a newer version of the survey on the server
      /// we update the local database with the new data.
      const fetchRemote = async () => {
        const response = await remoteQuery();

        const newRecordsOnServer = response.map(
          async (d) => await updateLocalDbIfNewer(d)
        );

        const result = await Promise.all(newRecordsOnServer);
        if (result.some((r) => r)) {
          fetchLocal();
        }
      };

      fetchLocal();
      fetchRemote();
    }, []);

    return [isLoading, data];
  };

  const useGet = (
    id: string
  ): [boolean, T | undefined] => {
    const [data, setData] = useState<T>();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const fetch = async () => {
        const localData = await tbl.get(id);
        setData(localData?.data);
        setIsLoading(false);
      };

      const fetchRemote = async () => {
        const result = await remoteGet(id);
        if (result.data) {
          await updateLocalDbIfNewer(result.data);
          fetch();
        }
      };

      fetch();
      fetchRemote();
    }, []);

    return [isLoading, data];
  };

  const addData = async (
    data: TCreate
  ) => {
    const result = await remoteAdd(data);
    if (result.data) {
      await tbl.put({ id: result.data.id, syncState: "synced", updatedAt: new Date(), data: result.data });
    }
  };

  const deleteData = async (
    id: string
  ) => {
    const data = await db.table<DexieData<T>>(tableName).get(id);
    if (data?.syncState === "local" || data?.syncState === undefined) {
      await tbl.delete(id);
      return;
    }

    const result = await remoteDelete(id);
    if (result.data) {
      await tbl.delete(id);
    }
  };

  interface UpdateArgs {
    localOnly: boolean;
  }

  const updateData = async (
    data: TUpdate,
    args?: UpdateArgs
  ) => {
    const localData = await tbl.get(data.id);
    await tbl.put({
      id: data.id,
      syncState: localData?.syncState || "local",
      updatedAt: new Date(),
      data: data as unknown as T,
    });

    if(args?.localOnly) {
      return;
    }
      
    const result = await addOrUpdateRemote(data, localData?.syncState || "local");

    if (result.data) {
      await tbl.put({
        id: data.id,
        syncState: "synced",
        updatedAt: new Date(),
        data: data as unknown as T,
      });
    } else {
      console.error(result.errors);
      throw new Error("Failed to update data");
    }
  }

  async function addOrUpdateRemote(data: TUpdate, syncState: "local" | "synced") {
    if (syncState === "local") {
      return await remoteAdd(data as unknown as TCreate);
    } else {
      return await remoteUpdate(data);
    }
  };

  return {
    useList: () => useList(),
    useGet: (id: string) => useGet(id),
    add: (data: TCreate) => addData(data),
    delete: (id: string) => deleteData(id),
    upsert: (data: TUpdate, args?: UpdateArgs) => updateData(data, args),
  };
}

const db = {
  surveys: CreateDexieHooks<Survey, CreateSurvey, UpdateSurvey>({
    db: dexieDb,
    tableName: "surveys",
    remoteList: async () => {
      const result = await client.models.Surveys.list();
      return result.data;
    },
    remoteGet: async (id) => {
      const result = await client.models.Surveys.get({ id });
      return {
        data: result.data,
        errors: result?.errors?.map((e) => e.message) || null,
      };
    },
    remoteAdd: async (data) => {
      const result = await client.models.Surveys.create(data);
      return {
        data: result.data,
        errors: result?.errors?.map((e) => e.message) || null,
      }
    },
    remoteDelete: async (id) => {
      const result = await client.models.Surveys.delete({ id });
      return {
        data: result.data,
        errors: result?.errors?.map((e) => e.message) || null,
      }
    },
    remoteUpdate: async (data) => {
      const result = await client.models.Surveys.update(data);
      return {
        data: result.data,
        errors: result?.errors?.map((e) => e.message) || null,
      }
    },
  }),
};

export { db };
