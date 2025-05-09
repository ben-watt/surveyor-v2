import { defineFunction } from "@aws-amplify/backend";

export const updateDocument = defineFunction({
  name: 'updateDocument',
  entry: './handler.ts',
  // This is the name of the resource 
  resourceGroupName: 'data',
  environment: {
    DOCUMENT_TABLE_NAME: process.env.DOCUMENT_TABLE_NAME || 'placeholder',
    DOCUMENT_BUCKET_NAME: process.env.DOCUMENT_BUCKET_NAME || 'placeholder',
  },
});