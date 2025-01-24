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
import seedSectionData from "./sections.json";
import seedElementData from "./elements.json";
import { componentStore, elementStore, phraseStore, locationStore, sectionStore, CreateSection, CreateElement, CreateLocation } from "../clients/Database";
import { Component, Element, SyncStatus } from "../clients/Dexie";
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
type ElementData = Omit<Element, "owner" | "createdAt" | "updatedAt" | "syncStatus"> & { id: string };
type ComponentData = Omit<Component, "owner" | "createdAt" | "updatedAt" | "syncStatus"> & { id: string };
type PhraseData = Omit<Schema["Phrases"]["type"], "owner" | "createdAt" | "updatedAt"> & { id: string };
type LocationData = Pick<Schema["Locations"]["type"], "id" | "name" | "parentId">;

function mapElementsToElementData(elements: typeof seedElementData): ElementData[] {
  return elements.map(element => ({
    id: element.id,
    name: element.name,
    description: element.description || null,
    sectionId: element.sectionId || ""
  }));
}

function mapBodToComponentData(bod: typeof bankOfDefects, elements: ElementData[]): ComponentData[] {
  const componentData: ComponentData[] = [];
  const componentIds = new Map<string, string>();
  
  bod.forEach((sheet) => {
    sheet.defects.forEach(d => {
      const componentKey = `${d.type}:${d.specification}`;
      // Get or create a consistent ID for this component
      let componentId = componentIds.get(componentKey);
      if (!componentId) {
        componentId = crypto.randomUUID();
        componentIds.set(componentKey, componentId);
      }

      const existingComponent = componentData.find(c => c.name === d.type);
      if (existingComponent) {
        const existingMaterial = existingComponent.materials.find(m => m.name === d.specification);
        if (!existingMaterial) {
          existingComponent.materials.push({ name: d.specification });
        }
      } else {
        const matchingElement = matchSorter(elements, sheet.elementName, { keys: ["name"] }).at(0);
        componentData.push({
          id: componentId,
          elementId: matchingElement?.id || "",
          name: d.type,
          materials: [{ name: d.specification }],
        });
      }
    });
  });

  return componentData;
}

