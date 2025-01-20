"use client";

import "./globals.css";
import ConfigureAmplifyClientSide from "./components/ConfigureAmplify";
import "@aws-amplify/ui-react/styles.css";
import "instantsearch.css/themes/satellite.css";
import { Authenticator } from "@aws-amplify/ui-react";
import { Toaster } from "react-hot-toast";
import { Suspense, useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { DynamicDrawerProvider } from "./components/Drawer";
import { ConfigureAwsRum } from "./components/ConfigureAwsRum";
import { getCurrentUser } from "aws-amplify/auth";
import { useRouter, usePathname } from "next/navigation";
import Error from "./error";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { componentStore, elementStore, surveyStore } from "./clients/Database";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/app-sidebar";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    async function fetchUser() {
      try {
        // You must be authenticated to make this request so it'll failed if you're not
        const user = await getCurrentUser();
        console.log("[RootLayout] User: ", user);
        setIsAuthenticated(true);
      } catch (err) {
        console.warn("[RootLayout] Error fetching user: ", err);
        router.push("/login");
      }
    }

    fetchUser();
  }, [router, path]);

  useEffect(() => {
    componentStore.syncWithServer();
    surveyStore.syncWithServer();
    elementStore.syncWithServer();
  }, []);

  return (
    <>
      <ConfigureAmplifyClientSide />
      <ConfigureAwsRum />
      <Authenticator.Provider>
        <DynamicDrawerProvider>
          <TooltipProvider>
            {isAuthenticated && (
              <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                  <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4 w-full">
                      <SidebarTrigger className="-ml-1" />
                      <Breadcrumbs />
                      {/* <SecureNav /> */}
                    </div>
                  </header>
                  <div className="flex flex-1 flex-col gap-4 p-4">
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
            )}
            <Toaster position="top-right" />
          </TooltipProvider>
        </DynamicDrawerProvider>
      </Authenticator.Provider>
    </>
  );
}
