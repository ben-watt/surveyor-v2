"use client";

import { useEffect, useMemo, useState } from "react";
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
import { phraseStore } from "../clients/Database";
import { Phrase } from "../clients/Dexie";
import { useRouter } from "next/navigation";

type TableData = Phrase

export default function Page() {
  const router = useRouter();
  const [isHydrated, phrases] = phraseStore.useList();

  const columns: ColumnDef<TableData>[] = [
    {
      header: "Name",
      accessorKey: "name",
    },
    {
        header: "Type",
        accessorKey: "type",
      },
    {
        header: "Phrase",
        accessorKey: "phrase",
        cell: (props) => {
          const phrase = props.getValue() as string;
          return <div className="text-wrap">{phrase.substring(0, 100) + "..."}</div>;
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
              <Link href={`phrases/${id}`}>
                <DropdownMenuItem>Edit</DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div>
      <div className="flex justify-between mb-5 mt-5 items-baseline">
        <div>
          <h1 className="text-3xl dark:text-white">Phrases</h1>
          <p className="text-sm text-muted-foreground">Phrases are used to generate standard text for surveys and can be used for Conditions or Defects.</p>
        </div>
      </div>
      <DataTable columns={columns} data={phrases} onCreate={() => router.push("/phrases/create")} />
    </div>
  );
}
