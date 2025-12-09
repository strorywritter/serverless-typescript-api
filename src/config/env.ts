import dotenv from 'dotenv';

dotenv.config();

export const config = {
  environment: process.env.ENVIRONMENT || 'dev',
  tableName: process.env.TABLE_NAME || '',
  bucketName: process.env.BUCKET_NAME || '',
  snsTopicArn: process.env.SNS_TOPIC_ARN || '',
  userPoolId: process.env.USER_POOL_ID || '',
  userPoolClientId: process.env.USER_POOL_CLIENT_ID || '',
  awsRegion: process.env.AWS_REGION || 'us-east-1',
};

export const validateConfig = (): void => {
  const required = ['tableName', 'bucketName', 'snsTopicArn', 'userPoolId', 'userPoolClientId'];
  const missing = required.filter((key) => !config[key as keyof typeof config]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

