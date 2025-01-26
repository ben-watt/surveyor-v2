"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import toast from "react-hot-toast";
import { JsonView, defaultStyles } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import bankOfDefects from "./defects.json";
import seedLocationData from "./locations.json";
import seedSectionData from "./sections.json";
import seedElementData from "./elements.json";
import { componentStore, elementStore, phraseStore, locationStore, sectionStore } from "../clients/Database";
import { SyncStatus } from "../clients/Dexie";
import { getErrorMessage } from "../utils/handleError";
import { EntityCard } from "./components/EntityCard";
import { EntityDialog } from "./components/EntityDialog";
import { EntityType, SyncingEntities, EntitiesToSync } from "./types";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { mapBodToComponentData, mapBodToPhraseData, mapElementsToElementData, prepareLocationData } from "./utils/mappers";

export default function Page() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingEntities, setSyncingEntities] = useState<SyncingEntities>({
    elements: false,
    components: false,
    phrases: false,
    locations: false,
    sections: false,
  });

  const [elementsHydrated, elements] = elementStore.useList();
  const [componentsHydrated, components] = componentStore.useList();
  const [phrasesHydrated, phrases] = phraseStore.useList();
  const [locationsHydrated, locations] = locationStore.useList();
  const [sectionsHydrated, sections] = sectionStore.useList();

  const [filters, setFilters] = useState<{ [key in EntityType]?: SyncStatus }>({});
  const [selectedEntity, setSelectedEntity] = useState<EntityType | null>(null);
  const [syncDialog, setSyncDialog] = useState(false);
  const [seedDialog, setSeedDialog] = useState(false);
  const [removeDialog, setRemoveDialog] = useState(false);

  const [entitiesToSync, setEntitiesToSync] = useState<EntitiesToSync>({
    elements: true,
    components: true,
    phrases: true,
    locations: true,
    sections: true,
  });

  const [entitiesToSeed, setEntitiesToSeed] = useState<EntitiesToSync>({
    elements: true,
    components: false,
    phrases: false,
    locations: true,
    sections: true,
  });

  const [entitiesToRemove, setEntitiesToRemove] = useState<EntitiesToSync>({
    elements: true,
    components: true,
    phrases: true,
    locations: true,
    sections: true,
  });

  const entityCounts = {
    elements: elements.length,
    components: components.length,
    phrases: phrases.length,
    locations: locations.length,
    sections: sections.length,
  };

  const filteredElements = elements.filter(e => !filters.elements || e.syncStatus === filters.elements);
  const filteredComponents = components.filter(c => !filters.components || c.syncStatus === filters.components);
  const filteredPhrases = phrases.filter(p => !filters.phrases || p.syncStatus === filters.phrases);
  const filteredLocations = locations.filter(l => !filters.locations || l.syncStatus === filters.locations);

  const toggleFilter = (entityType: EntityType, status: SyncStatus) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      if (prev[entityType] === status) {
        delete newFilters[entityType];
        if (selectedEntity === entityType) {
          setSelectedEntity(null);
        }
      } else {
        newFilters[entityType] = status;
        setSelectedEntity(entityType);
      }
      return newFilters;
    });
  };

  const handleCardClick = (entityType: EntityType) => {
    setSelectedEntity(selectedEntity === entityType ? null : entityType);
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[entityType];
      return newFilters;
    });
  };

  async function seedAllData() {
    try {
      setIsLoading(true);

      await Promise.all([
        entitiesToSeed.elements && elementStore.removeAll(),
        entitiesToSeed.components && componentStore.removeAll(),
        entitiesToSeed.phrases && phraseStore.removeAll(),
        entitiesToSeed.locations && locationStore.removeAll(),
        entitiesToSeed.sections && sectionStore.removeAll()
      ].filter(Boolean));

      if (entitiesToSeed.sections) {
        for (const section of seedSectionData) {
          await sectionStore.add({
            id: section.id,
            name: section.name,
            order: section.order
          });
        }
      }

      if (entitiesToSeed.elements) {
        for (const element of seedElementData) {
          await elementStore.add({
            id: element.id,
            name: element.name,
            order: element.order,
            description: element.description || null,
            sectionId: element.sectionId || ""
          });
        }
      }

      if (entitiesToSeed.locations) {
        const locationData = prepareLocationData(seedLocationData);
        for (const location of locationData) {
          await locationStore.add(location);
        }
      }

      const mappedElements = mapElementsToElementData(seedElementData);

      if (entitiesToSeed.components && elements.length > 0) {
        const components = mapBodToComponentData(bankOfDefects, mappedElements);
        for (const component of components) {
          await componentStore.add(component);
        }
      }

      if (entitiesToSeed.phrases && elements.length > 0 && components.length > 0) {
        const phrases = mapBodToPhraseData(bankOfDefects, mappedElements, components);
        for (const phrase of phrases) {
          await phraseStore.add(phrase);
        }
      }

      setSeedDialog(false);
      toast.success("Successfully seeded data");
    } catch (error) {
      console.error("Error seeding data:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function syncWithServer() {
    try {
      setIsSyncing(true);
      setSyncingEntities({
        elements: entitiesToSync.elements,
        components: entitiesToSync.components,
        phrases: entitiesToSync.phrases,
        locations: entitiesToSync.locations,
        sections: entitiesToSync.sections,
      });

      const syncTasks = [];
      
      if (entitiesToSync.elements) {
        syncTasks.push(
          elementStore.syncWithServer().finally(() => 
            setSyncingEntities(prev => ({ ...prev, elements: false }))
          )
        );
      }
      if (entitiesToSync.components) {
        syncTasks.push(
          componentStore.syncWithServer().finally(() => 
            setSyncingEntities(prev => ({ ...prev, components: false }))
          )
        );
      }
      if (entitiesToSync.phrases) {
        syncTasks.push(
          phraseStore.syncWithServer().finally(() => 
            setSyncingEntities(prev => ({ ...prev, phrases: false }))
          )
        );
      }
      if (entitiesToSync.locations) {
        syncTasks.push(
          locationStore.syncWithServer().finally(() => 
            setSyncingEntities(prev => ({ ...prev, locations: false }))
          )
        );
      }
      if (entitiesToSync.sections) {
        syncTasks.push(
          sectionStore.syncWithServer().finally(() => 
            setSyncingEntities(prev => ({ ...prev, sections: false }))
          )
        );
      }

      const results = await Promise.all(syncTasks);

      if(results.some(x => x.err)) {
        toast.error("Failed to sync with server");  
      } else {
        toast.success("Successfully synced with server");
      }

      setSyncDialog(false);
    } catch (error) {
      console.error("Failed to sync with server", error);
      toast.error(getErrorMessage(error));
    } finally {
      setIsSyncing(false);
      setSyncingEntities({
        elements: false,
        components: false,
        phrases: false,
        locations: false,
        sections: false,
      });
    }
  }

  async function removeSelectedData() {
    try {
      setIsLoading(true);
      
      await Promise.all([
        entitiesToRemove.elements && elementStore.removeAll(),
        entitiesToRemove.components && componentStore.removeAll(),
        entitiesToRemove.phrases && phraseStore.removeAll(),
        entitiesToRemove.locations && locationStore.removeAll(),
        entitiesToRemove.sections && sectionStore.removeAll()
      ].filter(Boolean));

      setRemoveDialog(false);
      toast.success("Successfully removed selected data");
    } catch (error) {
      console.error("Failed to remove data", error);
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-semibold dark:text-white">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Import Data Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl dark:text-white">Import Data</h2>
            <div className="flex gap-4">
              <Dialog open={seedDialog} onOpenChange={setSeedDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="default"
                    disabled={isLoading}
                  >
                    Import Data
                  </Button>
                </DialogTrigger>
                <EntityDialog
                  title="Select Data to Import"
                  open={seedDialog}
                  onOpenChange={setSeedDialog}
                  entities={entitiesToSeed}
                  onEntitiesChange={setEntitiesToSeed}
                  onConfirm={seedAllData}
                  confirmLabel="Import Selected"
                  entityCounts={entityCounts}
                  isLoading={isLoading}
                />
              </Dialog>
              <Button
                onClick={() => setRemoveDialog(true)}
                variant="destructive"
                disabled={isLoading || Object.values(entityCounts).every(count => count === 0)}
              >
                Remove Data
              </Button>
            </div>
          </div>
        </div>

        {/* Imported Data Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl dark:text-white">Imported Data</h2>
            <Button
              variant="outline"
              disabled={isSyncing || isLoading}
              onClick={() => setSyncDialog(true)}
              className="min-w-[140px]"
            >
              Sync with Server
            </Button>
          </div>

          <div className="space-y-4 md:space-y-0 md:grid grid-cols-4 gap-4">
            {[
              { type: "elements" as const, title: "Elements", data: elements, hydrated: elementsHydrated },
              { type: "components" as const, title: "Components", data: components, hydrated: componentsHydrated },
              { type: "phrases" as const, title: "Phrases", data: phrases, hydrated: phrasesHydrated },
              { type: "locations" as const, title: "Locations", data: locations, hydrated: locationsHydrated },
              { type: "sections" as const, title: "Sections", data: sections, hydrated: sectionsHydrated },
            ].map(({ type, title, data, hydrated }) => (
              <EntityCard
                key={type}
                type={type}
                title={title}
                count={data.length}
                isSelected={selectedEntity === type}
                isHydrated={hydrated}
                isSyncing={syncingEntities[type]}
                isLoading={isLoading}
                statusCounts={{
                  [SyncStatus.Draft]: data.filter(item => item.syncStatus === SyncStatus.Draft).length,
                  [SyncStatus.Queued]: data.filter(item => item.syncStatus === SyncStatus.Queued).length,
                  [SyncStatus.Failed]: data.filter(item => item.syncStatus === SyncStatus.Failed).length,
                  [SyncStatus.Synced]: data.filter(item => item.syncStatus === SyncStatus.Synced).length,
                }}
                selectedStatus={filters[type]}
                onCardClick={() => handleCardClick(type)}
                onStatusClick={(status) => toggleFilter(type, status)}
              />
            ))}
          </div>
        </div>

        {selectedEntity && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl dark:text-white capitalize">{selectedEntity} Data</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedEntity(null)}
              >
                Close
              </Button>
            </div>
            <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
              <JsonView 
                data={
                  selectedEntity === "elements" ? filteredElements :
                  selectedEntity === "components" ? filteredComponents :
                  selectedEntity === "phrases" ? filteredPhrases :
                  selectedEntity === "locations" ? filteredLocations :
                  selectedEntity === "sections" ? sections :
                  []
                } 
                style={defaultStyles} 
                clickToExpandNode={true} 
              />
            </div>
          </div>
        )}

        <EntityDialog
          title="Select Data to Remove"
          open={removeDialog}
          onOpenChange={setRemoveDialog}
          entities={entitiesToRemove}
          onEntitiesChange={setEntitiesToRemove}
          onConfirm={removeSelectedData}
          confirmLabel="Remove Selected"
          confirmVariant="destructive"
          entityCounts={entityCounts}
          isLoading={isLoading}
        />

        <EntityDialog
          title="Select Entities to Sync"
          open={syncDialog}
          onOpenChange={setSyncDialog}
          entities={entitiesToSync}
          onEntitiesChange={setEntitiesToSync}
          onConfirm={syncWithServer}
          confirmLabel="Sync Selected"
          entityCounts={entityCounts}
          isLoading={isSyncing}
        />
      </div>
    </div>
  );
}
