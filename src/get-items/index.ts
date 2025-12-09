import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config, validateConfig } from '../config/env.js';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.awsRegion }));

const generateImageUrl = async (imageKey: string): Promise<string | null> => {
  try {
    const command = new GetObjectCommand({
      Bucket: config.bucketName,
      Key: imageKey,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return signedUrl;
  } catch (error) {
    console.error('Error generating image URL:', error);
    return null;
  }
};

const addImageUrlsToItems = async (items: any[]): Promise<any[]> => {
  const itemsWithUrls = await Promise.all(
    items.map(async (item) => {
      const itemCopy = { ...item };

      if (item.imageKey) {
        try {
          const imageUrl = await generateImageUrl(item.imageKey);
          itemCopy.imageUrl = imageUrl;
        } catch (error) {
          console.warn(`Failed to generate URL for imageKey: ${item.imageKey}`);
          itemCopy.imageUrl = null;
        }
      } else {
        itemCopy.imageUrl = null;
      }

      return itemCopy;
    })
  );

  return itemsWithUrls;
};
const s3Client = new S3Client({ region: config.awsRegion });

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    validateConfig();

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
    const queryParameters = event.queryStringParameters || {};

    let items: any[] = [];

    if (pathParameters.id) {
      const itemId = pathParameters.id;

      const result = await dynamoClient.send(
        new GetCommand({
          TableName: config.tableName,
          Key: { id: itemId },
        })
      );

      if (!result.Item) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Item not found' }),
        };
      }

      const itemWithUrl = await addImageUrlsToItems([result.Item]);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          message: 'Item retrieved successfully',
          item: itemWithUrl[0],
        }),
      };
    }

    let scanParams: any = {
      TableName: config.tableName,
    };

    if (queryParameters.limit) {
      scanParams.Limit = parseInt(queryParameters.limit);
    }

    if (queryParameters.lastEvaluatedKey) {
      scanParams.ExclusiveStartKey = JSON.parse(queryParameters.lastEvaluatedKey);
    }

    const result = await dynamoClient.send(new ScanCommand(scanParams));

    const itemsWithUrls = await addImageUrlsToItems(result.Items || []);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Items retrieved successfully',
        items: itemsWithUrls,
        count: itemsWithUrls.length,
        lastEvaluatedKey: result.LastEvaluatedKey ? JSON.stringify(result.LastEvaluatedKey) : null,
      }),
    };
  } catch (error: any) {
    console.error('Get items error:', error);

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
