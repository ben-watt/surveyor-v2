"use client";

import { Authenticator } from "@aws-amplify/ui-react";
import SecureNav from "../components/Navbar";
import { Toaster } from "react-hot-toast";

export default function ReportLayout({
  children, // will be a page or nested layout
}: {
  children: React.ReactNode;
}) {
  return (
    <Authenticator.Provider>
      <Toaster position="top-right" />
      <SecureNav />
      <div className="m-auto max-w-[85rem]">{children}</div>
    </Authenticator.Provider>
  );
}
