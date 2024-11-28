"use client";

import { useEffect, useState } from "react";
import client from "@/app/clients/AmplifyDataClient";
import { type Schema } from "@/amplify/data/resource";
import Link from "next/link";
import { CopyMarkupBtn } from "@/app/components/Buttons";
import { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { DataTable, SortableHeader } from "@/app/components/DataTable";
import { SelectionSet } from "aws-amplify/api";

const selectionSet = ["id", "name", "elementId", "materials.*", "createdAt", "element.name"] as const;
type ComponentData = Omit<SelectionSet<Schema["Components"]["type"], typeof selectionSet>, "materials">;
type Material = Schema["Material"]["type"];
type ComponentDataWithChild = ComponentData & { materials: Material[] };

export default function Page() {
  const [data, setData] = useState<ComponentDataWithChild[]>([]);
  const [search, setSearch] = useState<string>("");

  const columns: ColumnDef<ComponentDataWithChild>[] = [
    {
      header: "Name",
      accessorKey: "name",
    },
    {
      id: "element",
      header: ({ column }) => (
        <SortableHeader column={column} header="Element" />
      ),
      accessorFn: (v) => v.element?.name,
    },
    {
      header: "Materials Count",
      accessorFn: (v) => v.materials.length,
    },
    {
      header: "Defect Count",
      accessorFn: (v) => v.materials.reduce((acc, m) => acc + m.defects.length, 0),
    },
    {
      id: "created",
      header: ({ column }) => (
        <SortableHeader column={column} header="Created" />
      ),
      accessorFn: (v) => new Date(v.createdAt),
      cell: (props) => {
        const date = props.getValue() as Date;
        return date.toLocaleDateString();
      },
    },
    {
      id: "actions",
      cell: (props) => {
        const id = props.row.original.id;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Link href={`building-components/edit/${id}`}>
                <DropdownMenuItem>Edit</DropdownMenuItem>
              </Link>
              <DropdownMenuItem
                className="text-red-500"
                onClick={() => deleteDefect(id)}
              >
                <span className="text-red-500">Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await client.models.Components.list({
          selectionSet: selectionSet,
        });

        if (response.data) {
          setData(response.data as ComponentDataWithChild[]);
        }
      } catch (error) {
        console.log(error);
      }
    }

    fetchData();
  }, [search]);

  function deleteDefect(id: string): void {
    async function deleteDefect() {
      try {
        const response = await client.models.Components.delete({ id });
        if (!response.errors && response.data != null) {
          setData(data.filter((r) => r.id !== id));
        }
      } catch (error) {
        console.error(error);
      }
    }

    deleteDefect();
  }

  return (
    <div>
      <div className="flex justify-between mb-5 mt-5 items-baseline">
        <div>
          <h1 className="text-3xl dark:text-white">Components</h1>
        </div>
        <Link href="/building-components/create">
          <CopyMarkupBtn>Create</CopyMarkupBtn>
        </Link>
      </div>
      <DataTable columns={columns} data={data} />
    </div>
  );
}
