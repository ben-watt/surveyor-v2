"use client";

import { useEffect } from "react";
import client from "@/app/clients/ReportsClient";

export default function Page() {

    useEffect(() => {
        async function fetchReports() {
          try {
            const response = await client.models.Defects.list();
            if (response.data) {
              console.log(response.data);
            }
          } catch (error) {
            console.log(error);
          }
        }
    
        fetchReports();
      }, []);


    return (
        <div>
            <h1>Defects</h1>
        </div>
    )
}
