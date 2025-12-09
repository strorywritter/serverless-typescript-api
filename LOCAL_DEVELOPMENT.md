# Local Development Guide

This guide shows you how to run and test your serverless application locally using AWS SAM CLI.

## Prerequisites

1. **AWS SAM CLI** installed
   ```bash
   # Check if installed
   sam --version
   
   # Install if needed: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
   ```

2. **Docker** running (required for local Lambda execution)
   - SAM uses Docker to simulate the Lambda runtime environment
   - Make sure Docker Desktop is running

3. **AWS Credentials** configured (for testing with real AWS services)
   ```bash
   aws configure
   ```

## Quick Start

### 1. Build the Project

```bash
# Build TypeScript
npm run build

# Build SAM application
npm run sam:build
```

### 2. Run API Gateway Locally

```bash
npm run sam:local
```

Or directly:
```bash
sam local start-api
```

This starts the API Gateway locally on `http://localhost:3000`

## Method 1: Run Full API Locally

### Start Local API Gateway

```bash
# Build first
npm run build
npm run sam:build

# Start local API
sam local start-api --port 3000
```

### Test Endpoints

Once running, test the endpoints:

**Signup:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/signup" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"test@example.com","password":"Test123!@#"}'
```

**Login:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"test@example.com","password":"Test123!@#"}'
```

**Main API:**
```powershell
# First get token from login, then:
Invoke-RestMethod -Uri "http://localhost:3000/data" `
  -Method POST `
  -ContentType "application/json" `
  -Headers @{Authorization = "Bearer YOUR_TOKEN"} `
  -Body '{"data":{"name":"Test Item"}}'
```

## Method 2: Invoke Individual Lambda Functions

### Invoke Signup Function

```bash
# Create test event file
echo '{"body":"{\"email\":\"test@example.com\",\"password\":\"Test123!@#\"}","headers":{"Content-Type":"application/json"}}' > signup-event.json

# Invoke function
sam local invoke SignupFunction --event signup-event.json
```

### Invoke Login Function

```bash
# Create test event file
echo '{"body":"{\"email\":\"test@example.com\",\"password\":\"Test123!@#\"}","headers":{"Content-Type":"application/json"}}' > login-event.json

# Invoke function
sam local invoke LoginFunction --event login-event.json
```

### Invoke Main API Function

```bash
# Create test event file (with auth token)
echo '{"body":"{\"data\":{\"name\":\"Test Item\"}}","headers":{"Content-Type":"application/json","Authorization":"Bearer YOUR_TOKEN"}}' > mainapi-event.json

# Invoke function
sam local invoke MainApiFunction --event mainapi-event.json
```

## Environment Variables for Local Testing

### Option 1: Use Real AWS Resources (Recommended for Testing)

Create a `.env` file with your deployed AWS resource values:

```env
ENVIRONMENT=dev
TABLE_NAME=dev-data-table
BUCKET_NAME=dev-image-bucket-ACCOUNT_ID
SNS_TOPIC_ARN=arn:aws:sns:ap-southeast-2:ACCOUNT_ID:dev-notification-topic
USER_POOL_ID=ap-southeast-2_XXXXXXXXX
USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxx
AWS_REGION=ap-southeast-2
```

Get these values from your deployed stack:
```bash
aws cloudformation describe-stacks \
  --stack-name add-sls-repo \
  --region ap-southeast-2 \
  --query "Stacks[0].Outputs" \
  --output table
```

### Option 2: Use LocalStack (Advanced)

For completely local testing without AWS, you can use LocalStack, but it requires additional setup.

## Setting Environment Variables for SAM Local

### Method 1: Using --env-vars flag

Create `env.json`:
```json
{
  "SignupFunction": {
    "USER_POOL_ID": "ap-southeast-2_XXXXXXXXX",
    "USER_POOL_CLIENT_ID": "xxxxxxxxxxxxxxxxxxxxx",
    "AWS_REGION": "ap-southeast-2"
  },
  "LoginFunction": {
    "USER_POOL_ID": "ap-southeast-2_XXXXXXXXX",
    "USER_POOL_CLIENT_ID": "xxxxxxxxxxxxxxxxxxxxx",
    "AWS_REGION": "ap-southeast-2"
  },
  "MainApiFunction": {
    "TABLE_NAME": "dev-data-table",
    "BUCKET_NAME": "dev-image-bucket-ACCOUNT_ID",
    "SNS_TOPIC_ARN": "arn:aws:sns:ap-southeast-2:ACCOUNT_ID:dev-notification-topic",
    "AWS_REGION": "ap-southeast-2"
  }
}
```

Then run:
```bash
sam local start-api --env-vars env.json
```

### Method 2: Using template.yaml (Already Configured)

The template.yaml already has environment variables configured. SAM local will use these, but you need to ensure your `.env` file is loaded or values are set.

## Complete Local Testing Script

