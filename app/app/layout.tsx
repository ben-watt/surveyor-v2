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
import { surveyStore, componentStore, elementStore, phraseStore, locationStore, sectionStore } from "./clients/Database";
import { imageUploadStore } from "./clients/ImageUploadStore";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Start periodic sync for all tables (every 30 seconds)
    const cleanupFns = [
      surveyStore.startPeriodicSync(),
      componentStore.startPeriodicSync(),
      elementStore.startPeriodicSync(),
      phraseStore.startPeriodicSync(),
      locationStore.startPeriodicSync(),
      sectionStore.startPeriodicSync(),
      imageUploadStore.startPeriodicSync(),
    ];

    // Setup online/offline handlers
    const handleOnline = () => {
      // Trigger immediate sync when coming online
      surveyStore.sync();
      componentStore.sync();
      elementStore.sync();
      phraseStore.sync();
      locationStore.sync();
      sectionStore.sync();
      imageUploadStore.sync();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      //TODO: Add cleanup
      //cleanupFns.forEach(cleanup => cleanup());
      window.removeEventListener('online', handleOnline);
    };
  }, []);

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
