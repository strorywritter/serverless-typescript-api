import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { config, validateConfig } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.awsRegion }));
const s3Client = new S3Client({ region: config.awsRegion });
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

    const body = JSON.parse(event.body);
    const { title, price, image } = body;
    const data = { title, price, image };

    if (!title || price === undefined || price === null) {
      return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Title and price are required' }),
      };
    }

    if (!data) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Data field is required' }),
      };
    }

    const id = uuidv4();
    const timestamp = new Date().toISOString();

    let imageKey = null;

    // If image is provided, store it to S3 first and get the key
    if (data.image) {
      const imageUrl = data.image;

      // Download image from URL
      const response = await fetch(imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      // Generate S3 key
      imageKey = `${id}/${id}.jpg`;

      // Store image to S3
      await s3Client.send(
        new PutObjectCommand({
          Bucket: config.bucketName,
          Key: imageKey,
          Body: imageBuffer,
          ContentType: 'image/jpeg',
        })
      );
    }

    // Store item in DynamoDB with S3 key (not full URL)
    const dynamoItem = {
      id,
      title: data.title,
      price: data.price,
      imageKey: imageKey, // Store only the S3 key
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await dynamoClient.send(
      new PutCommand({
        TableName: config.tableName,
        Item: dynamoItem,
      })
    );

    const snsMessage = {
      id,
      action: 'data_created',
      timestamp,
      hasImage: !!imageKey,
    };

    await snsClient.send(
      new PublishCommand({
        TopicArn: config.snsTopicArn,
        Message: JSON.stringify(snsMessage),
        Subject: 'Data Created Notification',
      })
    );

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Data created successfully',
        id,
        imageKey, // Return the S3 key instead of full URL
      }),
    };
  } catch (error: any) {
    console.error('Main API error:', error);

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

