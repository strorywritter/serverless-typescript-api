# Serverless TypeScript API with Full CRUD Operations

A complete serverless project built with TypeScript, AWS Lambda, DynamoDB, S3, SNS, and Cognito. This project provides a full-featured API with authentication, data management, image storage, and notifications.

## 🚀 Features

- **Authentication**: User signup and login with AWS Cognito (auto-verified emails)
- **Full CRUD Operations**: Create, Read, Update, Delete items
- **Image Storage**: Automatic image upload to S3 with pre-signed URLs
- **Notifications**: SNS notifications for data operations
- **TypeScript**: Full TypeScript support with ES modules
- **Testing**: Jest unit tests for all Lambda functions
- **Local Development**: Run functions locally without Docker
- **Infrastructure as Code**: AWS SAM template for automated deployment
- **CI/CD Action**: AWS SAM template integrated with GitHub Actions CI workflow
- 
## 📁 Project Structure

```
.
├── src/
│   ├── config/
│   │   ├── env.ts              # Environment configuration
│   │   └── env.test.ts         # Config tests
│   ├── signup/
│   │   ├── index.ts            # Signup Lambda function
│   │   ├── index.test.ts       # Signup tests
│   │   └── local-run.ts        # Local execution script
│   ├── login/
│   │   ├── index.ts            # Login Lambda function
│   │   ├── index.test.ts       # Login tests
│   │   └── local-run.ts        # Local execution script
│   ├── main-api/
│   │   ├── index.ts            # Create Item Lambda function
│   │   ├── index.test.ts       # Main API tests
│   │   └── local-run.ts        # Local execution script
│   ├── get-items/
│   │   ├── index.ts            # Get Items Lambda function
│   │   ├── index.test.ts       # Get items tests
│   │   └── local-run.ts        # Local execution script
│   ├── update-item/
│   │   ├── index.ts            # Update Item Lambda function
│   │   ├── index.test.ts       # Update item tests
│   │   └── local-run.ts        # Local execution script
│   └── delete-item/
│       ├── index.ts            # Delete Item Lambda function
│       ├── index.test.ts       # Delete item tests
│       └── local-run.ts        # Local execution script
├── dist/                       # Compiled JavaScript output
├── node_modules/               # Dependencies
├── .aws-sam/                   # SAM build artifacts
├── env-local.json              # Local environment configuration
├── env.template                # Environment variables template
├── template.yaml               # AWS SAM template
├── package.json                # Node.js dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── jest.config.js              # Jest testing configuration
├── samconfig.toml             # SAM deployment configuration
└── README.md                   # This file
```

## 🛠 Prerequisites

Before you begin, ensure you have the following installed:

### 1. Node.js 20.x or higher
```bash
node --version  # Should be v20.x or higher
```

### 2. AWS CLI
```bash
aws --version  # Should be v2.x
```

### 3. AWS SAM CLI
```bash
sam --version  # Should be v1.100.0 or higher
```

### 4. Git
```bash
git --version
```

### 5. Make (optional, for using Makefile commands)
```bash
make --version
```

## 📦 Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd serverless-typescript-api
```

2. **Install dependencies**
```bash
npm install
```

3. **Build the project**
```bash
npm run build
```

## ⚙️ Configuration

### 1. Environment Variables

Copy the environment template and configure your settings:

```bash
cp env.template .env
```

Edit `.env` with your actual values:
```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_PROFILE=your-aws-profile

# Cognito Configuration
COGNITO_USER_POOL_ID=your-user-pool-id
COGNITO_CLIENT_ID=your-client-id

# DynamoDB Configuration
DYNAMODB_TABLE=your-table-name

# S3 Configuration
S3_BUCKET=your-bucket-name

# SNS Configuration
SNS_TOPIC_ARN=arn:aws:sns:region:account:topic-name
```

### 2. Local Development Configuration

For local testing, configure `env-local.json`:

```json
{
  "SignupFunction": {
    "USER_POOL_ID": "us-east-1_example",
    "USER_POOL_CLIENT_ID": "example_client_id"
  },
  "LoginFunction": {
    "USER_POOL_ID": "us-east-1_example",
    "USER_POOL_CLIENT_ID": "example_client_id"
  },
  "MainApiFunction": {
    "TABLE_NAME": "dev-data-table",
    "BUCKET_NAME": "dev-image-bucket",
    "SNS_TOPIC_ARN": "arn:aws:sns:us-east-1:123456789012:dev-notifications"
  }
}
```

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Specific Test Files
```bash
npx jest src/signup/index.test.ts
npx jest src/login/index.test.ts
```

## 🚀 Running Locally

### Method 1: SAM Local API (with Docker)

1. **Start the local API**
```bash
npm run sam:local
```

2. **Test endpoints**
```bash
# Signup
curl -X POST http://localhost:3000/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "TempPass123!"}'

# Login
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "TempPass123!"}'
```

### Method 2: Direct Node.js Execution (without Docker)

Run individual Lambda functions locally:

```bash
# Signup
npm run local:signup

