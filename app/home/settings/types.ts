import { SyncStatus } from '../clients/Dexie';
import type { CreateComponent, CreateElement, CreatePhrase } from '../clients/Database';

export type EntityType = 'elements' | 'components' | 'phrases' | 'sections' | 'surveys';

export type SyncingEntities = {
  elements: boolean;
  components: boolean;
  phrases: boolean;
  sections: boolean;
  surveys: boolean;
};

export type EntitiesToSync = {
  elements: boolean;
  components: boolean;
  phrases: boolean;
  sections: boolean;
  surveys: boolean;
};

export interface EntityCounts {
  elements: number;
  components: number;
  phrases: number;
  sections: number;
}

export type ElementData = Omit<CreateElement, 'syncStatus' | 'tenantId'>;
export type ComponentData = Omit<CreateComponent, 'syncStatus' | 'tenantId'>;
export type PhraseData = Omit<CreatePhrase, 'syncStatus' | 'tenantId'>;
