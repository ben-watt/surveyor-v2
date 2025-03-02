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
      allow.authenticated(),
    ])
    .handler(a.handler.function(tenantAdmin))
    .returns(a.json()),

  Tenant: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      description: a.string(),
      createdAt: a.datetime().required(),
      createdBy: a.string().required(),
      tenantId: a.string(),
    })
    .authorization((allow) => [
      allow.authenticated().to(["read"]),
      allow.owner().to(["create", "read", "update", "delete"]),
    ]),
  Surveys: a
    .model({
      id: a.id().required(),
      syncStatus: a.string().required(),
      createdAt: a.string().required(),
      updatedAt: a.string().required(),
      content: a.json().required(),
      tenantId: a.string(),
    })
    .authorization((allow) => [
      allow.authenticated().to(["create", "read", "update"]),
      allow.owner().to(["create", "read", "update", "delete"]),
    ]),
  Sections: a.model({
    id: a.id().required(),
    name: a.string().required(),
    order: a.float(),
    syncStatus: a.string().required(),
    createdAt: a.datetime().required(),
    updatedAt: a.datetime().required(),
    elements: a.hasMany("Elements", "sectionId"),
    tenantId: a.string(),
  }).authorization((allow) => [
    allow.owner().to(["create", "read", "update", "delete"]),
    allow.authenticated().to(["create", "read", "update", "delete"]),
  ]),
  Elements: a.model({
    id: a.id().required(),
    name: a.string().required(),
    order: a.float(),
    sectionId: a.id().required(),
    section: a.belongsTo("Sections", "sectionId"),
    description: a.string(),
    components: a.hasMany("Components", "elementId"),
    syncStatus: a.string().required(),
    createdAt: a.datetime().required(),
    updatedAt: a.datetime().required(),
    tenantId: a.string(),
  }).authorization((allow) => [
    allow.owner().to(["create", "read", "update", "delete"]),
    allow.authenticated().to(["create", "read", "update", "delete"]),
  ]),
  Material: a.customType({
    name: a.string().required()
  }),
  Phrases: a.model({
    id: a.id().required(),
    syncStatus: a.string().required(),
    createdAt: a.datetime().required(),
    updatedAt: a.datetime().required(),
    name: a.string().required(),
    type: a.string().required(), // "Defect" or "Condition"
    associatedMaterialIds: a.string().required().array().required(),
    associatedElementIds:  a.string().required().array().required(),
    associatedComponentIds:  a.string().required().array().required(),
    phrase: a.string().required(),
    tenantId: a.string(),
  }).authorization((allow) => [
    allow.owner().to(["create", "read", "update", "delete"]),
    allow.authenticated().to(["create", "read", "update", "delete"]),
  ]),
  Components: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      materials: a.ref("Material").required().array().required(),
      syncStatus: a.string().required(),
      elementId: a.id().required(),
      element: a.belongsTo("Elements", "elementId"),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
      tenantId: a.string(),
    })
    .authorization((allow) => [
      allow.owner().to(["create", "read", "update", "delete"]),
      allow.authenticated().to(["create", "read", "update", "delete"]),
    ]),
  Locations: a.model({
    id: a.id().required(),
    name: a.string().required(),
    parentId: a.string(), // Optional field for hierarchical structure
    syncStatus: a.string().required(),
    createdAt: a.datetime().required(),
    updatedAt: a.datetime().required(),
    tenantId: a.string(),
  }).authorization((allow) => [
    allow.owner().to(["create", "read", "update", "delete"]),
    allow.authenticated().to(["create", "read", "update", "delete"]),
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
