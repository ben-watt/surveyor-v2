import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { updateDocument } from './data/update-document/resource.js';
import { storage } from './storage/resource.js';
import { CloudwatchRum } from "./custom/rum/resource";

export const backend = defineBackend({
  auth,
  data,
  storage,
  updateDocument,
});

backend.updateDocument.addEnvironment('DOCUMENT_TABLE_NAME', backend.data.resources.tables['DocumentRecord'].tableName);
backend.updateDocument.addEnvironment('DOCUMENT_BUCKET_NAME', backend.storage.resources.bucket.bucketName);

// Grant the lambda permissions to the read and write to the document record table
backend.data.resources.tables['DocumentRecord'].grantReadWriteData(
  backend.updateDocument.resources.lambda.grantPrincipal
)

backend.storage.resources.bucket.grantReadWrite(
  backend.updateDocument.resources.lambda.grantPrincipal
)

// These can be found in amplify_outputs.json
backend.addOutput({
  custom: {
    DocumentTableName: backend.data.resources.tables['DocumentRecord'].tableName,
    DocumentBucketName: backend.storage.resources.bucket.bucketName,
  }
})

new CloudwatchRum(backend.createStack("cloudWatchRum"), "cloudWatchRum", {
  guestRole: backend.auth.resources.unauthenticatedUserIamRole,
  identityPoolId: backend.auth.resources.cfnResources.cfnIdentityPool.attrId,
  domain: process.env.CLOUDWATCH_RUM_DOMAIN || "localhost",
});