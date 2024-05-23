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
    const loadPreline = async () => {
      await import("preline/preline");
      // Sometimes it looks like it doesn't work but it's because auto init is being called
      // prior to the components existing in the DOM meaning that it can't find them
      // This means the components fail.

      // To fix this, we can use a setTimeout to delay the auto init but it means thoes components
      // will not be available for a short period of time
      setTimeout(() => {
        window.HSStaticMethods.autoInit();
        console.log("Preline loaded");
      }, 1000)
    };

    loadPreline();
  }, [path]);

  return null;
}