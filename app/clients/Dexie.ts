import Dexie, { type EntityTable } from 'dexie';
import { type Schema } from "@/amplify/data/resource";

export type Survey = Omit<Schema['Surveys']['type'], "createdAt" | "updatedAt" | "owner"> & { "createdAt"?: string, "updatedAt"?: string };

interface DexieData<T> {
    updatedAt: Date;
    lastSyncAt?: Date;
    data: T;
    id: string;
}

export type SurveyData = DexieData<Survey>;

const db = new Dexie('Surveys') as Dexie & {
  surveys: EntityTable<SurveyData>;
};

db.version(1).stores({
  surveys: 'id'
});

export { db };