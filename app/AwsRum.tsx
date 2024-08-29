import { AwsRum, AwsRumConfig } from "aws-rum-web";
import { useEffect } from "react";

try {
  const config: AwsRumConfig = {
    sessionSampleRate: 1,
    identityPoolId: "eu-west-1:adde7228-3eb3-48d6-9640-7ca39ffd2b1c",
    endpoint: "https://dataplane.rum.eu-west-1.amazonaws.com",
    telemetries: ["errors", "http", "performance"],
    allowCookies: true,
    enableXRay: true,
  };

  const APPLICATION_ID: string = "0b254f14-f7e2-47bb-988e-957faac09bc6";
  const APPLICATION_VERSION: string = "1.0.0";
  const APPLICATION_REGION: string = "eu-west-1";

  const awsRum: AwsRum = new AwsRum(
    APPLICATION_ID,
    APPLICATION_VERSION,
    APPLICATION_REGION,
    config
  );

  console.log("[AWS Rum] AWS RUM initialized successfully");

} catch (error) {
  console.error("[AWS Rum] Failed to initialize AWS RUM", error);
}

export const ConfigureAwsRum = () => {
  return null;
};
