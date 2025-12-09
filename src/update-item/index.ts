import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
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

    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const updateData = JSON.parse(event.body);

    // Check if item exists
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

    const timestamp = new Date().toISOString();

    // Build update expression
    const updateExpression = 'SET updatedAt = :updatedAt';
    const expressionAttributeValues: any = {
      ':updatedAt': timestamp,
    };
    const expressionAttributeNames: any = {};

    let updateParts = ['updatedAt = :updatedAt'];

    Object.keys(updateData).forEach((key, index) => {
      if (key !== 'id' && key !== 'createdAt' && key !== 'updatedAt') {
        const attributeName = `#attr${index}`;
        const attributeValue = `:val${index}`;

        expressionAttributeNames[attributeName] = key;
        expressionAttributeValues[attributeValue] = updateData[key];
        updateParts.push(`${attributeName} = ${attributeValue}`);
      }
    });

    const finalUpdateExpression = `SET ${updateParts.join(', ')}`;

    // Update the item
    await dynamoClient.send(
      new UpdateCommand({
        TableName: config.tableName,
        Key: { id: itemId },
        UpdateExpression: finalUpdateExpression,
        ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
    );

    // Get the updated item
    const updatedItem = await dynamoClient.send(
      new GetCommand({
        TableName: config.tableName,
        Key: { id: itemId },
      })
    );

    // Send SNS notification
    const snsMessage = {
      id: itemId,
      action: 'item_updated',
      timestamp,
      updatedFields: Object.keys(updateData),
    };

    await snsClient.send(
      new PublishCommand({
        TopicArn: config.snsTopicArn,
        Message: JSON.stringify(snsMessage),
        Subject: 'Item Updated Notification',
      })
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Item updated successfully',
        item: updatedItem.Item,
      }),
    };
  } catch (error: any) {
    console.error('Update item error:', error);

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
