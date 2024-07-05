"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import reportClient from "../clients/ReportsClient";
import toast from "react-hot-toast";
import { Schema } from "@/amplify/data/resource";

const selectionSet = ["id"] as const;
type ElementData = Pick<Schema["Elements"]["type"], "name" | "description" | "priority">;

const seedElementData: ElementData[] = [
  {
    name: "Foundations and Substructure",
    description: "",
    priority: 1,
  },
  {
    name: "Roof Coverings",
    description: "",
    priority: 2,
  },
  {
    name: "Chimneys",
    description: "",
    priority: 3,
  },
  {
    name: "Rainwater Disposal System",
    description: "",
    priority: 4,
  },
  {
    name: "Sofits and Fascias",
    description: "",
    priority: 5,
  },
  {
    name: "Main Walls",
    description: "",
    priority: 6,
  },
  {
    name: "Windows and Doors",
    description: "",
    priority: 7,
  },
  {
    name: "Roof Structure",
    description: "",
    priority: 8,
  },
  {
    name: "Ceilings",
    description: "",
    priority: 9,
  },
  {
    name: "Walls and Partitions",
    description: "",
    priority: 10,
  },
  {
    name: "Floors",
    description: "",
    priority: 11,
  },
  {
    name: "Internal Joinery",
    description: "",
    priority: 12,
  },
  {
    name: "Sanitaryware & Kitchen",
    description: "",
    priority: 13,
  },
  {
    name: "Fireplaces",
    description: "",
    priority: 14,
  },
  {
    name: "Electrical Installation",
    description: "",
    priority: 15,
  },
  {
    name: "Gas Installations",
    description: "",
    priority: 16,
  },
  {
    name: "Cold Water Supply",
    description: "",
    priority: 17,
  },
  {
    name: "Hot Water Supply / Heating Installations",
    description: "",
    priority: 18,
  },
  {
    name: "Surface water & Soil drainage",
    description: "",
    priority: 19,
  },
  {
    name: "Boundaries, Fencing, Drives, Lawn, etc",
    description: "",
    priority: 20,
  }
]

export default function Page() {
  const [elementIds, setElementIds] = useState<string[]>([]);

  useEffect(() => {
    async function fetchReports() {
      try {
        const response = await reportClient.models.Elements.list({
          selectionSet: selectionSet,
        });

        if (response.data) {
          setElementIds(response.data.map((e) => e.id));
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
        const response = await reportClient.models.Elements.create(element);

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
    const tasks = elementIds.map(async (elementId) => {
      const response = await reportClient.models.Elements.delete({ id: elementId });
      if (response.data) {
        setElementIds((prev) => prev.filter((e) => e !== elementId));
      } else {
        console.error("Failed to delete element", elementId);
        toast.error("Failed to delete element");
      }
    });

    await Promise.all(tasks);
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
      </div>
    </>
  );
}
