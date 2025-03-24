import { SyncStatus } from "../clients/Dexie";
import type { CreateComponent, CreateElement, CreateLocation, CreatePhrase } from "../clients/Database";

export type EntityType = "elements" | "components" | "phrases" | "locations" | "sections" | "surveys";

export type SyncingEntities = {
  elements: boolean;
  components: boolean;
  phrases: boolean;
  locations: boolean;
  sections: boolean;
  surveys: boolean;
};

export type EntitiesToSync = {
  elements: boolean;
  components: boolean;
  phrases: boolean;
  locations: boolean;
  sections: boolean;
  surveys: boolean;
};

export interface EntityCounts {
  elements: number;
  components: number;
  phrases: number;
  locations: number;
  sections: number;
}

export type ElementData = Omit<CreateElement, "syncStatus" | "tenantId">;
export type ComponentData = Omit<CreateComponent, "syncStatus" | "tenantId">;
export type PhraseData = Omit<CreatePhrase, "syncStatus" | "tenantId">;
export type LocationData = Omit<CreateLocation, "syncStatus" | "tenantId">; 