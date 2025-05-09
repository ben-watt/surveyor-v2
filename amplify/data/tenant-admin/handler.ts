const USER_POOL_ID = process.env.AMPLIFY_AUTH_USERPOOL_ID;
import {
  AdminAddUserToGroupCommand,
  CreateGroupCommand,
  AdminRemoveUserFromGroupCommand,
  CognitoIdentityProviderClient,
  ListGroupsCommand,
  ListUsersInGroupCommand,
  DeleteGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { Schema } from "../resource";

const client = new CognitoIdentityProviderClient();

function mapNullsToUndefined<T extends object>(obj: T): { [K in keyof T]: Exclude<T[K], null> | undefined } {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v === null ? undefined : v])
  ) as any;
}

export const handler : Schema['tenantAdmin']['functionHandler'] = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  const { action, ...params } = event.arguments;
  const safeParams = mapNullsToUndefined(params);

  try {
    switch (action) {
      case "createGroup": {
        const { groupName, description } = safeParams;
        if (!groupName) throw new Error("Group name is required");
        return await createGroup({ groupName, description });
      }
      case "addUserToGroup": {
        const { username, groupName } = safeParams;
        return await addUserToGroup({ username, groupName });
      }
      case "removeUserFromGroup": {
        const { username, groupName } = safeParams;
        return await removeUserFromGroup({ username, groupName });
      }
      case "listGroups":
        return await listGroups();
      case "listUsersInGroup": {
        const { groupName } = safeParams;
        if (!groupName) throw new Error("Group name is required");
        return await listUsersInGroup({ groupName });
      }
      case "deleteGroup": {
        const { groupName } = safeParams;
        if (!groupName) throw new Error("Group name is required");
        return await deleteGroup({ groupName });
      }
      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  } catch (error) {
    console.error(`Error executing ${action}:`, error);
    throw error;
  }
};

async function createGroup({ groupName, description }: { groupName: string; description?: string }) {
  const command = new CreateGroupCommand({
    GroupName: groupName,
    Description: description,
    UserPoolId: USER_POOL_ID,
  });

  const response = await client.send(command);
  return response.Group as any;
}

async function addUserToGroup({ username, groupName }: { username?: string; groupName?: string }) {
  if (!username || !groupName) {
    throw new Error("Username and group name are required");
  }

  const command = new AdminAddUserToGroupCommand({
    Username: username,
    GroupName: groupName,
    UserPoolId: USER_POOL_ID,
  });

  await client.send(command);
  return { success: true, message: `User ${username} added to group ${groupName}` };
}

async function removeUserFromGroup({ username, groupName }: { username?: string; groupName?: string }) {
  if (!username || !groupName) {
    throw new Error("Username and group name are required");
  }

  const command = new AdminRemoveUserFromGroupCommand({
    Username: username,
    GroupName: groupName,
    UserPoolId: USER_POOL_ID,
  });

  await client.send(command);
  return { success: true, message: `User ${username} removed from group ${groupName}` };
}

async function listGroups() {
  const command = new ListGroupsCommand({
    UserPoolId: USER_POOL_ID,
  });

  const response = await client.send(command);
  return response.Groups;
}

async function listUsersInGroup({ groupName }: { groupName: string }) {
  const command = new ListUsersInGroupCommand({
    GroupName: groupName,
    UserPoolId: USER_POOL_ID,
  });

  const response = await client.send(command);
  return response.Users;
}

async function deleteGroup({ groupName }: { groupName: string }) {
  const command = new DeleteGroupCommand({
    GroupName: groupName,
    UserPoolId: USER_POOL_ID,
  });

  await client.send(command);
  return { success: true, message: `Group ${groupName} deleted successfully` };
} 