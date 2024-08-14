"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import reportClient from "../clients/ReportsClient";
import toast from "react-hot-toast";
import { Schema } from "@/amplify/data/resource";

const selectionSet = ["id"] as const;
type ElementData = Pick<Schema["Elements"]["type"], "name" | "description" | "order" | "section">;

const seedElementData: ElementData[] = [
  {
    name: "Foundations and Substructure",
    description: "",
    order: 1,
    section: "External Condition of Property",
  },
  {
    name: "Roof Coverings",
    description: "",
    order: 2,
    section: "External Condition of Property",
  },
  {
    name: "Chimneys",
    description: "",
    order: 3,
    section: "External Condition of Property",
  },
  {
    name: "Rainwater Disposal System",
    description: "",
    order: 4,
    section: "External Condition of Property",
  },
  {
    name: "Sofits and Fascias",
    description: "",
    order: 5,
    section: "External Condition of Property",
  },
  {
    name: "Main Walls",
    description: "",
    order: 6,
    section: "External Condition of Property",
  },
  {
    name: "Windows and Doors",
    description: "",
    order: 7,
    section: "External Condition of Property",
  },
  {
    name: "Roof Structure",
    description: "",
    order: 8,
    section: "External Condition of Property",
  },
  {
    name: "Ceilings",
    description: "",
    order: 9,
    section: "External Condition of Property",
  },
  {
    name: "Walls and Partitions",
    description: "",
    order: 10,
    section: "Internal Condition of Property",
  },
  {
    name: "Floors",
    description: "",
    order: 11,
    section: "Internal Condition of Property",
  },
  {
    name: "Internal Joinery",
    description: "",
    order: 12,
    section: "Internal Condition of Property",
  },
  {
    name: "Sanitaryware & Kitchen",
    description: "",
    order: 13,
    section: "Internal Condition of Property",
  },
  {
    name: "Fireplaces",
    description: "",
    order: 14,
    section: "Internal Condition of Property",
  },
  {
    name: "Electrical Installation",
    description: "",
    order: 15,
    section: "Services",
  },
  {
    name: "Gas Installations",
    description: "",
    order: 16,
    section: "Services",
  },
  {
    name: "Cold Water Supply",
    description: "",
    order: 17,
    section: "Services",
  },
  {
    name: "Hot Water Supply / Heating Installations",
    description: "",
    order: 18,
    section: "Services",
  },
  {
    name: "Surface water & Soil drainage",
    description: "",
    order: 19,
    section: "Services",
  },
  {
    name: "Boundaries, Fencing, Drives, Lawn, etc",
    description: "",
    order: 20,
    section: "Grounds (External Areas)",
  }
]

export default function Page() {
  const [elementIds, setElementIds] = useState<string[]>([]);

  useEffect(() => {
    async function fetchReports() {
      try {
        const response = await reportClient.models.Elements.list();

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
