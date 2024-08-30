import { AwsRum, AwsRumConfig } from "aws-rum-web";


function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value;
}

try {
  
  const config: AwsRumConfig = {
    sessionSampleRate: 1,
    identityPoolId: env("CLOUDWATCH_RUM_IDENTITY_POOL_ID"),
    endpoint: "https://dataplane.rum.eu-west-1.amazonaws.com",
    telemetries: ["errors","http","performance"],
    allowCookies: true,
    enableXRay: true
  };

  const APPLICATION_ID: string = env("CLOUDWATCH_RUM_APPLICATOIN_ID");
  const APPLICATION_VERSION: string = '1.0.0';
  const APPLICATION_REGION: string = 'eu-west-1';

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
