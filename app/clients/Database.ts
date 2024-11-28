import { useEffect, useState } from "react";
import { Component, Defect, dexieDb, Material, Survey, Element } from "./Dexie";
import { useLiveQuery } from "dexie-react-hooks";

const createHooksFor = <T, Key extends string>(tableName: string) => {
  const tbl = dexieDb.table(tableName);
  return {
    useList: () => {
      const queryPromise = useLiveQuery(() => tbl.toArray(), [])
      const [data, setData] = useState<T[]>([])
      const [isLoading, setIsLoading] = useState(true)
  
      useEffect(() => {
        if(queryPromise) {
          setData(queryPromise)
          setIsLoading(false)
        }
      }, [queryPromise])
  
      return [isLoading, data] as [boolean, T[]]
    },
    useGet: (id: string) => {
      const queryPromise = useLiveQuery(() => tbl.get(id), [])
      const [data, setData] = useState<T | null>(null)
      const [isLoading, setIsLoading] = useState(true)
  
      useEffect(() => {
        if(queryPromise) {
          setData(queryPromise)
          setIsLoading(false)
        }
      }, [queryPromise])
  
      return [isLoading, data] as [boolean, T | null]
    },
    add: (data: Omit<T, Key>) => tbl.add(data),
    delete: (id: string) => tbl.delete(id),
    upsert: (id: string, data: Partial<T>) => tbl.update(id, data),
  }
};

const db = {
  surveys: createHooksFor<Survey, "id">("surveys"),
  elements: createHooksFor<Element, "id">("elements"),
  components: createHooksFor<Component, "id">("components"),
  defects: createHooksFor<Defect, "id">("defects"),
  materials: createHooksFor<Material, "name">("materials"),
}

export { db };
