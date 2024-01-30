"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { IStaticMethods } from "preline/preline";
declare global {
  interface Window {
    HSStaticMethods: IStaticMethods;
  }
}

export default function PrelineScript() {
  const path = usePathname();

  useEffect(() => {
    import("preline/preline");
  }, []);

  useEffect(() => {
    setTimeout(() => {
      console.log(window.HSStaticMethods)
      if (typeof window !== "undefined") {
        window.HSStaticMethods.autoInit();
      }
      
    }, 100);
  }, [path]);

  return null;
}