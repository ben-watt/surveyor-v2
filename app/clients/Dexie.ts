import Dexie from 'dexie';
import { type Schema } from "@/amplify/data/resource";

export type Survey = Schema['Surveys']['type'];
export type UpdateSurvey = Schema['Surveys']['updateType'];
export type CreateSurvey = Schema['Surveys']['createType'];
export type DeleteSurvey = Schema['Surveys']['deleteType'];

const db = new Dexie('Surveys') as Dexie & {
  surveys: Survey;
};

db.version(1).stores({
  surveys: 'id'
});

export { db };