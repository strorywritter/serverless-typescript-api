import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  AdminConfirmSignUpCommand,
  AdminGetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { config, validateConfig } from '../config/env.js';

const cognitoClient = new CognitoIdentityProviderClient({ region: config.awsRegion });

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    validateConfig();
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

    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Email and password are required' }),
      };
    }

    const signUpCommand = new SignUpCommand({
      ClientId: config.userPoolClientId,
      Username: email,
      Password: password,
      UserAttributes: [
        {
          Name: 'email',
          Value: email,
        },
      ],
    });

    const signUpResponse = await cognitoClient.send(signUpCommand);

    // Auto-confirm the user so they can login immediately
    // This sets the user's confirmation status to "CONFIRMED" in Cognito
    try {
      const confirmCommand = new AdminConfirmSignUpCommand({
        UserPoolId: config.userPoolId,
        Username: email,
      });
      await cognitoClient.send(confirmCommand);
      
      // Verify the user status is now CONFIRMED
      const getUserCommand = new AdminGetUserCommand({
        UserPoolId: config.userPoolId,
        Username: email,
      });
      const userDetails = await cognitoClient.send(getUserCommand);
      
      const userStatus = userDetails.UserStatus; // Should be "CONFIRMED"
      
      if (userStatus !== 'CONFIRMED') {
        console.warn(`User status is ${userStatus}, expected CONFIRMED`);
      }
      
      return {
        statusCode: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          message: 'User created and confirmed successfully',
          userSub: signUpResponse.UserSub,
          confirmed: true,
          userStatus: userStatus,
        }),
      };
    } catch (confirmError: any) {
      // If user is already confirmed, verify and return success
      if (confirmError.name === 'NotAuthorizedException' || confirmError.name === 'AliasExistsException') {
        try {
          const getUserCommand = new AdminGetUserCommand({
            UserPoolId: config.userPoolId,
            Username: email,
          });
          const userDetails = await cognitoClient.send(getUserCommand);
          
          if (userDetails.UserStatus === 'CONFIRMED') {
            return {
              statusCode: 201,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
              body: JSON.stringify({
                message: 'User created and confirmed successfully',
                userSub: signUpResponse.UserSub,
                confirmed: true,
                userStatus: 'CONFIRMED',
              }),
            };
          }
        } catch (getUserError) {
          console.error('Error getting user status:', getUserError);
        }
      }
      
      // If confirmation failed for other reasons, log but still return success
      // The user was created, even if confirmation had issues
      console.warn('Auto-confirmation warning:', confirmError.message);
      
      return {
        statusCode: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          message: 'User created successfully',
          userSub: signUpResponse.UserSub,
          confirmed: false,
          warning: 'Auto-confirmation may have failed. Please verify user status in Cognito.',
        }),
      };
    }
  } catch (error: any) {
    console.error('Signup error:', error);
    
    if (error.name === 'UsernameExistsException') {
      return {
        statusCode: 409,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'User already exists' }),
      };
    }

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

