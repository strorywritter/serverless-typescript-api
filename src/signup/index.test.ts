import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './index.js';
import { CognitoIdentityProviderClient, SignUpCommand, AdminConfirmSignUpCommand, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { config } from '../config/env.js';

jest.mock('@aws-sdk/client-cognito-identity-provider');
jest.mock('../config/env.js', () => ({
  config: {
    userPoolClientId: 'test-client-id',
    userPoolId: 'test-pool-id',
    awsRegion: 'us-east-1',
  },
  validateConfig: jest.fn(),
}));

const mockSend = jest.fn();
jest.spyOn(CognitoIdentityProviderClient.prototype, 'send').mockImplementation(mockSend);

describe('Signup Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully create and auto-confirm a user with CONFIRMED status', async () => {
    const mockSignUpResponse = {
      UserSub: 'test-user-sub',
      CodeDeliveryDetails: {
        Destination: 'test@example.com',
        DeliveryMedium: 'EMAIL',
      },
    };

    const mockUserDetails = {
      UserStatus: 'CONFIRMED',
      Username: 'test@example.com',
      UserAttributes: [
        { Name: 'email', Value: 'test@example.com' },
      ],
    };

    // Mock SignUp, AdminConfirmSignUp, and AdminGetUser calls
    mockSend
      .mockResolvedValueOnce(mockSignUpResponse) // First call: SignUp
      .mockResolvedValueOnce({}) // Second call: AdminConfirmSignUp
      .mockResolvedValueOnce(mockUserDetails); // Third call: AdminGetUser (verification)

    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Test123!@#',
      }),
    } as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body).toMatchObject({
      message: 'User created and confirmed successfully',
      userSub: 'test-user-sub',
      confirmed: true,
      userStatus: 'CONFIRMED',
    });
    expect(mockSend).toHaveBeenCalledWith(expect.any(SignUpCommand));
    expect(mockSend).toHaveBeenCalledWith(expect.any(AdminConfirmSignUpCommand));
    expect(mockSend).toHaveBeenCalledWith(expect.any(AdminGetUserCommand));
  });

  it('should return 400 if body is missing', async () => {
    const event: APIGatewayProxyEvent = {
      body: null,
      headers: {},
      multiValueHeaders: {},
      httpMethod: 'POST',
      isBase64Encoded: false,
      path: '/signup',
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

  it('should return 409 if user already exists', async () => {
    const error = new Error('User already exists');
    error.name = 'UsernameExistsException';
    mockSend.mockRejectedValue(error);

    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({
        email: 'existing@example.com',
        password: 'Test123!@#',
      }),
    } as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(409);
    expect(JSON.parse(result.body).error).toBe('User already exists');
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

