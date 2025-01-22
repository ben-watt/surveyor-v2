"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Schema } from "@/amplify/data/resource";
import { JsonView, defaultStyles } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import { matchSorter } from 'match-sorter';
import bankOfDefects from "./defects.json";
import elements from "./elements.json";
import seedLocationData from "./locations.json";
import { componentStore, elementStore, phraseStore, locationStore, CreateLocation } from "../clients/Database";
import { Component, SyncStatus } from "../clients/Dexie";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { getErrorMessage } from "../utils/handleError";
// Type definitions
type ElementData = Pick<Schema["Elements"]["type"], "name" | "description" | "order" | "section"> & { id: string };
type ComponentData = Omit<Component, "owner" | "createdAt" | "updatedAt" | "syncStatus"> & { id: string };
type PhraseData = Omit<Schema["Phrases"]["type"], "owner" | "createdAt" | "updatedAt"> & { id: string };
type LocationData = {
  id: string;
  value: string;
  label: string;
  parentId?: string | null;
  syncStatus?: string;
};

const seedElementData: Omit<ElementData, "id">[] = elements;

// Data mapping functions
function mapBodToPhraseData(bod: typeof bankOfDefects, elements: ElementData[], components: ComponentData[]): PhraseData[] {
  const phrases: PhraseData[] = [];
  
  bod.forEach((sheet) => {
    const matchingElement = matchSorter(elements, sheet.elementName, { keys: ["name"] }).at(0);
    if (!matchingElement?.id) return;

    sheet.defects.forEach(d => {
      const matchingComponent = components.find(c => 
        c.name === d.type && 
        c.materials.some(m => m.name === d.specification)
      );

      if (!matchingComponent) return;

      const phraseName = `${d.defect}`;
      const level2 = (d.level2Wording || "") as string;
      const level3 = (d.level3Wording || "") as string;
      const phraseText = level2.trim() || level3.trim() || "No description available";

      if (!phrases.some(p => p.name === phraseName)) {
        phrases.push({
          id: crypto.randomUUID(),
          syncStatus: "IMPORTED",
          name: phraseName,
          type: "Defect",
          associatedMaterialIds: [d.specification],
          associatedElementIds: [matchingElement.id],
          associatedComponentIds: [matchingComponent.id],
          phrase: phraseText,
        });
      }
    });
  });

  return phrases;
}

function mapBodToComponentData(bod: typeof bankOfDefects, elements: ElementData[]): ComponentData[] {
  const componentData: ComponentData[] = [];
  
  bod.forEach((sheet) => {
    sheet.defects.forEach(d => {
      const existingComponent = componentData.find(c => c.name === d.type);
      if (existingComponent) {
        const existingMaterial = existingComponent.materials.find(m => m.name === d.specification);
        if (!existingMaterial) {
          existingComponent.materials.push({ name: d.specification });
        }
      } else {
        const matchingElement = matchSorter(elements, sheet.elementName, { keys: ["name"] }).at(0);
        componentData.push({
          id: crypto.randomUUID(),
          elementId: matchingElement?.id || "",
          name: d.type,
          materials: [{ name: d.specification }],
        });
      }
    });
  });

  return componentData;
}

function LoadingSpinner() {
  return (
    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600" />
  );
}

