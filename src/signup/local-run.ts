// Local runner for signup function
// Usage: npx tsx src/signup/local-run.ts

import { handler } from './index.js';
import { APIGatewayProxyEvent } from 'aws-lambda';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Create test event
const event: APIGatewayProxyEvent = {
  body: JSON.stringify({
    email: process.argv[2] || 'nramyashan@gmail.com',
    password: process.argv[3] || 'Test123!@#',
  }),
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

// Run the handler
handler(event)
  .then((response) => {
    console.log('\n=== Response ===');
    console.log('Status Code:', response.statusCode);
    console.log('Body:', JSON.stringify(JSON.parse(response.body), null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n=== Error ===');
    console.error(error);
    process.exit(1);
  });

