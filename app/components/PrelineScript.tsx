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
    const preline = import("preline/preline");
    preline.then((preline) => {
      window.HSStaticMethods.autoInit();
    });
  }, []);

  useEffect(() => {
    setTimeout(() => {
      if(window.HSStaticMethods !== undefined) {
        window.HSStaticMethods.autoInit();
      }
    }, 100);
  }, [path]);

  return null;
}