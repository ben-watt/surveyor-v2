"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import client from "../clients/AmplifyDataClient";
import toast from "react-hot-toast";
import { Schema } from "@/amplify/data/resource";
import { JsonView, defaultStyles } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import { matchSorter } from 'match-sorter';
import bankOfDefects from "./defects.json";
import elements from "./elements.json";
import { componentStore, elementStore, phraseStore } from "../clients/Database";
import { Component, SyncStatus } from "../clients/Dexie";

// Type definitions
type ElementData = Pick<Schema["Elements"]["type"], "name" | "description" | "order" | "section"> & { id: string };
type ComponentData = Omit<Component, "owner" | "createdAt" | "updatedAt" | "syncStatus"> & { id: string };
type PhraseData = Omit<Schema["Phrases"]["type"], "owner" | "createdAt" | "updatedAt"> & { id: string };

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

type EntityType = "elements" | "components" | "phrases";
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

export default function Page() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingEntities, setSyncingEntities] = useState<{
    elements: boolean;
    components: boolean;
    phrases: boolean;
  }>({
    elements: false,
    components: false,
    phrases: false,
  });
  const [elementsHydrated, elements] = elementStore.useList();
  const [componentsHydrated, components] = componentStore.useList();
  const [phrasesHydrated, phrases] = phraseStore.useList();
  const [componentData, setComponentData] = useState<ComponentData[]>([]);
  const [phraseData, setPhraseData] = useState<PhraseData[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [selectedEntity, setSelectedEntity] = useState<EntityType | null>(null);

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
        phraseStore.removeAll()
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
      
      // Clear existing data
      await removeAllData();

      // Seed elements
      const elementTasks = seedElementData.map(async (element) => {
        const elementWithId = {
          ...element,
          id: crypto.randomUUID(),
        };
        await elementStore.add(elementWithId);
        return elementWithId;
      });
      const newElements = await Promise.all(elementTasks);

      // Seed components
      const newComponents = mapBodToComponentData(bankOfDefects, newElements);
      await Promise.all(
        newComponents.map(component => componentStore.add(component))
      );
      setComponentData(newComponents);

      // Seed phrases
      const newPhrases = mapBodToPhraseData(bankOfDefects, newElements, newComponents);
      await Promise.all(
        newPhrases.map(phrase => client.models.Phrases.create(phrase))
      );
      setPhraseData(newPhrases);

      toast.success("Successfully seeded all data");
    } catch (error) {
      console.error("Failed to seed data", error);
      toast.error("Failed to seed data");
    } finally {
      setIsLoading(false);
    }
  }

  async function syncWithServer() {
    try {
      setIsSyncing(true);
      setSyncingEntities({
        elements: true,
        components: true,
        phrases: true,
      });

      await Promise.all([
        elementStore.syncWithServer().finally(() => 
          setSyncingEntities(prev => ({ ...prev, elements: false }))
        ),
        componentStore.syncWithServer().finally(() => 
          setSyncingEntities(prev => ({ ...prev, components: false }))
        ),
        phraseStore.syncWithServer().finally(() => 
          setSyncingEntities(prev => ({ ...prev, phrases: false }))
        )
      ]);

      toast.success("Successfully synced with server");
    } catch (error) {
      console.error("Failed to sync with server", error);
      toast.error("Failed to sync with server");
    } finally {
      setIsSyncing(false);
      setSyncingEntities({
        elements: false,
        components: false,
        phrases: false,
      });
    }
  }

  // Filter data based on selected status
  const filteredElements = elements.filter(e => !filters.elements || e.syncStatus === filters.elements);
  const filteredComponents = components.filter(c => !filters.components || c.syncStatus === filters.components);
  const filteredPhrases = phrases.filter(p => !filters.phrases || p.syncStatus === filters.phrases);

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
              <Button
                onClick={syncWithServer}
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
              <Button
                onClick={seedAllData}
                variant="default"
                disabled={isLoading || elements.length > 0}
              >
                Seed All Data
              </Button>
              <Button
                onClick={removeAllData}
                variant="destructive"
                disabled={isLoading || elements.length === 0}
              >
                Remove All Data
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
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
                  filteredPhrases
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
