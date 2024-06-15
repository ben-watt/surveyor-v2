import type { Metadata } from "next";
import { Inter } from "next/font/google";
import PrelineScript from "./components/PrelineScript";
import "./globals.css";
import ConfigureAmplifyClientSide from "./components/ConfigureAmplify";
import "@aws-amplify/ui-react/styles.css";
import "instantsearch.css/themes/satellite.css";


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Surveyor",
  description: "Report generation for surveyors",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ConfigureAmplifyClientSide />
        {children} 
        <PrelineScript />
      </body>
    </html>
  );
}
