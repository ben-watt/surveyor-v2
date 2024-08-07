"use client";

import { useEffect, useState } from "react";
import client from "@/app/clients/ReportsClient";
import { type Schema } from "@/amplify/data/resource";
import Link from "next/link";
import { CopyMarkupBtn } from "@/app/components/Buttons";
import { ColumnDef } from "@tanstack/react-table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { DataTable, SortableHeader } from "@/app/components/DataTable";

type ElementData = Schema["Elements"]["type"];

export default function Page() {
  const [elementData, setElementData] = useState<ElementData[]>([]);

  const columns: ColumnDef<ElementData>[] = [
    {
      header: "Name",
      accessorKey: "name"
    },
    {
      id: "priority",
      header: ({ column }) => <SortableHeader column={column} header="Priority" />,
      accessorFn: (v) => v.priority ? v.priority : 0,
    },
    {
      id: "created",
      header: ({ column }) => <SortableHeader column={column} header="Created" />,
      accessorFn: (v) => new Date(v.createdAt).toDateString(),
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
              <DropdownMenuItem className="text-red-500"
                onClick={() => deleteFn(rowId)}
              >
                <span className="text-red-500">Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    }
  ];

  useEffect(() => {
    async function fetchReports() {
      try {
        const response = await client.models.Elements.list();

        if (response.data) {
          setElementData(response.data);
        }
      } catch (error) {
        console.log(error);
      }
    }

    fetchReports();
  }, []);

  function deleteFn(id: string): void {
    async function deleteAsync() {
      try {
        const response = await client.models.Elements.delete({ id });
        if (!response.errors && response.data != null) {
          setElementData(elementData.filter((r) => r.id !== id));
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
          <h1 className="text-3xl dark:text-white">Elements</h1>
        </div>
        <Link href="/elements/create">
          <CopyMarkupBtn>Create</CopyMarkupBtn>
        </Link>
      </div>
      <DataTable columns={columns} data={elementData} />
    </div>
  );
}