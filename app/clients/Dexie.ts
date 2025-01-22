import Dexie, { EntityTable } from 'dexie';
import { type Schema } from "@/amplify/data/resource";
import { BuildingSurveyFormData } from '../surveys/building-survey-reports/BuildingSurveyReportSchema';

import { useEffect, useState } from "react";
import { Draft, produce } from "immer";
import { Err, Ok, Result } from 'ts-results';
import { getErrorMessage } from '../utils/handleError';
import { liveQuery } from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { UtensilsIcon } from 'lucide-react';

type ReplaceFieldType<T, K extends keyof T, NewType> = Omit<T, K> & {
  [P in K]: NewType;
};

type OmitType<T, K extends keyof T> = Omit<T, K>;

export type Survey = ReplaceFieldType<Schema['Surveys']['type'], "content", BuildingSurveyFormData>;
export type UpdateSurvey = ReplaceFieldType<Schema['Surveys']['updateType'], "content", BuildingSurveyFormData>;
export type CreateSurvey = ReplaceFieldType<Schema['Surveys']['createType'], "content", BuildingSurveyFormData>;
export type DeleteSurvey = Schema['Surveys']['deleteType']

export type Component = Omit<Schema['Components']['type'], "element">;
export type Element = Omit<Schema['Elements']['type'], "components">;
export type Phrase = Schema['Phrases']['type'];
export type Location = Schema['Locations']['type'];

type TableEntity = {
  id: string;
  updatedAt: string;
  syncStatus: string;
  syncError?: string;
}

enum SyncStatus {
  Synced = "synced",
  Draft = "draft",
  Queued = "queued",
  Failed = "failed",
}

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
    const data = useLiveQuery(async () => await table.toArray(), []);
    return [data === undefined ? false : true, data ?? []];
  };

  const useGet = (id: string): [boolean, T | undefined] => {
    const result = useLiveQuery(
      async () => ({ value: await table.get(id) }),
      [id]
    );
    
    return [result !== undefined, result?.value];
  };

  const syncWithServer = async (): Promise<Result<void, Error>> => {
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
            
          } catch(error: any) {
            if(Array.isArray(error)) {
              await table.put({ ...local, syncStatus: SyncStatus.Failed, syncError: error.map(e => e.message).join(", ") });
            } else {
              await table.put({ ...local, syncStatus: SyncStatus.Failed, syncError: error.message });
            }
          }
        }
      }

      console.debug("[syncWithServer] Synced with server successfully"); 
      return Ok(undefined);
    } catch (error: any) {
      console.error("[syncWithServer] Error syncing with server", error);
      return Err(new Error(getErrorMessage(error)));
    }
  };

  const get = async (id: string) => {
    const local = await table.get(id);
    if(local === undefined) {
      throw new Error("Item not found");
    }
    return local;
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
    const all = await table.toArray();
    for (const item of all) {
      await remoteHandlers.delete(item.id);
    }

    await table.clear();
  };

  return {
    useList,
    useGet,
    syncWithServer,
    add,
    get,
    update,
    remove,
    removeAll
  };
}

const db = new Dexie('Surveys') as Dexie & {
  surveys: EntityTable<Survey, "id">;
  components: EntityTable<Component, "id">;
  elements: EntityTable<Element, "id">;
  phrases: EntityTable<Phrase, "id">;
  locations: EntityTable<Location, "id">;
};

db.version(1).stores({
  surveys: '&id, updatedAt, syncStatus',
  components: '&id, updatedAt, syncStatus',
  elements: '&id, updatedAt, syncStatus',
  phrases: '&id, updatedAt, syncStatus',
  locations: '&id, updatedAt, syncStatus',
});


export { db, CreateDexieHooks, SyncStatus };