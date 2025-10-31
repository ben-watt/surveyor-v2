import type { Schema } from '../resource';
import { DynamoDBClient, GetItemCommand, TransactWriteItemsCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '$amplify/env/updateDocument';


const ddb = new DynamoDBClient();
const s3 = new S3Client();

// Get table from amplify
const TABLE_NAME = env.DOCUMENT_TABLE_NAME;
const BUCKET_NAME = env.DOCUMENT_BUCKET_NAME;

// Helper to get username from identity
function getUsername(identity: any): string {
  if (!identity) return 'unknown';
  if ('username' in identity && typeof identity.username === 'string') return identity.username;
  if ('sub' in identity && typeof identity.sub === 'string') return identity.sub;
  return 'unknown';
}

export const handler: Schema['updateDocumentWithVersioning']['functionHandler'] = async (event) => {
  const { pk, content, changeType } = event.arguments;
  const now = new Date().toISOString();
  const latestSk = '#LATEST';

  // 1. Fetch #LATEST item
  const getRes = await ddb.send(new GetItemCommand({
    TableName: TABLE_NAME,
    Key: marshall({ pk, sk: latestSk }),
  }));
  if (!getRes.Item) {
    throw new Error('Document not found');
  }
  const latest = unmarshall(getRes.Item);
  const expectedCurrentVersion = latest.currentVersion ?? 0;
  const newVersion = expectedCurrentVersion + 1;
  const versionSk = `v${newVersion}`;
  // Use .json extension if fileType is application/json, otherwise use .html
  const fileExtension = latest.fileType === 'application/json' ? '.json' : '.html';
  const s3Path = `documents/${latest.tenantId}/${latest.id}/${versionSk}${fileExtension}`;

  // 2. Upload content to S3
  try {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Path,
      Body: content,
      ContentType: latest.fileType || 'text/html',
    }));
  } catch (err) {
    throw new Error('Failed to upload document content to S3: ' + (err as Error).message);
  }

  // 3. Query for all versions to prune if needed
  const versionsRes = await ddb.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'pk = :pk and begins_with(sk, :v)',
    ExpressionAttributeValues: marshall({ ':pk': pk, ':v': 'v' }),
  }));
  const versionItems = (versionsRes.Items || []).map((item: any) => unmarshall(item)).sort((a: any, b: any) => (a.version ?? 0) - (b.version ?? 0));
  let toDelete: any[] = [];
  if (versionItems.length >= 10) {
    toDelete = versionItems.slice(0, versionItems.length - 9); // keep 9, add 1
  }

  // 4. Build transaction
  const transactItems = [
    // Update #LATEST with condition
    {
      Update: {
        TableName: TABLE_NAME,
        Key: marshall({ pk, sk: latestSk }),
        UpdateExpression: 'SET currentVersion = :v, lastModified = :lm, updatedAt = :ua',
        ConditionExpression: 'currentVersion = :expected',
        ExpressionAttributeValues: marshall({
          ':v': newVersion,
          ':lm': now,
          ':ua': now,
          ':expected': expectedCurrentVersion,
        }),
      },
    },
    // Put new version item
    {
      Put: {
        TableName: TABLE_NAME,
        Item: marshall({
          pk,
          sk: versionSk,
          type: 'Version',
          version: newVersion,
          author: getUsername(event.identity),
          createdAt: now,
          changeType: changeType || 'update',
          path: s3Path,
          fileSize: latest.size,
          fileType: latest.fileType,
          fileName: latest.fileName,
        }),
      },
    },
    // Optionally delete old versions
    ...toDelete.map((v: any) => ({
      Delete: {
        TableName: TABLE_NAME,
        Key: marshall({ pk, sk: v.sk }),
      },
    })),
  ];

  await ddb.send(new TransactWriteItemsCommand({ TransactItems: transactItems }));

  // 5. Return updated #LATEST
  const updatedRes = await ddb.send(new GetItemCommand({
    TableName: TABLE_NAME,
    Key: marshall({ pk, sk: latestSk }),
  }));
  if (!updatedRes.Item) {
    throw new Error('Failed to fetch updated document');
  }
  const updated = unmarshall(updatedRes.Item);
  // Only return DocumentRecord fields
  return {
    pk: updated.pk,
    sk: updated.sk,
    type: updated.type,
    id: updated.id,
    displayName: updated.displayName,
    fileName: updated.fileName,
    fileType: updated.fileType,
    size: updated.size,
    currentVersion: updated.currentVersion,
    lastModified: updated.lastModified,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    tenantId: updated.tenantId,
    owner: updated.owner,
    editors: updated.editors,
    viewers: updated.viewers,
    version: updated.version,
    author: updated.author,
    changeType: updated.changeType,
    path: updated.path,
    fileSize: updated.fileSize,
  };
}; 