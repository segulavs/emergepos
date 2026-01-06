#!/bin/bash

# Build and push Docker image to Google Artifact Registry

set -e

# Configuration
PROJECT_ID=${1:-""}
REGION=${2:-"us-central1"}
REGISTRY_NAME="pos-registry"
IMAGE_TAG="latest"

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Usage: $0 <project-id> [region]"
    echo "   project-id: Your GCP project ID"
    echo "   region: GCP region (default: us-central1)"
    exit 1
fi

IMAGE_URI="$REGION-docker.pkg.dev/$PROJECT_ID/$REGISTRY_NAME/pos-system:$IMAGE_TAG"

echo "🐳 Building and pushing Docker image to Google Artifact Registry..."
echo "📋 Image URI: $IMAGE_URI"

# Configure Docker for Artifact Registry
echo "🔑 Configuring Docker for Artifact Registry..."
gcloud auth configure-docker $REGION-docker.pkg.dev

# Build the Docker image
echo "🔨 Building Docker image..."
docker build -t $IMAGE_URI .

# Push the image
echo "📤 Pushing image to Artifact Registry..."
docker push $IMAGE_URI

echo "✅ Image pushed successfully!"
echo "📋 Image URI: $IMAGE_URI"
echo ""
echo "🔄 Don't forget to update gcp/k8s/app-deployment.yaml with this image URI"