function SyncStatusBadge({ status, isLoading }: { status: string; isLoading?: boolean }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case SyncStatus.Draft:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case SyncStatus.Synced:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case SyncStatus.Queued:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case SyncStatus.Failed:
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full inline-flex items-center gap-2 ${getStatusColor(status)}`}>
      {isLoading && <LoadingSpinner />}
      {status.toUpperCase()}
    </span>
  );
}

type EntityType = "elements" | "components" | "phrases" | "locations";
type FilterState = {
  [key in EntityType]?: SyncStatus;
};

function StatusBadge({ 
  status, 
  count, 
  isActive, 
  onClick 
}: { 
  status: SyncStatus; 
  count: number; 
  isActive: boolean;
  onClick: () => void;
}) {
  const getStatusColor = (status: SyncStatus) => {
    const baseColors = {
      [SyncStatus.Draft]: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
      [SyncStatus.Synced]: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
      [SyncStatus.Queued]: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
      [SyncStatus.Failed]: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    };

    return isActive 
      ? "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
      : baseColors[status];
  };

  return (
    <button
      onClick={onClick}
      disabled={count === 0}
      className={`px-2 py-1 text-xs font-medium rounded-full inline-flex items-center gap-2 
        ${getStatusColor(status)} 
        ${count === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer'}
        ${isActive ? 'ring-1 ring-gray-400 dark:ring-gray-500' : ''}`}
    >
      {status.toUpperCase()} ({count})
    </button>
  );
}

// Add this function to prepare location data
function prepareLocationData(locations: LocationData[]) : CreateLocation[] {
  return locations.map(location => ({
    id: location.id,
    name: location.label,
    parentId: location.parentId || null,
    syncStatus: "IMPORTED" as SyncStatus
  }));
}

export default function Page() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingEntities, setSyncingEntities] = useState<{
    elements: boolean;
    components: boolean;
    phrases: boolean;
    locations: boolean;
  }>({
    elements: false,
    components: false,
    phrases: false,
    locations: false,
  });
  const [elementsHydrated, elements] = elementStore.useList();
  const [componentsHydrated, components] = componentStore.useList();
  const [phrasesHydrated, phrases] = phraseStore.useList();
  const [locationsHydrated, locations] = locationStore.useList();
  const [componentData, setComponentData] = useState<ComponentData[]>([]);
  const [phraseData, setPhraseData] = useState<PhraseData[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [selectedEntity, setSelectedEntity] = useState<EntityType | null>(null);
  const [syncDialog, setSyncDialog] = useState(false);
  const [entitiesToSync, setEntitiesToSync] = useState({
    elements: true,
    components: true,
    phrases: true,
    locations: true,
  });
  const [seedDialog, setSeedDialog] = useState(false);
  const [entitiesToSeed, setEntitiesToSeed] = useState({
    elements: true,
    components: true,
    phrases: true,
    locations: true,
  });

  // Add counts from JSON files
  const availableCounts = {
    elements: seedElementData.length,
    locations: seedLocationData.length,
    components: 0, // This is derived from bankOfDefects
    phrases: 0, // This is derived from bankOfDefects
  };

  // Calculate derived counts
  useEffect(() => {
    const mappedComponents = mapBodToComponentData(bankOfDefects, elements);
    const mappedPhrases = mapBodToPhraseData(bankOfDefects, elements, mappedComponents);
    availableCounts.components = mappedComponents.length;
    availableCounts.phrases = mappedPhrases.length;
  }, []);

  // Data mapping effects
  useEffect(() => {
    const mappedComponentData = mapBodToComponentData(bankOfDefects, elements);
    setComponentData(mappedComponentData);
  }, [elements]);

  useEffect(() => {
    if (componentData.length > 0 && elements.length > 0) {
      const phrases = mapBodToPhraseData(bankOfDefects, elements, componentData);
      setPhraseData(phrases);
    }
  }, [componentData, elements]);

  // Data operations
  async function removeAllData() {
    try {
      setIsLoading(true);
      await Promise.all([
        elementStore.removeAll(),
        componentStore.removeAll(),
        phraseStore.removeAll(),
        locationStore.removeAll()
      ]);
      toast.success("Successfully removed all data");
      setComponentData([]);
      setPhraseData([]);
    } catch (error) {
      console.error("Failed to remove data", error);
      toast.error("Failed to remove data");
    } finally {
      setIsLoading(false);
    }
  }

  async function seedAllData() {
    try {
      setIsLoading(true);
      
      // Clear existing data for selected entities
      await Promise.all([
        entitiesToSeed.elements && elementStore.removeAll(),
        entitiesToSeed.components && componentStore.removeAll(),
        entitiesToSeed.phrases && phraseStore.removeAll(),
        entitiesToSeed.locations && locationStore.removeAll()
      ].filter(Boolean));

      // Seed locations if selected
      if (entitiesToSeed.locations) {
        const preparedLocations = prepareLocationData(seedLocationData);
        await Promise.all(
          preparedLocations.map(location => locationStore.add(location))
        );
      }

      let newElements: ElementData[] = [];
      // Seed elements if selected
      if (entitiesToSeed.elements) {
        const elementTasks = seedElementData.map(async (element) => {
          const elementWithId = {
            ...element,
            id: crypto.randomUUID(),
          };
          await elementStore.add(elementWithId);
          return elementWithId;
        });
        newElements = await Promise.all(elementTasks);
      } else {
        newElements = elements;
      }

      // Seed components if selected
      if (entitiesToSeed.components) {
        const newComponents = mapBodToComponentData(bankOfDefects, newElements);
        await Promise.all(
          newComponents.map(component => componentStore.add(component))
        );
        setComponentData(newComponents);
      }

      // Seed phrases if selected
      if (entitiesToSeed.phrases) {
        const newPhrases = mapBodToPhraseData(bankOfDefects, newElements, componentData);
        await Promise.all(
          newPhrases.map(phrase => phraseStore.add(phrase))
        );
        setPhraseData(newPhrases);
      }

      setSeedDialog(false);
      toast.success("Successfully seeded selected data");
    } catch (error) {
      console.error("Failed to seed data", error);
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
      });
    }
  }

  // Filter data based on selected status
  const filteredElements = elements.filter(e => !filters.elements || e.syncStatus === filters.elements);
  const filteredComponents = components.filter(c => !filters.components || c.syncStatus === filters.components);
  const filteredPhrases = phrases.filter(p => !filters.phrases || p.syncStatus === filters.phrases);
  const filteredLocations = locations.filter(l => !filters.locations || l.syncStatus === filters.locations);

  const toggleFilter = (entityType: EntityType, status: SyncStatus) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      if (prev[entityType] === status) {
        delete newFilters[entityType];
        // Only clear selected entity if it matches the one being unfiltered
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

  // Function to handle card clicks
  const handleCardClick = (entityType: EntityType) => {
    setSelectedEntity(selectedEntity === entityType ? null : entityType);
    // Clear any filters for this entity type when selecting via card click
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[entityType];
      return newFilters;
    });
  };

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-semibold dark:text-white">Settings</h1>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl dark:text-white">Data Management</h2>
            <div className="flex gap-4">
              <Dialog open={syncDialog} onOpenChange={setSyncDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isSyncing || isLoading}
                    className="min-w-[140px]"
                  >
                    {isSyncing ? (
                      <span className="inline-flex items-center gap-2">
                        <LoadingSpinner />
                        Syncing...
                      </span>
                    ) : (
                      "Sync with Server"
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Select Entities to Sync</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="elements"
                        checked={entitiesToSync.elements}
                        onCheckedChange={(checked) => 
                          setEntitiesToSync(prev => ({ ...prev, elements: !!checked }))
                        }
                      />
                      <label htmlFor="elements" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Elements ({elements.length} / {availableCounts.elements} available)
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="components"
                        checked={entitiesToSync.components}
                        onCheckedChange={(checked) => 
                          setEntitiesToSync(prev => ({ ...prev, components: !!checked }))
                        }
                      />
                      <label htmlFor="components" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Components ({components.length} / {availableCounts.components} available)
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="phrases"
                        checked={entitiesToSync.phrases}
                        onCheckedChange={(checked) => 
                          setEntitiesToSync(prev => ({ ...prev, phrases: !!checked }))
                        }
                      />
                      <label htmlFor="phrases" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Phrases ({phrases.length} / {availableCounts.phrases} available)
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="locations"
                        checked={entitiesToSync.locations}
                        onCheckedChange={(checked) => 
                          setEntitiesToSync(prev => ({ ...prev, locations: !!checked }))
                        }
                      />
                      <label htmlFor="locations" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Locations ({locations.length} / {availableCounts.locations} available)
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-4">
                    <Button variant="outline" onClick={() => setSyncDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={syncWithServer}
                      disabled={!Object.values(entitiesToSync).some(Boolean)}
                    >
                      Sync Selected
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={seedDialog} onOpenChange={setSeedDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="default"
                    disabled={isLoading}
                  >
                    Seed Data
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Select Data to Seed</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="seed-elements"
                        checked={entitiesToSeed.elements}
                        onCheckedChange={(checked) => 
                          setEntitiesToSeed(prev => ({ ...prev, elements: !!checked }))
                        }
                      />
                      <label htmlFor="seed-elements" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Elements ({elements.length} / {availableCounts.elements} available)
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="seed-components"
                        checked={entitiesToSeed.components}
                        onCheckedChange={(checked) => 
                          setEntitiesToSeed(prev => ({ ...prev, components: !!checked }))
                        }
                      />
                      <label htmlFor="seed-components" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Components ({components.length} / {availableCounts.components} available)
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="seed-phrases"
                        checked={entitiesToSeed.phrases}
                        onCheckedChange={(checked) => 
                          setEntitiesToSeed(prev => ({ ...prev, phrases: !!checked }))
                        }
                      />
                      <label htmlFor="seed-phrases" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Phrases ({phrases.length} / {availableCounts.phrases} available)
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="seed-locations"
                        checked={entitiesToSeed.locations}
                        onCheckedChange={(checked) => 
                          setEntitiesToSeed(prev => ({ ...prev, locations: !!checked }))
                        }
                      />
                      <label htmlFor="seed-locations" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Locations ({locations.length} / {availableCounts.locations} available)
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-4">
                    <Button variant="outline" onClick={() => setSeedDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={seedAllData}
                      disabled={!Object.values(entitiesToSeed).some(Boolean)}
                    >
                      Seed Selected
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                onClick={removeAllData}
                variant="destructive"
                disabled={isLoading || elements.length === 0}
              >
                Remove All Data
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div 
              className={`p-4 border rounded-lg transition-colors cursor-pointer
                ${selectedEntity === "elements" ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'hover:border-gray-400'}
              `}
              onClick={() => handleCardClick("elements")}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium">Elements</h3>
                <SyncStatusBadge 
                  status={elementsHydrated ? SyncStatus.Synced : "loading"} 
                  isLoading={syncingEntities.elements || isLoading}
                />
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Count: {filters.elements ? filteredElements.length : elements.length}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge
                  status={SyncStatus.Draft}
                  count={elements.filter(e => e.syncStatus === SyncStatus.Draft).length}
                  isActive={filters.elements === SyncStatus.Draft}
                  onClick={() => toggleFilter("elements", SyncStatus.Draft)}
                />
                <StatusBadge
                  status={SyncStatus.Queued}
                  count={elements.filter(e => e.syncStatus === SyncStatus.Queued).length}
                  isActive={filters.elements === SyncStatus.Queued}
                  onClick={() => toggleFilter("elements", SyncStatus.Queued)}
                />
                <StatusBadge
                  status={SyncStatus.Failed}
                  count={elements.filter(e => e.syncStatus === SyncStatus.Failed).length}
                  isActive={filters.elements === SyncStatus.Failed}
                  onClick={() => toggleFilter("elements", SyncStatus.Failed)}
                />
                <StatusBadge
                  status={SyncStatus.Synced}
                  count={elements.filter(e => e.syncStatus === SyncStatus.Synced).length}
                  isActive={filters.elements === SyncStatus.Synced}
                  onClick={() => toggleFilter("elements", SyncStatus.Synced)}
                />
              </div>
            </div>

            <div 
              className={`p-4 border rounded-lg transition-colors cursor-pointer
                ${selectedEntity === "components" ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'hover:border-gray-400'}
              `}
              onClick={() => handleCardClick("components")}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium">Components</h3>
                <SyncStatusBadge 
                  status={componentsHydrated ? SyncStatus.Synced : "loading"} 
                  isLoading={syncingEntities.components || isLoading}
                />
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Count: {filters.components ? filteredComponents.length : components.length}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge
                  status={SyncStatus.Draft}
                  count={components.filter(c => c.syncStatus === SyncStatus.Draft).length}
                  isActive={filters.components === SyncStatus.Draft}
                  onClick={() => toggleFilter("components", SyncStatus.Draft)}
                />
                <StatusBadge
                  status={SyncStatus.Queued}
                  count={components.filter(c => c.syncStatus === SyncStatus.Queued).length}
                  isActive={filters.components === SyncStatus.Queued}
                  onClick={() => toggleFilter("components", SyncStatus.Queued)}
                />
                <StatusBadge
                  status={SyncStatus.Failed}
                  count={components.filter(c => c.syncStatus === SyncStatus.Failed).length}
                  isActive={filters.components === SyncStatus.Failed}
                  onClick={() => toggleFilter("components", SyncStatus.Failed)}
                />
                <StatusBadge
                  status={SyncStatus.Synced}
                  count={components.filter(c => c.syncStatus === SyncStatus.Synced).length}
                  isActive={filters.components === SyncStatus.Synced}
                  onClick={() => toggleFilter("components", SyncStatus.Synced)}
                />
              </div>
            </div>

            <div 
              className={`p-4 border rounded-lg transition-colors cursor-pointer
                ${selectedEntity === "phrases" ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'hover:border-gray-400'}
              `}
              onClick={() => handleCardClick("phrases")}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium">Phrases</h3>
                <SyncStatusBadge 
                  status={phrasesHydrated ? SyncStatus.Synced : "loading"} 
                  isLoading={syncingEntities.phrases || isLoading}
                />
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Count: {filters.phrases ? filteredPhrases.length : phrases.length}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge
                  status={SyncStatus.Draft}
                  count={phrases.filter(p => p.syncStatus === SyncStatus.Draft).length}
                  isActive={filters.phrases === SyncStatus.Draft}
                  onClick={() => toggleFilter("phrases", SyncStatus.Draft)}
                />
                <StatusBadge
                  status={SyncStatus.Queued}
                  count={phrases.filter(p => p.syncStatus === SyncStatus.Queued).length}
                  isActive={filters.phrases === SyncStatus.Queued}
                  onClick={() => toggleFilter("phrases", SyncStatus.Queued)}
                />
                <StatusBadge
                  status={SyncStatus.Failed}
                  count={phrases.filter(p => p.syncStatus === SyncStatus.Failed).length}
                  isActive={filters.phrases === SyncStatus.Failed}
                  onClick={() => toggleFilter("phrases", SyncStatus.Failed)}
                />
                <StatusBadge
                  status={SyncStatus.Synced}
                  count={phrases.filter(p => p.syncStatus === SyncStatus.Synced).length}
                  isActive={filters.phrases === SyncStatus.Synced}
                  onClick={() => toggleFilter("phrases", SyncStatus.Synced)}
                />
              </div>
            </div>

            <div 
              className={`p-4 border rounded-lg transition-colors cursor-pointer
                ${selectedEntity === "locations" ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'hover:border-gray-400'}
              `}
              onClick={() => handleCardClick("locations")}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium">Locations</h3>
                <SyncStatusBadge 
                  status={locationsHydrated ? SyncStatus.Synced : "loading"} 
                  isLoading={syncingEntities.locations || isLoading}
                />
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Count: {filters.locations ? filteredLocations.length : locations.length}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge
                  status={SyncStatus.Draft}
                  count={locations.filter(l => l.syncStatus === SyncStatus.Draft).length}
                  isActive={filters.locations === SyncStatus.Draft}
                  onClick={() => toggleFilter("locations", SyncStatus.Draft)}
                />
                <StatusBadge
                  status={SyncStatus.Queued}
                  count={locations.filter(l => l.syncStatus === SyncStatus.Queued).length}
                  isActive={filters.locations === SyncStatus.Queued}
                  onClick={() => toggleFilter("locations", SyncStatus.Queued)}
                />
                <StatusBadge
                  status={SyncStatus.Failed}
                  count={locations.filter(l => l.syncStatus === SyncStatus.Failed).length}
                  isActive={filters.locations === SyncStatus.Failed}
                  onClick={() => toggleFilter("locations", SyncStatus.Failed)}
                />
                <StatusBadge
                  status={SyncStatus.Synced}
                  count={locations.filter(l => l.syncStatus === SyncStatus.Synced).length}
                  isActive={filters.locations === SyncStatus.Synced}
                  onClick={() => toggleFilter("locations", SyncStatus.Synced)}
                />
              </div>
            </div>
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
                  []
                } 
                style={defaultStyles} 
                clickToExpandNode={true} 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
