#!/bin/bash

# Build and push Docker image to Amazon ECR

set -e

# Configuration
REGION=${1:-"us-east-1"}
ECR_REPO_NAME="pos-system"
IMAGE_TAG="latest"

echo "🐳 Building and pushing Docker image to Amazon ECR..."

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO_NAME:$IMAGE_TAG"

echo "📋 ECR URI: $ECR_URI"

# Login to ECR
echo "🔑 Logging into Amazon ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# Build the Docker image
echo "🔨 Building Docker image..."
docker build -t $ECR_URI .

# Push the image
echo "📤 Pushing image to ECR..."
docker push $ECR_URI

echo "✅ Image pushed successfully!"
echo "📋 ECR URI: $ECR_URI"
echo ""
echo "🔄 Don't forget to update aws/k8s/app-deployment.yaml with this image URI"