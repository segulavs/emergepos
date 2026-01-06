#!/bin/bash

# Build and push Docker image to Azure Container Registry

set -e

# Configuration - Update these values
ACR_NAME="your-acr-name"  # Replace with your ACR name from azure-setup.sh output
IMAGE_TAG="latest"

if [ "$ACR_NAME" = "your-acr-name" ]; then
    echo "❌ Please update ACR_NAME in this script with your actual ACR name"
    echo "   You can find it in the output of azure-setup.sh"
    exit 1
fi

echo "🐳 Building and pushing Docker image..."

# Login to ACR
echo "🔑 Logging into Azure Container Registry..."
az acr login --name $ACR_NAME

# Build the Docker image
echo "🔨 Building Docker image..."
docker build -t $ACR_NAME.azurecr.io/pos-system:$IMAGE_TAG .

# Push the image
echo "📤 Pushing image to ACR..."
docker push $ACR_NAME.azurecr.io/pos-system:$IMAGE_TAG

echo "✅ Image pushed successfully!"
echo "📋 Image: $ACR_NAME.azurecr.io/pos-system:$IMAGE_TAG"
echo ""
echo "🔄 Don't forget to update k8s/app-deployment.yaml with this image name"