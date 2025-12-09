import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './index.js';
import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';

jest.mock('@aws-sdk/client-cognito-identity-provider');
jest.mock('../config/env.js', () => ({
  config: {
    userPoolClientId: 'test-client-id',
    awsRegion: 'us-east-1',
  },
  validateConfig: jest.fn(),
}));

const mockSend = jest.fn();
jest.spyOn(CognitoIdentityProviderClient.prototype, 'send').mockImplementation(mockSend);

describe('Login Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully login and return tokens', async () => {
    const mockResponse = {
      AuthenticationResult: {
        AccessToken: 'access-token',
        IdToken: 'id-token',
        RefreshToken: 'refresh-token',
        ExpiresIn: 3600,
      },
    };

    mockSend.mockResolvedValue(mockResponse);

    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Test123!@#',
      }),
    } as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toMatchObject({
      accessToken: 'access-token',
      idToken: 'id-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600,
    });
    expect(mockSend).toHaveBeenCalledWith(expect.any(InitiateAuthCommand));
  });

  it('should return 400 if body is missing', async () => {
    const event: APIGatewayProxyEvent = {
      body: null,
      headers: {},
      multiValueHeaders: {},
      httpMethod: 'POST',
      isBase64Encoded: false,
      path: '/login',
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as any,
      resource: '',
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Request body is required');
  });

  it('should return 400 if email or password is missing', async () => {
    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({
        email: 'test@example.com',
      }),
    } as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toBe('Email and password are required');
  });

  it('should return 401 if authentication fails', async () => {
    const error = new Error('Invalid credentials');
    error.name = 'NotAuthorizedException';
    mockSend.mockRejectedValue(error);

    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'WrongPassword',
      }),
    } as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body).error).toBe('Invalid credentials');
  });

  it('should return 401 if AuthenticationResult is missing', async () => {
    mockSend.mockResolvedValue({});

    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Test123!@#',
      }),
    } as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body).error).toBe('Authentication failed');
  });

  it('should return 500 on unexpected error', async () => {
    mockSend.mockRejectedValue(new Error('Unexpected error'));

    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Test123!@#',
      }),
    } as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
  });
});

