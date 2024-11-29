import Dexie, { EntityTable } from 'dexie';
import dexieCloud from "dexie-cloud-addon";
import dixycloudjson from "@/dexie-cloud.json";


export type Survey = {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt:Date;
}

export type Element = {
  id: string;
  name: string;
  order: number;
  section: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export type Component = {
  id: string;
  name: string;
  elementId: string;
}

export type Defect = {
  id: string;
  name: string;
  materials: Material[];
  componentId: string;
  component: Component;
  description: string;
}

export type Material = {
  name: string;
}

const db = new Dexie('SurveyorApp', { addons: [dexieCloud] }) as Dexie & {
  surveys: EntityTable<Survey, "id">;
  elements: EntityTable<Element, "id">;
  components: EntityTable<Component, "id">;
  defects: EntityTable<Defect, "id">;
  materials: EntityTable<Material, "name">;
}

db.version(1).stores({
  surveys: '@id',
  elements: '@id',
  components: '@id,elementId',
  defects: '@id', 
  materials: 'name',
});

db.cloud.configure({
  databaseUrl: dixycloudjson.dbUrl,
  requireAuth: true,
})

export { db as dexieDb };