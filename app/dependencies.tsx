"use client";

import "./globals.css";
import ConfigureAmplifyClientSide from "./app/components/ConfigureAmplify";
import "@aws-amplify/ui-react/styles.css";
import "instantsearch.css/themes/satellite.css";
import { ConfigureAwsRum } from "./app/components/ConfigureAwsRum";

export const ClientSideDependencies = () => {
  return (
    <>
      <ConfigureAmplifyClientSide />
      <ConfigureAwsRum />
    </>
  );
}
