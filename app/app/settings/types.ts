import { SyncStatus } from "../clients/Dexie";
import type { CreateComponent, CreateElement, CreateLocation, CreatePhrase } from "../clients/Database";

export type EntityType = "elements" | "components" | "phrases" | "locations" | "sections";

export interface SyncingEntities {
  elements: boolean;
  components: boolean;
  phrases: boolean;
  locations: boolean;
  sections: boolean;
}

export interface EntitiesToSync {
  elements: boolean;
  components: boolean;
  phrases: boolean;
  locations: boolean;
  sections: boolean;
}

export interface EntityCounts {
  elements: number;
  components: number;
  phrases: number;
  locations: number;
  sections: number;
}

export type ElementData = Omit<CreateElement, "syncStatus">;
export type ComponentData = Omit<CreateComponent, "syncStatus">;
export type PhraseData = Omit<CreatePhrase, "syncStatus">;
export type LocationData = Omit<CreateLocation, "syncStatus">; 