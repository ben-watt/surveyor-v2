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

type ElementData = Pick<Schema["Elements"]["type"], "name" | "description" | "order" | "section"> & { id?: string };
const seedElementData: ElementData[] = elements;

type ComponentData = Omit<Schema["Components"]["type"], "owner" | "createdAt" | "updatedAt" | "element" | "id">;
type ComponentDataView = ComponentData;

export default function Page() {
  const [elementIds, setElementIds] = useState<string[]>([]);
  const [elements, setElements] = useState<ElementData[]>([]);
  const [componentData, setComponentData] = useState<ComponentData[]>([]);

  useEffect(() => {
    const componentData = mapBodToComponentData(bankOfDefects, elements);
    setComponentData(componentData);
  }, [elements])


  function mapBodToComponentData(bod: typeof bankOfDefects, elements: ElementData[]): ComponentDataView[] {
    let componentData: ComponentDataView[] = [];
  
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
            elementId: matchingElement?.id || "",
            name: d.type,
            materials: [{
              name: d.specification,
              defects: [{ name: d.defect.toString(), description: d.level2Wording}]
            }],
            syncStatus: "SYNCED"
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
      const componentIds  = await client.models.Components.list();
      componentIds.data?.map(async (component) => {
        const response = await client.models.Components.delete({ id: component.id });
        if (response.data) {
          console.log("Deleted component", component);
        } else {
          console.error("Failed to delete component", component);
          toast.error("Failed to delete component");
        }
      });
    }

    await Promise.all([removeElements, removeComponents()]);
  }

  async function seedComponentData() {
    try {
      const tasks = componentData.map(async (component) => {
        const response = await client.models.Components.create(component);

        if (response.data) {
          console.log("Created component", component);
        } else {
          console.error("Failed to seed component", component);
          toast.error(`Failed to seed component ${component.name}`);
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
