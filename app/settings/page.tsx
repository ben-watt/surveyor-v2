"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Schema } from "@/amplify/data/resource";

import { JsonView, allExpanded, defaultStyles } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';

import {matchSorter} from 'match-sorter';

import bankOfDefects from "./defects.json";
import elements from "./elements.json";
import { db } from "../clients/Database";

type ElementData = Pick<Schema["Elements"]["type"], "name" | "description" | "order" | "section"> & { id?: string };
const seedElementData: ElementData[] = elements;

type ComponentData = Omit<Schema["Components"]["type"], "owner" | "createdAt" | "updatedAt" | "element" | "id">;
type ComponentDataView = ComponentData;

export default function Page() {
  const [componentData, setComponentData] = useState<ComponentData[]>([]);
  const [loadingElements, elements] = db.elements.useList();
  const [loadingComponents, components] = db.components.useList();

  useEffect(() => {
    if(loadingElements) return;
    const componentData = mapBodToComponentData(bankOfDefects, elements);
    setComponentData(componentData);
  }, [elements, loadingElements])


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
          console.log("[matchSorter]", elements, sheet.elementName);
          const matchingElement = matchSorter(elements, sheet.elementName, { keys: ["name"] }).at(0);
          console.log("[matching element]", matchingElement);
          componentData.push({
            elementId: matchingElement?.id ?? "",
            name: d.type,
            materials: [{
              name: d.specification,
              defects: [{ name: d.defect.toString(), description: d.level2Wording}]
            }]
          })
        }
      })
    });
  
    return componentData;
  }

  async function seedData() {
    try {
      const elementDataSeedTasks = seedElementData.map(async (element) => {
        return db.elements.add({
          name: element.name,
          description: element.description ?? "",
          order: element.order ?? 0,
          section: element.section
        });
      });

      await Promise.all(elementDataSeedTasks);
    } catch (error) {
      console.error("Failed to seed elements", error);
    }
  }

  async function removeData() {
    const removeElements = elements.map(async (e) => {
      db.elements.delete(e.id);
    });

    const removeComponents = components.map(async c => {
      await db.components.delete(c.id);
    })

    await Promise.all([removeElements, removeComponents]);
  }

  async function seedComponentData() {
    try {
      const tasks = componentData.map(async (component) => {
        try {
          await db.components.add({
            elementId: component.elementId,
            name: component.name,
          });
        } catch(error) {
          console.error("Failed to seed component", component);
          toast.error(`Failed to seed component ${component.name}`);
        }
        
        console.log("Created component", component);
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
                <div>{elements.length}</div>
              </div>
              <div className="flex gap-4">
                <div>Components</div>
                <div>{components.length}</div>
              </div>
            </li>
          </ul>
        </div>
        <div className="mt-4 mb-4">
          <Button
            onClick={() => seedData()}
            variant="default"
            disabled={elements.length > 0}
          >
            Seed Data
          </Button>
        </div>
        <div className="mt-4 mb-4">
          <Button
            onClick={() => removeData()}
            variant="destructive"
            disabled={elements.length == 0}
          >
            Remove Data
          </Button>
        </div>
        <h2>Component Data</h2>
        <Button onClick={() => seedComponentData()}>Seed Component Data</Button>
        <JsonView data={componentData} shouldExpandNode={allExpanded} style={defaultStyles} clickToExpandNode={true} />
      </div>
    </>
  );
}
