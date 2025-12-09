# Quick Start Guide

Follow these steps to get started quickly:

## 1. Initial Setup (One Time)

```bash
# Install dependencies
npm install

# Create .env file
Copy-Item env.template .env  # Windows
# cp env.template .env        # Linux/Mac
```

## 2. Build and Deploy

```bash
# Step 1: Build TypeScript (REQUIRED!)
npm run build

# Step 2: Build SAM application
npm run sam:build

# Step 3: Deploy to AWS
npm run sam:deploy
```

## 3. After Deployment

1. Get outputs from terminal or CloudFormation console
2. Update `.env` file with the output values
3. Test your API endpoints

## Common Issues

### Stack in ROLLBACK_COMPLETE?
```bash
aws cloudformation delete-stack --stack-name serverless-typescript-api --region ap-southeast-2
# Wait for deletion, then redeploy
```

### Handler not found?
```bash
npm run build  # Make sure you build first!
```

### Module not found?
```bash
npm install  # Reinstall dependencies
```

## Full Documentation

See [README.md](./README.md) for complete documentation.