function mapBodToPhraseData(bod: typeof bankOfDefects, elements: ElementData[], components: ComponentData[]): PhraseData[] {
  const phrases: PhraseData[] = [];
  
  bod.forEach((sheet) => {
    const matchingElement = matchSorter(elements, sheet.elementName, { keys: ["name"] }).at(0);
    if (!matchingElement?.id) return;

    sheet.defects.forEach(d => {
      // Find the matching component by name and material
      const matchingComponent = components.find(c => 
        c.name === d.type && 
        c.materials.some(m => m.name === d.specification)
      );

      if (!matchingComponent) {
        console.warn(`No matching component found for type: ${d.type} and specification: ${d.specification}`);
        return;
      }

      const phraseName = `${d.defect}`;
      const level2 = (d.level2Wording || "") as string;
      const level3 = (d.level3Wording || "") as string;
      const phraseText = level2.trim() || level3.trim() || "No description available";

      // Only add if we haven't seen this phrase name before
      if (!phrases.some(p => p.name === phraseName)) {
        phrases.push({
          id: crypto.randomUUID(),
          syncStatus: "IMPORTED",
          name: phraseName,
          type: "Condition",
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

type EntityType = "elements" | "components" | "phrases" | "locations" | "sections";

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


function prepareLocationData(locations: { id: string; value: string; label: string; parentId?: string | null }[]) : CreateLocation[] {
  return locations.map(location => ({
    id: location.id,
    name: location.label, 
    parentId: location.parentId || null,
    syncStatus: "IMPORTED" as SyncStatus
  }));
}

const availableCounts = {
  elements: seedElementData.length,
  locations: seedLocationData.length,
  sections: seedSectionData.length,
  components: 0, // This is derived from bankOfDefects
  phrases: 0, // This is derived from bankOfDefects
};

export default function Page() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingEntities, setSyncingEntities] = useState<{
    elements: boolean;
    components: boolean;
    phrases: boolean;
    locations: boolean;
    sections: boolean;
  }>({
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
  const [componentData, setComponentData] = useState<ComponentData[]>([]);
  const [phraseData, setPhraseData] = useState<PhraseData[]>([]);
  const [filters, setFilters] = useState<{ [key in EntityType]?: SyncStatus }>({});
  const [selectedEntity, setSelectedEntity] = useState<EntityType | null>(null);
  const [syncDialog, setSyncDialog] = useState(false);
  const [entitiesToSync, setEntitiesToSync] = useState({
    elements: true,
    components: true,
    phrases: true,
    locations: true,
    sections: true,
  });
  const [seedDialog, setSeedDialog] = useState(false);
  const [entitiesToSeed, setEntitiesToSeed] = useState({
    elements: true,
    components: false,
    phrases: false,
    locations: true,
    sections: true,
  });
  const [removeDialog, setRemoveDialog] = useState(false);
  const [entitiesToRemove, setEntitiesToRemove] = useState({
    elements: true,
    components: true,
    phrases: true,
    locations: true,
    sections: true,
  });

  // Calculate derived counts
  useEffect(() => {
    const mappedComponents = mapBodToComponentData(bankOfDefects, elements);
    const mappedPhrases = mapBodToPhraseData(bankOfDefects, elements, mappedComponents);
    availableCounts.components = mappedComponents.length;
    availableCounts.phrases = mappedPhrases.length;
  }, [elements]);

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

  async function seedAllData() {
    try {
      setIsLoading(true);

      // Clear existing data first
      await Promise.all([
        entitiesToSeed.elements && elementStore.removeAll(),
        entitiesToSeed.components && componentStore.removeAll(),
        entitiesToSeed.phrases && phraseStore.removeAll(),
        entitiesToSeed.locations && locationStore.removeAll(),
        entitiesToSeed.sections && sectionStore.removeAll()
      ].filter(Boolean));

      // Seed sections first since elements depend on them
      if (entitiesToSeed.sections) {
        for (const section of seedSectionData) {
          await sectionStore.add({
            id: section.id,
            name: section.name,
            order: section.order
          });
        }
      }

      // Seed elements
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

      // Seed locations
      if (entitiesToSeed.locations) {
        const locationData = prepareLocationData(seedLocationData);
        for (const location of locationData) {
          await locationStore.add({
            id: location.id,
            name: location.name,
            parentId: location.parentId || null
          });
        }
      }

      const mappedElements = mapElementsToElementData(seedElementData);

      // Prepare and seed components
      if (entitiesToSeed.components && elements.length > 0) {
        const components = mapBodToComponentData(bankOfDefects, mappedElements);
        for (const component of components) {
          await componentStore.add(component);
        }
      }

      // Prepare and seed phrases
      if (entitiesToSeed.phrases && elements.length > 0 && components.length > 0) {
        const phrases = mapBodToPhraseData(bankOfDefects, mappedElements, components);
        for (const phrase of phrases) {
          await phraseStore.add(phrase);
        }
      }

      toast.success("Successfully seeded data");
    } catch (error) {
      console.error("Error seeding data:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  // Dependency checks for seeding
  const canSeedComponents = elements.length > 0 || entitiesToSeed.elements;
  const canSeedPhrases = (elements.length > 0 || entitiesToSeed.elements) && 
                        (components.length > 0 || entitiesToSeed.components);

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
      
      // Remove data for selected entities
      await Promise.all([
        entitiesToRemove.elements && elementStore.removeAll(),
        entitiesToRemove.components && componentStore.removeAll(),
        entitiesToRemove.phrases && phraseStore.removeAll(),
        entitiesToRemove.locations && locationStore.removeAll(),
        entitiesToRemove.sections && sectionStore.removeAll()
      ].filter(Boolean));

      if (entitiesToRemove.components) {
        setComponentData([]);
      }
      if (entitiesToRemove.phrases) {
        setPhraseData([]);
      }

      setRemoveDialog(false);
      toast.success("Successfully removed selected data");
    } catch (error) {
      console.error("Failed to remove data", error);
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
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
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Select Data to Import</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="seed-elements"
                        checked={entitiesToSeed.elements}
                        onCheckedChange={(checked) => 
                          setEntitiesToSeed(prev => ({ 
                            ...prev, 
                            elements: !!checked,
                            // Reset dependent entities if elements are unchecked
                            components: !!checked && prev.components,
                            phrases: !!checked && prev.phrases,
                            sections: !!checked && prev.sections
                          }))
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
                        disabled={!canSeedComponents}
                        onCheckedChange={(checked) => 
                          setEntitiesToSeed(prev => ({ 
                            ...prev, 
                            components: !!checked,
                            // Reset phrases if components are unchecked
                            phrases: !!checked && prev.phrases,
                            sections: !!checked && prev.sections
                          }))
                        }
                      />
                      <label htmlFor="seed-components" className={`text-sm font-medium leading-none ${!canSeedComponents ? 'text-gray-400' : ''}`}>
                        Components ({components.length} / {availableCounts.components} available)
                        {!canSeedComponents && <span className="ml-2 text-xs text-yellow-600">(Requires Elements)</span>}
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="seed-phrases"
                        checked={entitiesToSeed.phrases}
                        disabled={!canSeedPhrases}
                        onCheckedChange={(checked) => 
                          setEntitiesToSeed(prev => ({ ...prev, phrases: !!checked }))
                        }
                      />
                      <label htmlFor="seed-phrases" className={`text-sm font-medium leading-none ${!canSeedPhrases ? 'text-gray-400' : ''}`}>
                        Phrases ({phrases.length} / {availableCounts.phrases} available)
                        {!canSeedPhrases && <span className="ml-2 text-xs text-yellow-600">(Requires Elements & Components)</span>}
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
                      <label htmlFor="seed-locations" className="text-sm font-medium leading-none">
                        Locations ({locations.length} / {availableCounts.locations} available)
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="seed-sections"
                        checked={entitiesToSeed.sections}
                        onCheckedChange={(checked) => 
                          setEntitiesToSeed(prev => ({ ...prev, sections: !!checked }))
                        }
                      />
                      <label htmlFor="seed-sections" className="text-sm font-medium leading-none">
                        Sections ({sections.length} / {availableCounts.sections} available)
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
                      Import Selected
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                onClick={() => setRemoveDialog(true)}
                variant="destructive"
                disabled={isLoading || (elements.length === 0 && components.length === 0 && phrases.length === 0 && locations.length === 0 && sections.length === 0)}
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
                      disabled={elements.length === 0}
                      onCheckedChange={(checked) => 
                        setEntitiesToSync(prev => ({ ...prev, elements: !!checked }))
                      }
                    />
                    <label htmlFor="elements" className={`text-sm font-medium leading-none ${elements.length === 0 ? 'text-gray-400' : ''}`}>
                      Elements ({elements.length})
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="components"
                      checked={entitiesToSync.components}
                      disabled={components.length === 0}
                      onCheckedChange={(checked) => 
                        setEntitiesToSync(prev => ({ ...prev, components: !!checked }))
                      }
                    />
                    <label htmlFor="components" className={`text-sm font-medium leading-none ${components.length === 0 ? 'text-gray-400' : ''}`}>
                      Components ({components.length})
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="phrases"
                      checked={entitiesToSync.phrases}
                      disabled={phrases.length === 0}
                      onCheckedChange={(checked) => 
                        setEntitiesToSync(prev => ({ ...prev, phrases: !!checked }))
                      }
                    />
                    <label htmlFor="phrases" className={`text-sm font-medium leading-none ${phrases.length === 0 ? 'text-gray-400' : ''}`}>
                      Phrases ({phrases.length})
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="locations"
                      checked={entitiesToSync.locations}
                      disabled={locations.length === 0}
                      onCheckedChange={(checked) => 
                        setEntitiesToSync(prev => ({ ...prev, locations: !!checked }))
                      }
                    />
                    <label htmlFor="locations" className={`text-sm font-medium leading-none ${locations.length === 0 ? 'text-gray-400' : ''}`}>
                      Locations ({locations.length})
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="sections"
                      checked={entitiesToSync.sections}
                      disabled={sections.length === 0}
                      onCheckedChange={(checked) => 
                        setEntitiesToSync(prev => ({ ...prev, sections: !!checked }))
                      }
                    />
                    <label htmlFor="sections" className={`text-sm font-medium leading-none ${sections.length === 0 ? 'text-gray-400' : ''}`}>
                      Sections ({sections.length})
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
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div 
              className={`p-4 border rounded-lg transition-colors cursor-pointer
                ${selectedEntity === "elements" ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'hover:border-gray-400'}
              `}
              onClick={() => handleCardClick("elements")}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-medium">Elements</h3>
                  <SyncStatusBadge 
                    status={elementsHydrated ? SyncStatus.Synced : "loading"} 
                    isLoading={syncingEntities.elements || isLoading}
                  />
                </div>
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
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-medium">Components</h3>
                  <SyncStatusBadge 
                    status={componentsHydrated ? SyncStatus.Synced : "loading"} 
                    isLoading={syncingEntities.components || isLoading}
                  />
                </div>
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
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-medium">Phrases</h3>
                  <SyncStatusBadge 
                    status={phrasesHydrated ? SyncStatus.Synced : "loading"} 
                    isLoading={syncingEntities.phrases || isLoading}
                  />
                </div>
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
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-medium">Locations</h3>
                  <SyncStatusBadge 
                    status={locationsHydrated ? SyncStatus.Synced : "loading"} 
                    isLoading={syncingEntities.locations || isLoading}
                  />
                </div>
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

            <div 
              className={`p-4 border rounded-lg transition-colors cursor-pointer
                ${selectedEntity === "sections" ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'hover:border-gray-400'}
              `}
              onClick={() => handleCardClick("sections")}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-medium">Sections</h3>
                  <SyncStatusBadge 
                    status={sectionsHydrated ? SyncStatus.Synced : "loading"} 
                    isLoading={syncingEntities.sections || isLoading}
                  />
                </div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Count: {filters.sections ? sections.length : sections.length}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge
                  status={SyncStatus.Draft}
                  count={sections.filter(s => s.syncStatus === SyncStatus.Draft).length}
                  isActive={filters.sections === SyncStatus.Draft}
                  onClick={() => toggleFilter("sections", SyncStatus.Draft)}
                />
                <StatusBadge
                  status={SyncStatus.Queued}
                  count={sections.filter(s => s.syncStatus === SyncStatus.Queued).length}
                  isActive={filters.sections === SyncStatus.Queued}
                  onClick={() => toggleFilter("sections", SyncStatus.Queued)}
                />
                <StatusBadge
                  status={SyncStatus.Failed}
                  count={sections.filter(s => s.syncStatus === SyncStatus.Failed).length}
                  isActive={filters.sections === SyncStatus.Failed}
                  onClick={() => toggleFilter("sections", SyncStatus.Failed)}
                />
                <StatusBadge
                  status={SyncStatus.Synced}
                  count={sections.filter(s => s.syncStatus === SyncStatus.Synced).length}
                  isActive={filters.sections === SyncStatus.Synced}
                  onClick={() => toggleFilter("sections", SyncStatus.Synced)}
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
                  selectedEntity === "sections" ? sections :
                  []
                } 
                style={defaultStyles} 
                clickToExpandNode={true} 
              />
            </div>
          </div>
        )}

        <Dialog open={removeDialog} onOpenChange={setRemoveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select Data to Remove</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remove-elements"
                  checked={entitiesToRemove.elements}
                  disabled={elements.length === 0}
                  onCheckedChange={(checked) => 
                    setEntitiesToRemove(prev => ({ ...prev, elements: !!checked }))
                  }
                />
                <label htmlFor="remove-elements" className={`text-sm font-medium leading-none ${elements.length === 0 ? 'text-gray-400' : ''}`}>
                  Elements ({elements.length})
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remove-components"
                  checked={entitiesToRemove.components}
                  disabled={components.length === 0}
                  onCheckedChange={(checked) => 
                    setEntitiesToRemove(prev => ({ ...prev, components: !!checked }))
                  }
                />
                <label htmlFor="remove-components" className={`text-sm font-medium leading-none ${components.length === 0 ? 'text-gray-400' : ''}`}>
                  Components ({components.length})
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remove-phrases"
                  checked={entitiesToRemove.phrases}
                  disabled={phrases.length === 0}
                  onCheckedChange={(checked) => 
                    setEntitiesToRemove(prev => ({ ...prev, phrases: !!checked }))
                  }
                />
                <label htmlFor="remove-phrases" className={`text-sm font-medium leading-none ${phrases.length === 0 ? 'text-gray-400' : ''}`}>
                  Phrases ({phrases.length})
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remove-locations"
                  checked={entitiesToRemove.locations}
                  disabled={locations.length === 0}
                  onCheckedChange={(checked) => 
                    setEntitiesToRemove(prev => ({ ...prev, locations: !!checked }))
                  }
                />
                <label htmlFor="remove-locations" className={`text-sm font-medium leading-none ${locations.length === 0 ? 'text-gray-400' : ''}`}>
                  Locations ({locations.length})
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remove-sections"
                  checked={entitiesToRemove.sections}
                  disabled={sections.length === 0}
                  onCheckedChange={(checked) => 
                    setEntitiesToRemove(prev => ({ ...prev, sections: !!checked }))
                  }
                />
                <label htmlFor="remove-sections" className={`text-sm font-medium leading-none ${sections.length === 0 ? 'text-gray-400' : ''}`}>
                  Sections ({sections.length})
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => setRemoveDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={removeSelectedData}
                disabled={!Object.values(entitiesToRemove).some(Boolean)}
              >
                Remove Selected
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
