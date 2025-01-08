"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import client from "../clients/AmplifyDataClient";
import toast from "react-hot-toast";
import { Schema } from "@/amplify/data/resource";

import { JsonView, allExpanded, defaultStyles } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';

import {matchSorter} from 'match-sorter';

import bankOfDefects from "./defects.json";
import elements from "./elements.json";
import { componentStore, CreateComponent } from "../clients/Database";
import { Component } from "../clients/Dexie";

type ElementData = Pick<Schema["Elements"]["type"], "name" | "description" | "order" | "section"> & { id?: string };
const seedElementData: ElementData[] = elements;

type ComponentData = Omit<Component, "owner" | "createdAt" | "updatedAt" | "syncStatus"> & { id: string };

export default function Page() {
  const [elementIds, setElementIds] = useState<string[]>([]);
  const [elements, setElements] = useState<ElementData[]>([]);
  const [componentData, setComponentData] = useState<ComponentData[]>([]);

  useEffect(() => {
    const componentData = mapBodToComponentData(bankOfDefects, elements);
    setComponentData(componentData);
  }, [elements])


  function mapBodToComponentData(bod: typeof bankOfDefects, elements: ElementData[]): ComponentData[] {
    let componentData: ComponentData[] = [];
  
    bod.forEach((sheet) => {
      sheet.defects.forEach(d => {
        const existingComponent = componentData.find(c => c.name === d.type);
        if(existingComponent) {
          const existingMaterial = existingComponent.materials.find(m => m.name === d.specification);
          if(existingMaterial) {
            existingMaterial.defects.push({ name: d.defect.toString(), description: d.level2Wording});
          } else {
            existingComponent.materials.push({
              name: d.specification,
              defects: [{ name: d.defect.toString(), description: d.level2Wording}]
            })
          }
        }
        else {
          const matchingElement = matchSorter(elements, sheet.elementName, { keys: ["name"] }).at(0);
          componentData.push({
            id: crypto.randomUUID(),
            elementId: matchingElement?.id || "",
            name: d.type,
            materials: [{
              name: d.specification,
              defects: [{ name: d.defect.toString(), description: d.level2Wording}]
            }],
          })
        }
      })
    });
  
    return componentData;
  }

  useEffect(() => {
    async function fetchReports() {
      try {
        const response = await client.models.Elements.list();

        if (response.data) {
          setElementIds(response.data.map((e) => e.id));
          setElements(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch elements", error);
      }
    }
    fetchReports();
  }, []);

  async function seedData() {
    try {
      const tasks = seedElementData.map(async (element) => {
        const response = await client.models.Elements.create(element);

        if (response.data) {
          setElementIds((prev) => [...prev, response!.data!.id]);
        } else {
          console.error("Failed to seed element", element);
          toast.error("Failed to seed element");
        }
      });

      await Promise.all(tasks);
    } catch (error) {
      console.error("Failed to seed elements", error);
    }
  }

  async function removeData() {
    const removeElements = elementIds.map(async (elementId) => {
      const response = await client.models.Elements.delete({ id: elementId });
      if (response.data) {
        setElementIds((prev) => prev.filter((e) => e !== elementId));
      } else {
        console.error("Failed to delete element", elementId);
        toast.error("Failed to delete element");
      }
    });

    const removeComponents = async function() {
      try {
        await componentStore.removeAll();
      } catch (error) {
        console.error("Failed to delete components");
        toast.error("Failed to delete component");
      }
    }

    await Promise.all([Promise.all(removeElements), removeComponents()]);
  }

  async function seedComponentData() {
    try {
      const tasks = componentData.map(async (component) => {
        try {
          await componentStore.add(component);
        } catch (error) {
          console.error("Failed to seed component", component, error);
        }
      });

      await Promise.all(tasks);
    } catch (error) {
      console.error("Failed to seed components", error);
      toast.error("Failed to seed components");
    }
  }

  return (
    <>
      <div>
        <h1 className="text-3xl dark:text-white">Settings</h1>
      </div>
      <div className="m-4">
        <h2 className="text-2xl dark:text-white">Data</h2>
        <div>
          <ul>
            <li>
              <div className="flex gap-4">
                <div>Elements</div>
                <div>{elementIds.length}</div>
              </div>
            </li>
          </ul>
        </div>
        <div className="mt-4 mb-4">
          <Button
            onClick={() => seedData()}
            variant="default"
            disabled={elementIds.length > 0}
          >
            Seed Data
          </Button>
        </div>
        <div className="mt-4 mb-4">
          <Button
            onClick={() => removeData()}
            variant="destructive"
            disabled={elementIds.length == 0}
          >
            Remove Data
          </Button>
        </div>
        <h2>Component Data</h2>
        <JsonView data={componentData} shouldExpandNode={allExpanded} style={defaultStyles} clickToExpandNode={true} />
        <Button onClick={() => seedComponentData()}>Seed Component Data</Button>
      </div>
    </>
  );
}
