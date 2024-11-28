import Dexie, { EntityTable } from 'dexie';
import { type Schema } from "@/amplify/data/resource";
import dexieCloud from "dexie-cloud-addon";
import dixycloudjson from "@/dexie-cloud.json";

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

/* New version of the database */

export type Sureyv2 = {
  id: string;
  content: string;
}

const dbV2 = new Dexie('SurveyorApp', { addons: [dexieCloud] }) as Dexie & {
  surveys: EntityTable<Sureyv2>;
}

dbV2.version(1).stores({
  surveys: 'id, owner'
});

dbV2.cloud.configure({
  databaseUrl: dixycloudjson.dbUrl,
  requireAuth: true,
})

export { db, dbV2 };