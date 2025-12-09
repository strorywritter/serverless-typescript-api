// Local runner for get-items function
// Usage: npx tsx src/get-items/local-run.ts

import { handler } from './index.js';
import { APIGatewayProxyEvent } from 'aws-lambda';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Create test event
const event: APIGatewayProxyEvent = {
  body: null,
  headers: {
    Authorization: `Bearer ${process.argv[2] || 'test-token'}`,
  },
  multiValueHeaders: {},
  httpMethod: 'GET',
  isBase64Encoded: false,
  path: '/data',
  pathParameters: process.argv[3] ? { id: process.argv[3] } : null,
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