# Login
npm run local:login

# Create Item
npm run local:main-api

# Get Items
npm run local:get-items

# Update Item
npm run local:update-item

# Delete Item
npm run local:delete-item
```

## 🚀 Deployment

### 1. Initial Deployment

```bash
# Build and deploy with guided setup
npm run sam:deploy
```

This will:
- Create all AWS resources (Cognito, DynamoDB, S3, SNS, Lambda functions)
- Set up API Gateway
- Configure IAM permissions
- Provide the API endpoint URL

### 2. Update Deployment

```bash
# Build and deploy updates
npm run sam:deploy-update
```

### 3. Manual Deployment Steps

If you prefer manual control:

```bash
# Build the SAM application
npm run sam:build

# Deploy to AWS
sam deploy --guided
```

## 📡 API Endpoints

After deployment, you'll get an API Gateway URL. Here are all available endpoints:

### Authentication Endpoints

#### 1. User Signup
```http
POST /signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "userId": "uuid-string",
  "confirmed": true,
  "userStatus": "CONFIRMED"
}
```

#### 2. User Login
```http
POST /login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "accessToken": "jwt-token-here",
  "refreshToken": "refresh-token-here",
  "idToken": "id-token-here"
}
```

### Data Management Endpoints

#### 3. Create Item
```http
POST /data
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "title": "Sample Item",
  "price": 29.99,
  "image": "https://example.com/image.jpg"
}
```

**Response:**
```json
{
  "message": "Data created successfully",
  "id": "uuid-string",
  "imageKey": "uuid/uuid.jpg"
}
```

#### 4. Get All Items
```http
GET /data
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "message": "Items retrieved successfully",
  "items": [
    {
      "id": "uuid-1",
      "title": "Item 1",
      "price": 19.99,
      "imageKey": "uuid1/uuid1.jpg",
      "imageUrl": "https://presigned-s3-url",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "count": 1,
  "lastEvaluatedKey": null
}
```

#### 5. Get Single Item
```http
GET /data/{id}
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "message": "Item retrieved successfully",
  "item": {
    "id": "uuid-string",
    "title": "Sample Item",
    "price": 29.99,
    "imageKey": "uuid/uuid.jpg",
    "imageUrl": "https://presigned-s3-url",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

#### 6. Update Item
```http
PUT /data/{id}
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "title": "Updated Item Title",
  "price": 39.99
}
```

**Response:**
```json
{
  "message": "Item updated successfully",
  "updatedId": "uuid-string"
}
```

#### 7. Delete Item
```http
DELETE /data/{id}
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "message": "Item deleted successfully",
  "deletedId": "uuid-string"
}
```

## 🔧 Available Scripts

```bash
# Development
npm run build          # Compile TypeScript
npm run test           # Run all tests
npm run test:coverage  # Run tests with coverage
npm run test:watch     # Run tests in watch mode

# Local Development
npm run sam:local      # Start local API with Docker
npm run local:signup   # Run signup locally
npm run local:login    # Run login locally
npm run local:main-api # Run main API locally
npm run local:get-items    # Run get items locally
npm run local:update-item  # Run update item locally
npm run local:delete-item  # Run delete item locally

# Deployment
npm run sam:build      # Build SAM application
npm run sam:deploy     # Deploy with guided setup
npm run sam:deploy-update  # Quick update deployment
```

## 🏗 AWS Resources Created

The SAM template creates the following AWS resources:

- **Cognito User Pool**: User authentication and management
- **API Gateway**: REST API endpoints
- **Lambda Functions**: 6 serverless functions
- **DynamoDB Table**: Data storage
- **S3 Bucket**: Image storage
- **SNS Topic**: Notifications
- **IAM Roles**: Function permissions

## 🐛 Troubleshooting

### Common Issues

1. **SAM build fails**
```bash
# Clear SAM build cache
rm -rf .aws-sam/
npm run sam:build
```

2. **Tests fail**
```bash
# Clear Jest cache
npx jest --clearCache
npm test
```

3. **Local API doesn't start**
```bash
# Ensure Docker is running
docker --version
# Check if port 3000 is available
```

4. **Deployment fails**
```bash
# Check AWS credentials
aws sts get-caller-identity
# Check SAM CLI version
sam --version
```

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AWS_REGION` | AWS region for deployment | Yes |
| `AWS_PROFILE` | AWS CLI profile name | No |
| `COGNITO_USER_POOL_ID` | Cognito User Pool ID | Yes (after deployment) |
| `COGNITO_CLIENT_ID` | Cognito Client ID | Yes (after deployment) |
| `DYNAMODB_TABLE` | DynamoDB table name | Yes (after deployment) |
| `S3_BUCKET` | S3 bucket name | Yes (after deployment) |
| `SNS_TOPIC_ARN` | SNS topic ARN | Yes (after deployment) |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

If you encounter any issues or have questions:

1. Check the troubleshooting section
2. Review the AWS documentation
3. Open an issue in the repository

---

**Happy coding! 🚀**
