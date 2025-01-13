"use client";

import "./globals.css";
import ConfigureAmplifyClientSide from "./components/ConfigureAmplify";
import "@aws-amplify/ui-react/styles.css";
import "instantsearch.css/themes/satellite.css";
import { Authenticator } from "@aws-amplify/ui-react";
import { Toaster } from "react-hot-toast";
import SecureNav from "./components/Navbar";
import { Suspense, useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { DynamicDrawerProvider } from "./components/Drawer";
import { ConfigureAwsRum } from "./components/ConfigureAwsRum";
import { getCurrentUser } from "aws-amplify/auth";
import { useRouter, usePathname } from "next/navigation";
import Error from "./error";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { componentStore, elementStore, surveyStore } from "./clients/Database";

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
            <div className="print:hidden">
              {isAuthenticated && <SecureNav />}
              <Toaster position="top-right" />
            </div>
            <div className="m-auto max-w-[85rem] print:max-w-max">
              <div className="m-2 md:m-10 print:m-0">
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
            </div>
          </TooltipProvider>
        </DynamicDrawerProvider>
      </Authenticator.Provider>
    </>
  );
}
