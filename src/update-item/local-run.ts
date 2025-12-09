// Local runner for update-item function
// Usage: npx tsx src/update-item/local-run.ts [token] [itemId]

import { handler } from './index.js';
import { APIGatewayProxyEvent } from 'aws-lambda';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Create test event
const event: APIGatewayProxyEvent = {
  body: JSON.stringify({
    name: 'Updated Item Name',
    description: 'Updated description via local runner',
    category: 'updated',
  }),
  headers: {
    Authorization: `Bearer ${process.argv[2] || 'test-token'}`,
  },
  multiValueHeaders: {},
  httpMethod: 'PUT',
  isBase64Encoded: false,
  path: '/data/{id}',
  pathParameters: { id: process.argv[3] || 'test-item-id' },
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
