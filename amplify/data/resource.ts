import { type ClientSchema, a, defineData, defineFunction } from "@aws-amplify/backend";
import { tenantAdmin } from "./tenant-admin/resource";
import { updateDocument } from "./update-document/resource";

/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rules below
specify that owners, authenticated via your Auth resource can "create",
"read", "update", and "delete" their own records. Public users,
authenticated via an API key, can only "read" records.
=========================================================================*/

const schema = a.schema({
  tenantAdmin: a
    .mutation()
    .arguments({
      action: a.string().required(),
      groupName: a.string(),
      username: a.string(),
      description: a.string(),
    })
    .authorization((allow) => [
      allow.groups(['global-admin']),
    ])
    .handler(a.handler.function(tenantAdmin))
    .returns(a.json()),
  Tenant: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      description: a.string(),
      createdAt: a.datetime().required(),
      createdBy: a.string().required()
    })
    .identifier(['id'])
    .authorization((allow) => [
      allow.groups(['global-admin']),
      allow.authenticated().to(['read']),
    ]),
  Surveys: a
    .model({
      id: a.id().required(),
      syncStatus: a.string().required(),
      syncError: a.string(),
      createdAt: a.string().required(),
      updatedAt: a.string().required(),
      content: a.json().required(),
      tenantId: a.string().required(),
    })
    .identifier(['tenantId', 'id'])
    .authorization((allow) => [
      allow.owner().to(["create", "read", "update", "delete"]), 
      allow
      .groupDefinedIn("tenantId")
      .to(["create", "read", "update", "delete"]),
      allow.groups(['global-admin']).to(["create", "read", "update", "delete"]),
    ]),
  Sections: a.model({
    id: a.id().required(),
    name: a.string().required(),
    order: a.float(),
    syncStatus: a.string().required(),
    syncError: a.string(),
    createdAt: a.datetime().required(),
    updatedAt: a.datetime().required(),
    elements: a.hasMany("Elements", ["sectionId", "tenantId"]),
    tenantId: a.string().required(),
  })
  .identifier(['tenantId', 'id'])
  .authorization((allow) => [
    allow.owner().to(["create", "read", "update", "delete"]),
    allow
    .groupDefinedIn("tenantId")
    .to(["create", "read", "update", "delete"]),
    allow.groups(['global-admin']).to(["create", "read", "update", "delete"]),
  ]),
  Elements: a.model({
    id: a.id().required(),
    name: a.string().required(),
    order: a.float(),
    sectionId: a.id().required(),
    section: a.belongsTo("Sections", ["sectionId", "tenantId"]),
    description: a.string(),
    components: a.hasMany("Components", ["elementId", "tenantId"]),
    syncStatus: a.string().required(),
    syncError: a.string(),
    createdAt: a.datetime().required(),
    updatedAt: a.datetime().required(),
    tenantId: a.string().required(),
  })
  .identifier(['tenantId', 'id'])
  .authorization((allow) => [
    allow.owner().to(["create", "read", "update", "delete"]),
    allow
    .groupDefinedIn("tenantId")
    .to(["create", "read", "update", "delete"]),
    allow.groups(['global-admin']).to(["create", "read", "update", "delete"]),
  ]),
  Material: a.customType({
    name: a.string().required()
  }),
  Phrases: a.model({
    id: a.id().required(),
    syncStatus: a.string().required(),
    syncError: a.string(),
    createdAt: a.datetime().required(),
    updatedAt: a.datetime().required(),
    name: a.string().required(),
    type: a.string().required(), // "Defect" or "Condition"
    associatedMaterialIds: a.string().required().array().required(),
    associatedElementIds:  a.string().required().array().required(),
    associatedComponentIds:  a.string().required().array().required(),
    phrase: a.string().required(),
    tenantId: a.string().required(),
  })
  .identifier(['tenantId', 'id'])
  .authorization((allow) => [
    allow.owner().to(["create", "read", "update", "delete"]),
    allow
    .groupDefinedIn("tenantId")
    .to(["create", "read", "update", "delete"]),
    allow.groups(['global-admin']).to(["create", "read", "update", "delete"]),
  ]),
  Components: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      materials: a.ref("Material").required().array().required(),
      syncStatus: a.string().required(),
      syncError: a.string(),
      elementId: a.id().required(),
      element: a.belongsTo("Elements", ["elementId", "tenantId"]),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
      tenantId: a.string().required(),
    })
    .identifier(['tenantId', 'id'])
    .authorization((allow) => [
      allow.owner().to(["create", "read", "update", "delete"]),
      allow
      .groupDefinedIn("tenantId")
      .to(["create", "read", "update", "delete"]),
      allow.groups(['global-admin']).to(["create", "read", "update", "delete"]),
    ]),
  ImageMetadata: a
    .model({
      id: a.id().required(),
      syncStatus: a.string().required(),
      syncError: a.string(),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
      imagePath: a.string().required(),
      caption: a.string(),
      notes: a.string(),
      tenantId: a.string().required(),
    })
    .identifier(['tenantId', 'id'])
    .authorization((allow) => [
      allow.owner().to(["create", "read", "update", "delete"]),
      allow
      .groupDefinedIn("tenantId")
      .to(["create", "read", "update", "delete"]),
      allow.groups(['global-admin']).to(["create", "read", "update", "delete"]),
    ]),
  /**
   * DocumentRecord: Single-table design for documents and versions
   * PK: tenantId#documentId
   * SK: #LATEST (for latest/metadata), v0/v1/etc for versions
   * type: 'Document' | 'Version'
   */
  DocumentRecord: a.model({
    pk: a.string().required(), // tenantId#documentId
    sk: a.string().required(), // #LATEST or v0/v1/etc
    type: a.string().required(), // 'Document' or 'Version'
    // Metadata fields (for #LATEST)
    id: a.id(),
    displayName: a.string(),
    fileName: a.string(),
    fileType: a.string(),
    size: a.integer(),
    currentVersion: a.integer(),
    lastModified: a.datetime(),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
    tenantId: a.string(),
    editors: a.string().required().array(),
    viewers: a.string().required().array(),
    owner: a.string(),
    // Version fields (for version items)
    version: a.integer(),
    author: a.string(),
    changeType: a.string(),
    // This is the s3 path to the file
    path: a.string(),
    fileSize: a.integer(),
  })
  .identifier(['pk', 'sk'])
  /**
   * GSI: byOwner
   * Allows efficient queries for all documents owned by a user (filter for sk = #LATEST)
   * Partition Key: owner
   */
  .secondaryIndexes(index => [index('owner').sortKeys(['sk']), index('tenantId').sortKeys(['sk'])])
  .authorization((allow) => [
    allow.owner().to(["create", "read", "update", "delete"]),
    allow
    .groupDefinedIn("tenantId")
    .withClaimIn("tenantId")
    .to(["create", "read", "update", "delete"]),
    allow.groupsDefinedIn("editors").to(["read", "update"]),
    allow.groupsDefinedIn("viewers").to(["read"]),
    allow.groups(['global-admin']).to(["create", "read", "update", "delete"]),
  ]),

  // Custom mutation for atomic versioning and conflict prevention
  updateDocumentWithVersioning: a
    .mutation()
    .arguments({
      pk: a.string().required(),
      content: a.string().required(),
      changeType: a.string(),
    })
    .returns(a.ref('DocumentRecord'))
    .authorization(allow => [allow.authenticated()])
    .handler(a.handler.function(updateDocument)),
}).authorization(
  (allow) => [
    allow.resource(updateDocument).to(["mutate", "query"]),
  ]
);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});