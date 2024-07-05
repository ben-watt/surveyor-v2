"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import ConfigureAmplifyClientSide from "./components/ConfigureAmplify";
import "@aws-amplify/ui-react/styles.css";
import "instantsearch.css/themes/satellite.css";
import { Authenticator } from "@aws-amplify/ui-react";
import { Toaster } from "react-hot-toast";
import SecureNav from "./components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ConfigureAmplifyClientSide />
        <Authenticator.Provider>
          <SecureNav />
          <Toaster position="top-right" />
          <div className="m-auto max-w-[85rem]">
            <div className="m-2 md:m-10">
              {children}
            </div>
          </div>
        </Authenticator.Provider>
      </body>
    </html>
  );
}
