import { defineFunction } from "@aws-amplify/backend";

export const tenantAdmin = defineFunction({
  name: "tenant-admin",
  environment: {
    // The user pool ID will be injected at deployment time
    AMPLIFY_AUTH_USERPOOL_ID: process.env.AMPLIFY_AUTH_USERPOOL_ID || "placeholder",
  }
}); 