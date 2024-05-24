"use client";

import { CopyMarkupBtn } from "@/app/components/Buttons";
import client from "@/app/clients/ReportsClient";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BuildingSurveyFormData } from "./building-survey-reports/BuildingSurveyReportData";
import { DropDown, DropDownItem } from "../components/DropDown";

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
      if (response.data.id) {
        setReports(reports.filter((r) => r.id !== id));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <div className="flex justify-between mb-8 mt-8 items-baseline">
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
        <div className="-m-1.5 overflow-x-auto">
          <div className="p-1.5 min-w-full inline-block align-middle">
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase"
                    >
                      Id
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase"
                    >
                      Client
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase"
                    >
                      Address
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase"
                    >
                      Date
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-end text-xs font-medium text-gray-500 uppercase"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {reports.map((report) => {
                    return (
                      <tr key={report.id}>
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
                            <DropDownItem href={`/reports/${report.id}`}>View Report</DropDownItem>
                            <DropDownItem onClick={() => deleteReport(report.id)}  className="text-red-500">Delete</DropDownItem>
                          </DropDown>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
