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

const client = new CognitoIdentityProviderClient();

export const handler = async (event: any) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  const { action, ...params } = event.arguments;

  try {
    switch (action) {
      case "createGroup":
        return await createGroup(params);
      case "addUserToGroup":
        return await addUserToGroup(params);
      case "removeUserFromGroup":
        return await removeUserFromGroup(params);
      case "listGroups":
        return await listGroups();
      case "listUsersInGroup":
        return await listUsersInGroup(params);
      case "deleteGroup":
        return await deleteGroup(params);
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
  return response.Group;
}

async function addUserToGroup({ username, groupName }: { username: string; groupName: string }) {
  const command = new AdminAddUserToGroupCommand({
    Username: username,
    GroupName: groupName,
    UserPoolId: USER_POOL_ID,
  });

  await client.send(command);
  return { success: true, message: `User ${username} added to group ${groupName}` };
}

async function removeUserFromGroup({ username, groupName }: { username: string; groupName: string }) {
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