"use client";

import { Toaster } from "react-hot-toast";
import { Suspense, useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { DynamicDrawerProvider } from "./components/Drawer";
import Error from "./error";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <>
      <DynamicDrawerProvider>
        <TooltipProvider>
            <SidebarProvider>
              <AppSidebar className="print:!hidden" />
              <SidebarInset className="print:!w-0 print:!m-0 print:!p-0">
                <header className="print:!hidden flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                  <div className="flex items-center gap-2 px-4 w-full">
                    <SidebarTrigger className="-ml-1" />
                    <Breadcrumbs />
                  </div>
                </header>
                <div className="flex flex-1 flex-col gap-4">
                  <ErrorBoundary
                    fallbackRender={(props) => (
                      <Error
                        error={props.error}
                        reset={props.resetErrorBoundary}
                      />
                    )}
                  >
                    <Suspense fallback={<div>Loading...</div>}>
                      {children}
                    </Suspense>
                  </ErrorBoundary>
                </div>
              </SidebarInset>
            </SidebarProvider>
          
          <Toaster position="top-right" />
        </TooltipProvider>
      </DynamicDrawerProvider>
    </>
  );
}
