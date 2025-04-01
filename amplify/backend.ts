import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { storage } from './storage/resource.js';
import { CloudwatchRum } from "./custom/rum/resource";

const backend = defineBackend({
  data,
  storage,
});

// new CloudwatchRum(backend.createStack("cloudWatchRum"), "cloudWatchRum", {
//   guestRole: backend.auth.resources.unauthenticatedUserIamRole,
//   identityPoolId: backend.auth.resources.cfnResources.cfnIdentityPool.attrId,
//   domain: process.env.CLOUDWATCH_RUM_DOMAIN || "localhost",
// });