"use client";

import { useEffect, useMemo, useState } from "react";
import client from "@/app/app/clients/AmplifyDataClient";
import { type Schema } from "@/amplify/data/resource";
import Link from "next/link";
import { CopyMarkupBtn } from "@/app/app/components/Buttons";
import { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { DataTable, SortableHeader } from "@/app/app/components/DataTable";
import { SelectionSet } from "aws-amplify/api";
import { componentStore, elementStore } from "../clients/Database";
import { Component, Element } from "../clients/Dexie";
import { useRouter } from "next/navigation";

type TableData = Component & {
  element: Element;
}

export default function Page() {
  const router = useRouter();
  const [isHydrated, components] = componentStore.useList();
  const [data, setData] = useState<TableData[]>([]);

  useEffect(() => {
    components.forEach(async (component) => {
      const element = await elementStore.get(component.elementId);
      setData((prev) => [...prev, { ...component, element }]);
    });
  }, [components]);

  const columns: ColumnDef<TableData>[] = [
    {
      header: "Name",
      accessorKey: "name",
    },
    {
      id: "element",
      header: ({ column }) => (
        <SortableHeader column={column} header="Element" />
      ),
      accessorFn: (v) => v.element.name,
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
              <Link href={`/app/building-components/${id}`}>
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

  function deleteDefect(id: string): void {
    async function deleteDefect() {
      try {
        await componentStore.remove(id);
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
          <p className="text-sm text-muted-foreground">Components are are the priamary items inspected during a building survey.</p>
        </div>
      </div>
      <DataTable columns={columns} data={data} onCreate={() => router.push("/app/building-components/create")} />
    </div>
  );
}
