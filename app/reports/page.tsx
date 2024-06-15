"use client";

import { CopyMarkupBtn } from "@/app/components/Buttons";
import client from "@/app/clients/ReportsClient";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BuildingSurveyFormData } from "./building-survey-reports/BuildingSurveyReportData";
import { DropDown, DropDownItem } from "../components/DropDown";
import { Table, TableRow } from "@/app/components/Table";

function HomePage() {
  const [reports, setReports] = useState<BuildingSurveyFormData[]>([]);

  useEffect(() => {
    async function fetchReports() {
      try {
        const response = await client.models.Reports.list();
        const reports = response.data.map((i) =>
          JSON.parse(i.content as string)
        );
        setReports(reports);
      } catch (error) {
        console.log(error);
      }
    }

    fetchReports();
  }, []);

  const deleteReport = async (id: string) => {
    try {
      const response = await client.models.Reports.delete({ id });
      if (!response.errors && response.data != null) {
        setReports(reports.filter((r) => r.id !== id));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <div className="flex justify-between  p-3 mb-5 mt-5 items-baseline">
        <div>
          <h1 className="text-3xl dark:text-white">Reports</h1>
        </div>
        <div>
          <Link href="/reports/create-report">
            <CopyMarkupBtn>Create</CopyMarkupBtn>
          </Link>
        </div>
      </div>

      <div>
        <Table headers={["Id", "Client Name", "Address", "Created", "Actions"]}>
          {reports.sort((a, b) => a.reportDate < b.reportDate ? 1 : 0).map((report) => {
            return (
              <TableRow key={report.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200">
                  #{report.id?.split("-")[0] || "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200">
                  {report.clientName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                  {report.address}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                  {new Date(report.reportDate).toDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium">
                  <DropDown>
                    <DropDownItem href={`/reports/${report.id}`}>
                      View Report
                    </DropDownItem>
                    <DropDownItem
                      onClick={() => deleteReport(report.id)}
                      className="text-red-500"
                    >
                      Delete
                    </DropDownItem>
                  </DropDown>
                </td>
              </TableRow>
            );
          })}
        </Table>
      </div>
    </div>
  );
}

export default HomePage;
