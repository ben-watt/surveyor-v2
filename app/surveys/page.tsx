"use client";

import { CopyMarkupBtn } from "@/app/components/Buttons";
import client from "@/app/clients/ReportsClient";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BuildingSurveyFormData } from "./building-survey-reports/BuildingSurveyReportSchema";

import { ColumnDef } from "@tanstack/react-table";

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

function HomePage() {
  const [surveys, setSurveys] = useState<BuildingSurveyFormData[]>([]);

  useEffect(() => {
    async function fetchSurveys() {
      try {
        const response = await client.models.Reports.list();
        const reports = response.data.map((i) =>
          JSON.parse(i.content as string)
        );
        setSurveys(reports);
      } catch (error) {
        console.log(error);
      }
    }

    fetchSurveys();
  }, []);

  const deleteSurvey = async (id: string) => {
    try {
      const response = await client.models.Reports.delete({ id });
      if (!response.errors && response.data != null) {
        setSurveys(surveys.filter((r) => r.id !== id));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <div className="flex justify-between p-3 mb-5 mt-5 items-baseline">
        <div>
          <h1 className="text-3xl dark:text-white">Surveys</h1>
        </div>
        <div>
          <Link href="/surveys/create">
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
    const columns: ColumnDef<BuildingSurveyFormData>[] = [
      {
        header: "Id",
        accessorFn: (v) => "#" + v?.id?.split("-")[0] || "N/A",
      },
      {
        header: "Client Name",
        accessorKey: "clientName",
      },
      {
        header: "Address",
        accessorKey: "address",
      },
      {
        id: "created",
        header: ({ column }) => <SortableHeader column={column} header="Created" />,
        accessorFn: (v) => new Date(v.reportDate).toDateString(),
      },
      {
        id: "actions",
        cell: (props) => {
          const reportId = props.row.original.id;

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
                <DropdownMenuItem>
                  <Link href={`/surveys/${reportId}/report`}>
                    Generate report
                  </Link>
                </DropdownMenuItem>
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

    return <DataTable columns={columns} data={surveys} />
  }
}

export default HomePage;