import Dexie, { type EntityTable } from 'dexie';
import { type Schema } from "@/amplify/data/resource";

type SurveyType = Omit<Schema['Surveys']['type'], "createdAt" | "updatedAt">;

const db = new Dexie('Surveys') as Dexie & {
  surveys: EntityTable<SurveyType>;
};

// Schema declaration:
db.version(1).stores({
  surveys: '&id'
});

export { db };
