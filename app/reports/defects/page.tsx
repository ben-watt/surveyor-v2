"use client";

import { useEffect, useState } from "react";
import client from "@/app/clients/ReportsClient";
import { type Schema } from "@/amplify/data/resource";
import Link from "next/link";
import { CopyMarkupBtn } from "@/app/components/Buttons";
import { Table } from "@/app/components/Table";
import { TableRow } from "@/app/components/Table";
import { DropDown, DropDownItem } from "@/app/components/DropDown";
import InputText from "@/app/components/Input/InputText";

type DefectData = Schema["Defects"]["type"];

export default function Page() {
  const [defects, setDefects] = useState<DefectData[]>([]);
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    async function fetchReports() {
      try {
        const response = await client.models.Defects.list(search ? {
          filter: {
            name: {
              contains: search,
            },
          },
        }: {});

        if (response.data) {
          setDefects(response.data);
        }
      } catch (error) {
        console.log(error);
      }
    }

    fetchReports();
  }, [search]);

  function deleteDefect(id: string): void {
    async function deleteDefect() {
      try {
        const response = await client.models.Defects.delete({ id });
        if (!response.errors && response.data != null) {
          setDefects(defects.filter((r) => r.id !== id));
        }
      } catch (error) {
        console.error(error);
      }
    }

    deleteDefect();
  }

  return (
    <div>
      <div className="flex justify-between p-3 mb-5 mt-5 items-baseline">
        <div>
          <h1 className="text-3xl dark:text-white">Defects</h1>
        </div>
        <Link href="/reports/defects/create">
          <CopyMarkupBtn>Create</CopyMarkupBtn>
        </Link>
      </div>
      <div>
        <input
          onChange={(ev) => setSearch(ev.target.value)}
          type="text"
        ></input>
      </div>
      <div>
        <Table
          headers={[
            "Name",
            "Description",
            "Cause",
            "Element",
            "Component",
            "Actions",
          ]}
        >
          {defects.map((defect) => (
            <TableRow key={defect.id}>
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
              <td>
                <DropDown>
                  <DropDownItem href={`defects/edit/${defect.id}`}>
                    Edit
                  </DropDownItem>
                  <DropDownItem
                    onClick={() => deleteDefect(defect.id)}
                    className="text-red-500"
                  >
                    Delete
                  </DropDownItem>
                </DropDown>
              </td>
            </TableRow>
          ))}
        </Table>
      </div>
    </div>
  );
}
