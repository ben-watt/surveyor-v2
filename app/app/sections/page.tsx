"use client";

import React from "react";
import Link from "next/link";
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
import { useRouter } from "next/navigation";
import { sectionStore } from "../clients/Database";
import { Section } from "../clients/Dexie";
import { elementStore } from "../clients/Database";

export default function Page() {
  const router = useRouter();
  const [isHydrated, sections] = sectionStore.useList();
  const [elementsHydrated, elements] = elementStore.useList();
  const isLoading = !isHydrated || !elementsHydrated;

  const columns: ColumnDef<Section>[] = [
    {
      header: "Name",
      accessorKey: "name",
    },
    {
      id: "order",
      header: ({ column }) => <SortableHeader column={column} header="Order" />,
      accessorFn: (v) => (v.order ? v.order : 0),
      meta: {
        tw: {
          headerClassName: "text-right",
          cellClassName: "text-right",
        },
      },
    },
    {
      id: "element_count",
      header: "Element Count",
      accessorFn: (v) => elements.filter((e) => e.sectionId === v.id).length,
      meta: {
        tw: {
          headerClassName: "text-right",
          cellClassName: "text-right",
        },
      },
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
        const rowId = props.row.original.id;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Link href={`/app/sections/${rowId}`}>
                <DropdownMenuItem>Edit</DropdownMenuItem>
              </Link>
              <DropdownMenuItem
                className="text-red-500"
                onClick={() => deleteFn(rowId)}
              >
                <span className="text-red-500">Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  function deleteFn(id: string): void {
    sectionStore.remove(id);
  }

  return (
    <div>
      <div className="flex justify-between mb-5 mt-5 items-baseline">
        <div>
          <h1 className="text-3xl dark:text-white">Sections</h1>
          <p className="text-sm text-muted-foreground">
            Sections are used to group elements in a building survey report.
          </p>
        </div>
      </div>
      <DataTable
        initialState={{
          sorting: [{ id: "order", desc: false }],
          columnVisibility: {
            name: true,
            order: true,
            actions: true,
            element_count: false,
            created: false,
          },
        }}
        columns={columns}

        data={sections}
        isLoading={isLoading}
        onCreate={() => router.push("/app/sections/create")}
      />
    </div>
  );
}
