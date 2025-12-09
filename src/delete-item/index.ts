import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { config, validateConfig } from '../config/env.js';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.awsRegion }));
const snsClient = new SNSClient({ region: config.awsRegion });

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    validateConfig();

    // Verify Cognito authentication
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Authorization header is required' }),
      };
    }

    const pathParameters = event.pathParameters || {};
    const itemId = pathParameters.id;

    if (!itemId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Item ID is required in path parameter' }),
      };
    }

    // Check if item exists before deleting
    const existingItem = await dynamoClient.send(
      new GetCommand({
        TableName: config.tableName,
        Key: { id: itemId },
      })
    );

    if (!existingItem.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Item not found' }),
      };
    }

    // Delete the item
    await dynamoClient.send(
      new DeleteCommand({
        TableName: config.tableName,
        Key: { id: itemId },
      })
    );

    const timestamp = new Date().toISOString();

    // Send SNS notification
    const snsMessage = {
      id: itemId,
      action: 'item_deleted',
      timestamp,
      deletedItem: existingItem.Item,
    };

    await snsClient.send(
      new PublishCommand({
        TopicArn: config.snsTopicArn,
        Message: JSON.stringify(snsMessage),
        Subject: 'Item Deleted Notification',
      })
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Item deleted successfully',
        deletedId: itemId,
      }),
    };
  } catch (error: any) {
    console.error('Delete item error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: error.message || 'Internal server error' }),
    };
  }
};
