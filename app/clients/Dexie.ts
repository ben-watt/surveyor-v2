import Dexie, { EntityTable } from 'dexie';
import { type Schema } from "@/amplify/data/resource";
import { BuildingSurveyFormData } from '../surveys/building-survey-reports/BuildingSurveyReportSchema';

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

const db = new Dexie('Surveys') as Dexie & {
  surveys: EntityTable<Survey, "id">;
  components: EntityTable<Component, "id">;
  elements: EntityTable<Element, "id">;
};

db.version(1).stores({
  surveys: '&id, updatedAt, syncStatus',
  components: '&id, updatedAt, syncStatus',
  elements: '&id, updatedAt, syncStatus',
});


export { db };