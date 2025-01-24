"use client";

import React from "react";
import client from "@/app/app/clients/AmplifyDataClient";
import { type Schema } from "@/amplify/data/resource";
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
import { useAsyncArrayState } from "../hooks/useAsyncState";
import { SelectionSet } from "aws-amplify/api";
import { useRouter } from "next/navigation";

type SectionData = Schema["Sections"]["type"];
const selectionSet = ["id", "name", "order", "createdAt", "elements.id"] as const;
type SelectedSectionData = SelectionSet<SectionData, typeof selectionSet>;

export default function Page() {
  const router = useRouter();
  const [isLoading, sectionData, setSectionData] = useAsyncArrayState(fetchSections);

  const columns: ColumnDef<SelectedSectionData>[] = [
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
      id: "element count",
      header: "Element Count",
      accessorFn: (v) => v.elements.length,
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
      }
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
              <Link href={`/sections/${rowId}`}>
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

  async function fetchSections() {
    try {
      const response = await client.models.Sections.list({
        selectionSet: selectionSet,
      });
      if (response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.log(error);
    }
  }

  function deleteFn(id: string): void {
    async function deleteAsync() {
      try {
        const response = await client.models.Sections.delete({ id });
        if (!response.errors && response.data != null) {
          setSectionData(sectionData.filter((r: SelectedSectionData) => r.id !== id));
        }
      } catch (error) {
        console.error(error);
      }
    }

    deleteAsync();
  }

  return (
    <div>
      <div className="flex justify-between mb-5 mt-5 items-baseline">
        <div>
          <h1 className="text-3xl dark:text-white">Sections</h1>
          <p className="text-sm text-muted-foreground">Sections are used to group elements in a building survey report.</p>
        </div>
      </div>
      <DataTable
        initialState={{ sorting: [{ id: "order", desc: false }] }}
        columns={columns}
        data={sectionData}
        isLoading={isLoading}
        onCreate={() => router.push("/sections/create")}
      />
    </div>
  );
} 