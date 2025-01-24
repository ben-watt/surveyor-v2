"use client";

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
import { componentStore, elementStore, sectionStore } from "../clients/Database";
import { Element as ElementData } from "../clients/Dexie";

export default function Page() {
  const router = useRouter();
  const [elementsHydrated, elements] = elementStore.useList();
  const [componentsHydrated, components] = componentStore.useList();
  const [sectionsHydrated, sections] = sectionStore.useList();

  const columns: ColumnDef<ElementData>[] = [
    {
      header: "Name",
      accessorKey: "name",
    },
    {
      header: "Section",
      accessorKey: "sectionId",
      cell: (props) => {
        const sectionId = props.getValue() as string;
        const section = sections.find(s => s.id === sectionId);
        return section ? section.name : "Unknown";
      }
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
      id: "component count",
      header: "Component Count",
      accessorFn: (v) => components.filter(c => c.elementId === v.id).length, 
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
              <Link href={`/elements/${rowId}`}>
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
    async function deleteAsync() {
      try {
        await elementStore.remove(id);
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
          <h1 className="text-3xl dark:text-white">Elements</h1>
          <p className="text-sm text-muted-foreground">Elements are the top level parts of a building and are used to group components.</p>
        </div>
      </div>
      <DataTable
        initialState={{ sorting: [{ id: "order", desc: false }] }}
        columns={columns}
        data={elements}
        isLoading={elementsHydrated && componentsHydrated && sectionsHydrated}
        onCreate={() => router.push("/elements/create")}
      />
    </div>
  );
}
