"use client";

import { useEffect, useState } from "react";
import client from "@/app/clients/ReportsClient";
import { type Schema } from "@/amplify/data/resource";
import Link from "next/link";
import { CopyMarkupBtn } from "@/app/components/Buttons";
import { Table } from "../../components/Table";
import { TableRow } from "../../components/Table";

type DefectData = Schema["Defects"]["type"];

export default function Page() {
  const [defects, setDefects] = useState<DefectData[]>([]);

  useEffect(() => {
    async function fetchReports() {
      try {
        const response = await client.models.Defects.list();
        if (response.data) {
          setDefects(response.data);
        }
      } catch (error) {
        console.log(error);
      }
    }

    fetchReports();
  }, []);

  return (
    <div>
      <div className="flex justify-between mb-8 mt-8 items-baseline">
        <div>
          <h1 className="text-3xl dark:text-white">Defects</h1>
        </div>
        <Link href="/reports/defects/create">
          <CopyMarkupBtn>Create</CopyMarkupBtn>
        </Link>
      </div>
      <div>
        <Table
          headers={["Name", "Description", "Cause", "Element", "Component"]}
        >
          {defects.map((defect) => (
            <TableRow id={defect.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200">
                {defect.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200">
                {defect.description}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200">
                {defect.cause}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200">
                {defect.element}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200">
                {defect.component}
              </td>
            </TableRow>
          ))}
        </Table>
      </div>
    </div>
  );
}