Create `test-local.ps1`:

```powershell
# Local Testing Script
# Usage: .\test-local.ps1

$localApiUrl = "http://localhost:3000"

Write-Host "`n=== Testing Local API ===" -ForegroundColor Green
Write-Host "Make sure SAM local API is running: sam local start-api`n" -ForegroundColor Yellow

# Test 1: Signup
Write-Host "1. Testing Signup..." -ForegroundColor Cyan
try {
    $signupResponse = Invoke-RestMethod -Uri "$localApiUrl/signup" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"email":"localtest@example.com","password":"Test123!@#"}'
    
    Write-Host "   ✓ Signup successful!" -ForegroundColor Green
    Write-Host "   User Status: $($signupResponse.userStatus)" -ForegroundColor Gray
    Write-Host ($signupResponse | ConvertTo-Json) -ForegroundColor White
} catch {
    Write-Host "   ✗ Signup failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Response: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}

# Test 2: Login
Write-Host "`n2. Testing Login..." -ForegroundColor Cyan
try {
    $loginResponse = Invoke-RestMethod -Uri "$localApiUrl/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"email":"localtest@example.com","password":"Test123!@#"}'
    
    $token = $loginResponse.accessToken
    Write-Host "   ✓ Login successful!" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0, 30))..." -ForegroundColor Gray
} catch {
    Write-Host "   ✗ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Response: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
    exit
}

# Test 3: Main API
Write-Host "`n3. Testing Main API..." -ForegroundColor Cyan
try {
    $mainApiResponse = Invoke-RestMethod -Uri "$localApiUrl/data" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{Authorization = "Bearer $token"} `
        -Body '{"data":{"name":"Local Test Item","description":"Created via local testing"}}'
    
    Write-Host "   ✓ Main API successful!" -ForegroundColor Green
    Write-Host ($mainApiResponse | ConvertTo-Json) -ForegroundColor White
} catch {
    Write-Host "   ✗ Main API failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Response: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Testing Complete ===" -ForegroundColor Green
```

## Debugging

### View Lambda Logs

When running `sam local start-api`, logs are displayed in the terminal. You can also use:

```bash
# Invoke with debug output
sam local invoke SignupFunction --event signup-event.json --debug
```

### Set Breakpoints (VS Code)

1. Install AWS Toolkit extension for VS Code
2. Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "SAM Local Debug",
      "runtimeExecutable": "sam",
      "runtimeArgs": ["local", "invoke", "SignupFunction", "--event", "signup-event.json"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Common Issues

**Issue: Docker not running**
```
Error: Running AWS SAM projects locally requires Docker
```
**Solution**: Start Docker Desktop

**Issue: Port already in use**
```
Error: Port 3000 is already in use
```
**Solution**: Use a different port:
```bash
sam local start-api --port 3001
```

**Issue: Environment variables not set**
```
Error: Missing required environment variables
```
**Solution**: Create `env.json` and use `--env-vars env.json` flag

**Issue: Cannot connect to AWS services**
```
Error: Unable to locate credentials
```
**Solution**: Configure AWS credentials:
```bash
aws configure
```

## Hot Reload (Development)

For faster development, you can use watch mode:

```bash
# Terminal 1: Watch for changes and rebuild
npm run build -- --watch

# Terminal 2: Run SAM local
sam local start-api --warm-containers EAGER
```

## Testing with Different Environments

### Test Against Dev Environment

```bash
# Use dev environment variables
sam local start-api --env-vars env-dev.json
```

### Test Against Staging Environment

```bash
# Use staging environment variables
sam local start-api --env-vars env-staging.json
```

## Performance Tips

1. **Use Warm Containers**: `--warm-containers EAGER` keeps containers warm for faster invocations
2. **Skip Pulling Images**: `--skip-pull-image` if you already have the images
3. **Use Cached Builds**: SAM automatically caches builds

## Complete Workflow

```bash
# 1. Make code changes
# Edit src/signup/index.ts

# 2. Build
npm run build

# 3. Rebuild SAM (if template changed)
npm run sam:build

# 4. Start local API
sam local start-api

# 5. Test (in another terminal)
.\test-local.ps1

# 6. View logs in the SAM terminal
```

## Quick Reference

```bash
# Build
npm run build
npm run sam:build

# Run API locally
sam local start-api

# Invoke single function
sam local invoke SignupFunction --event event.json

# With environment variables
sam local start-api --env-vars env.json

# With debug
sam local invoke SignupFunction --event event.json --debug

# Different port
sam local start-api --port 3001

# Warm containers
sam local start-api --warm-containers EAGER
```

## Next Steps

1. Set up your `.env` file with AWS resource values
2. Start Docker Desktop
3. Run `npm run build && npm run sam:build`
4. Run `sam local start-api`
5. Test with `.\test-local.ps1` or use Postman/curl

For more details, see the [AWS SAM Local Documentation](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html).

