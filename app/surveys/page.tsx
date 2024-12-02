"use client";

import { CopyMarkupBtn } from "@/app/components/Buttons";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BuildingSurveyFormData } from "./building-survey-reports/BuildingSurveyReportSchema";

import { ColumnDef } from "@tanstack/react-table";

import { v4 } from "uuid";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, SortableHeader } from "../components/DataTable";
import { surveyStore } from "@/app/clients/Database";
import { Badge } from "@/components/ui/badge";


type TableData = BuildingSurveyFormData;

function HomePage() {
  const [isHydrated, data] = surveyStore.useList();
  const [createId, setCreateId] = useState<string>("");


  useEffect(() => {
    setCreateId(v4());
  }, []);

  const deleteSurvey = async (id: string) => {
    try {
      surveyStore.remove(id);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <div className="flex justify-between mb-5 mt-5 items-baseline">
        <div>
          <h1 className="text-3xl dark:text-white">Surveys</h1>
        </div>
        <div>
          <Link href={`/surveys/${createId}`}>
            <CopyMarkupBtn>Create</CopyMarkupBtn>
          </Link>
        </div>
      </div>
      <div>
        {RenderTable()}
      </div>
    </div>
  );

  function RenderTable() {
    const columns: ColumnDef<TableData>[] = [
      {
        header: "Id",
        accessorFn: (v) => "#" + v?.id?.split("-")[0] || "N/A",
      },
      {
        header: "Client Name",
        accessorKey: "reportDetails.clientName",
      },
      {
        header: "Address",
        accessorKey: "reportDetails.address",
      },
      {
        header: "Owner",
        accessorKey: "owner.name",
        cell: (props) => {
          return (
            <Badge>{props.getValue() as string || "unknown"}</Badge>
          )
        }
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: (props) => {
          return (
            <Badge>{props.getValue() as string}</Badge>
          )
        }
      },
      {
        id: "created",
        header: ({ column }) => <SortableHeader column={column} header="Created" />,
        accessorFn: (v) => new Date(v.reportDetails.reportDate),
        cell: (props) => (props.getValue() as Date).toDateString(),
        sortingFn: 'datetime',
      },
      {
        id: "actions",
        cell: (props) => {
          const reportId = props.row.original.id;
          const showGenerate = props.row.original.status === "created";

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => navigator.clipboard.writeText(reportId)}
                >
                  Copy report ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link href={`surveys/${reportId}`}>
                    Edit survey
                  </Link>
                </DropdownMenuItem>
                {showGenerate && (<DropdownMenuItem>
                  <Link href={`/reports/reportv2/${reportId}`}>
                    Generate report
                  </Link>
                </DropdownMenuItem>)}
                <DropdownMenuItem className="text-red-500"
                  onClick={() => deleteSurvey(reportId)}
                >
                  <span className="text-red-500">Delete survey</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ];

    return <DataTable initialState={{ sorting: [{ id: "created", desc: true }]}} columns={columns} data={data.map(x => x.content)} />
  }
}

export default HomePage;