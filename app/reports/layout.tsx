"use client"

import { Authenticator } from "@aws-amplify/ui-react"
import SecureNav from "../components/Navbar"

export default function ReportLayout({
    children, // will be a page or nested layout
  }: {
    children: React.ReactNode
  }) {
    return (
        <Authenticator.Provider>
            <SecureNav />
            {children}
        </Authenticator.Provider>
    )
  }