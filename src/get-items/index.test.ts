import { APIGatewayProxyEvent } from 'aws-lambda';
import { DynamoDBDocumentClient, ScanCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { SNSClient } from '@aws-sdk/client-sns';

jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/client-sns');
jest.mock('../config/env.js', () => ({
  config: {
    tableName: 'test-table',
    bucketName: 'test-bucket',
    snsTopicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic',
    awsRegion: 'us-east-1',
  },
  validateConfig: jest.fn(),
}));

const mockDynamoSend = jest.fn();
const mockS3Send = jest.fn();
const mockSNSSend = jest.fn();

(DynamoDBDocumentClient.prototype.send as jest.Mock) = mockDynamoSend;
(S3Client.prototype.send as jest.Mock) = mockS3Send;
(SNSClient.prototype.send as jest.Mock) = mockSNSSend;

// Import after mocks are set up
import { handler } from './index.js';

describe('Get Items Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDynamoSend.mockResolvedValue({});
    mockS3Send.mockResolvedValue({});
    mockSNSSend.mockResolvedValue({});
  });

  it('should return 401 if authorization header is missing', async () => {
    const event: APIGatewayProxyEvent = {
      body: null,
      headers: {},
      multiValueHeaders: {},
      httpMethod: 'GET',
      isBase64Encoded: false,
      path: '/data',
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as any,
      resource: '',
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body).error).toBe('Authorization header is required');
  });

  it('should get all items when no ID provided', async () => {
    const mockItems = [
      { id: '1', title: 'Item 1', price: 19.99, imageKey: '1/1.jpg', createdAt: '2023-01-01T00:00:00.000Z' },
      { id: '2', title: 'Item 2', price: 29.99, imageKey: '2/2.jpg', createdAt: '2023-01-02T00:00:00.000Z' },
    ];

    mockDynamoSend.mockResolvedValue({
      Items: mockItems,
      Count: 2,
    });

    // Mock S3 signed URL generation
    mockS3Send.mockImplementation(() => Promise.resolve('https://presigned-url-1'));
    mockS3Send.mockImplementation(() => Promise.resolve('https://presigned-url-2'));

    const event: APIGatewayProxyEvent = {
      body: null,
      headers: {
        Authorization: 'Bearer test-token',
      },
      multiValueHeaders: {},
      httpMethod: 'GET',
      isBase64Encoded: false,
      path: '/data',
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as any,
      resource: '',
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Items retrieved successfully');
    expect(body.count).toBe(2);
    expect(mockDynamoSend).toHaveBeenCalledWith(expect.any(ScanCommand));
  });

  it('should get single item when ID provided', async () => {
    const mockItem = { id: '1', title: 'Item 1', price: 19.99, imageKey: '1/1.jpg', createdAt: '2023-01-01T00:00:00.000Z' };

    mockDynamoSend.mockResolvedValue({
      Item: mockItem,
    });

    const event: APIGatewayProxyEvent = {
      body: null,
      headers: {
        Authorization: 'Bearer test-token',
      },
      multiValueHeaders: {},
      httpMethod: 'GET',
      isBase64Encoded: false,
      path: '/data/{id}',
      pathParameters: { id: '1' },
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as any,
      resource: '',
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Item retrieved successfully');
    expect(body.item.id).toBe('1');
    expect(body.item.title).toBe('Item 1');
    expect(body.item.imageUrl).toBeDefined(); // Should have generated URL
    expect(mockDynamoSend).toHaveBeenCalledWith(expect.any(GetCommand));
  });

  it('should return 404 when item not found', async () => {
    mockDynamoSend.mockResolvedValue({
      Item: undefined,
    });

    const event: APIGatewayProxyEvent = {
      body: null,
      headers: {
        Authorization: 'Bearer test-token',
      },
      multiValueHeaders: {},
      httpMethod: 'GET',
      isBase64Encoded: false,
      path: '/data/{id}',
      pathParameters: { id: 'nonexistent' },
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as any,
      resource: '',
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body).error).toBe('Item not found');
  });

  it('should return 500 on error', async () => {
    mockDynamoSend.mockRejectedValue(new Error('DynamoDB error'));

    const event: APIGatewayProxyEvent = {
      body: null,
      headers: {
        Authorization: 'Bearer test-token',
      },
      multiValueHeaders: {},
      httpMethod: 'GET',
      isBase64Encoded: false,
      path: '/data',
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as any,
      resource: '',
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
  });
});
