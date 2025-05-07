import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { tenantAdmin } from "./tenant-admin/resource";

/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rules below
specify that owners, authenticated via your Auth resource can "create",
"read", "update", and "delete" their own records. Public users,
authenticated via an API key, can only "read" records.
=========================================================================*/

const schema = a.schema({
  // Add tenant admin mutations
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
  VersionHistory: a.customType({
    version: a.integer().required(),
    timestamp: a.datetime().required(),
    author: a.string().required(),
    changeType: a.string().required()
  }),
  Documents: a
    .model({
      id: a.id().required(),
      displayName: a.string().required(),
      fileName: a.string().required(),
      fileType: a.string().required(),
      size: a.integer().required(),
      version: a.integer().required(),
      lastModified: a.datetime().required(),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
      tenantId: a.string().required(),
      owner: a.string().required(),
      editors: a.string().array().required(),
      viewers: a.string().array().required(),
      syncStatus: a.string().required(),
      syncError: a.string(),
      metadata: a.customType({
        checksum: a.string().required(),
        tags: a.string().array(),
        description: a.string(),
      }),
      versionHistory: a.ref("VersionHistory").array(),
    })
    .identifier(['tenantId', 'id'])
    .authorization((allow) => [
      allow.owner().to(["create", "read", "update", "delete"]),
      allow
      .groupDefinedIn("tenantId")
      .to(["create", "read", "update", "delete"]),
      allow.groups(['global-admin']).to(["create", "read", "update", "delete"]),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import { type Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
