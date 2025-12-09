import { APIGatewayProxyEvent } from 'aws-lambda';
import { DynamoDBDocumentClient, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/client-sns');
jest.mock('../config/env.js', () => ({
  config: {
    tableName: 'test-table',
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

describe('Delete Item Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDynamoSend.mockResolvedValue({});
    mockSNSSend.mockResolvedValue({});
  });

  it('should return 401 if authorization header is missing', async () => {
    const event: APIGatewayProxyEvent = {
      headers: {},
      multiValueHeaders: {},
      httpMethod: 'DELETE',
      isBase64Encoded: false,
      path: '/data/{id}',
      pathParameters: { id: '1' },
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as any,
      resource: '',
      body: null,
    } as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body).error).toBe('Authorization header is required');
  });

  it('should return 400 if ID is missing', async () => {
    const event: APIGatewayProxyEvent = {
      headers: {
        Authorization: 'Bearer test-token',
      },
      multiValueHeaders: {},
      httpMethod: 'DELETE',
      isBase64Encoded: false,
      path: '/data/{id}',
      pathParameters: {},
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as any,
      resource: '',
      body: null,
    } as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Item ID is required in path parameter');
  });

  it('should return 404 if item not found', async () => {
    mockDynamoSend.mockResolvedValueOnce({
      Item: undefined,
    });

    const event: APIGatewayProxyEvent = {
      headers: {
        Authorization: 'Bearer test-token',
      },
      multiValueHeaders: {},
      httpMethod: 'DELETE',
      isBase64Encoded: false,
      path: '/data/{id}',
      pathParameters: { id: 'nonexistent' },
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as any,
      resource: '',
      body: null,
    } as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body).error).toBe('Item not found');
  });

  it('should delete item successfully', async () => {
    const existingItem = { id: '1', title: 'Item to Delete', price: 19.99 };

    mockDynamoSend
      .mockResolvedValueOnce({ Item: existingItem }) // Get existing item
      .mockResolvedValueOnce({}); // Delete command

    mockSNSSend.mockResolvedValue({});

    const event: APIGatewayProxyEvent = {
      headers: {
        Authorization: 'Bearer test-token',
      },
      multiValueHeaders: {},
      httpMethod: 'DELETE',
      isBase64Encoded: false,
      path: '/data/{id}',
      pathParameters: { id: '1' },
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as any,
      resource: '',
      body: null,
    } as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Item deleted successfully');
    expect(body.deletedId).toBe('1');
    expect(mockDynamoSend).toHaveBeenCalledWith(expect.any(GetCommand));
    expect(mockDynamoSend).toHaveBeenCalledWith(expect.any(DeleteCommand));
    expect(mockSNSSend).toHaveBeenCalledWith(expect.any(PublishCommand));
  });

  it('should return 500 on error', async () => {
    mockDynamoSend.mockRejectedValue(new Error('DynamoDB error'));

    const event: APIGatewayProxyEvent = {
      headers: {
        Authorization: 'Bearer test-token',
      },
      multiValueHeaders: {},
      httpMethod: 'DELETE',
      isBase64Encoded: false,
      path: '/data/{id}',
      pathParameters: { id: '1' },
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as any,
      resource: '',
      body: null,
    } as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
  });
});
