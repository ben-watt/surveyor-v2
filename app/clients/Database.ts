import { useCallback, useEffect, useState } from "react";
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
    useListWith: <R>(propertyName: string, exp: (x: T, dexiDb : typeof dexieDb) => Promise<any>) => {
      const queryPromise = useLiveQuery(() => tbl.toArray(), [])
      const [data, setData] = useState<R[]>([])
      const [isLoading, setIsLoading] = useState(true)
      const expCallback = useCallback(async (x : T) => await exp(x, dexieDb), [])
  
      useEffect(() => {
        const getWithExp = async () => {
          if(queryPromise) {
            const data = queryPromise.map(async x => {
              const resolvedData = await expCallback(x);
              return {
                ...x,
                [propertyName]: resolvedData
              }
            })

            const resolvedData = await Promise.all(data)
            setData(resolvedData)
            setIsLoading(false)
          }
        }

        getWithExp()
      }, [expCallback, propertyName, queryPromise])

      return [isLoading, data] as [boolean, R[]]
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
    add: async (data: Omit<T, Key | "createdAt" | "updatedAt">) => await tbl.add({ ...data, createdAt: new Date(), updatedAt: new Date() }),
    delete: async (id: string) => await tbl.delete(id),
    upsert: async (id: string, data: Partial<T>) => await tbl.update(id, data),
    get: async (id: string) => await tbl.get(id) as T | null,
  }
};

const db = {
  surveys: createHooksFor<Survey, "id">("surveys"),
  elements:  createHooksFor<Element, "id">("elements") ,
  components: createHooksFor<Component, "id">("components"),
  defects: createHooksFor<Defect, "id">("defects"),
  materials: createHooksFor<Material, "name">("materials"),
}

export { db };
