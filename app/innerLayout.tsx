"use client"

import "./globals.css";
import ConfigureAmplifyClientSide from "./components/ConfigureAmplify";
import "@aws-amplify/ui-react/styles.css";
import "instantsearch.css/themes/satellite.css";
import { Authenticator } from "@aws-amplify/ui-react";
import { Toaster } from "react-hot-toast";
import SecureNav from "./components/Navbar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
        <ConfigureAmplifyClientSide />
        <Authenticator.Provider>
          <div className="print:hidden">
            <SecureNav />
            <Toaster position="top-right" />
          </div>
          <div className="m-auto max-w-[85rem] print:max-w-max">
            <div className="m-2 md:m-10 print:m-0">
              {children}
            </div>
          </div>
        </Authenticator.Provider>
    </>
  );
}