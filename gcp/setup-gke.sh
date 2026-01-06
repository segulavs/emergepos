#!/bin/bash

# GCP GKE Setup Script for POS System
# This script creates a cost-optimized GKE cluster

set -e

# Configuration
PROJECT_ID=${1:-""}
REGION="us-central1"  # Cost-effective region
CLUSTER_NAME="pos-gke-cluster"
REGISTRY_NAME="pos-registry"
NODE_COUNT=2
MACHINE_TYPE="e2-standard-2"  # Cost-effective machine type

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Usage: $0 <project-id>"
    echo "   project-id: Your GCP project ID"
    exit 1
fi

echo "🚀 Setting up GCP resources for POS System..."
echo "📋 Project: $PROJECT_ID"
echo "📋 Region: $REGION"

# Check if gcloud is installed and authenticated
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Set project
echo "📝 Setting GCP project..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable container.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable compute.googleapis.com

# Create Artifact Registry repository
echo "🐳 Creating Artifact Registry repository..."
gcloud artifacts repositories create $REGISTRY_NAME \
    --repository-format=docker \
    --location=$REGION \
    --description="POS System container registry" || echo "Repository may already exist"

# Create GKE cluster with cost optimization
echo "☸️  Creating GKE cluster..."
gcloud container clusters create $CLUSTER_NAME \
    --region=$REGION \
    --machine-type=$MACHINE_TYPE \
    --num-nodes=$NODE_COUNT \
    --enable-autoscaling \
    --min-nodes=1 \
    --max-nodes=3 \
    --enable-autorepair \
    --enable-autoupgrade \
    --disk-size=30GB \
    --disk-type=pd-standard \
    --enable-ip-alias \
    --network=default \
    --subnetwork=default \
    --enable-stackdriver-kubernetes \
    --preemptible \
    --node-locations=$REGION-a,$REGION-b

# Get GKE credentials
echo "🔑 Getting GKE credentials..."
gcloud container clusters get-credentials $CLUSTER_NAME --region=$REGION

# Install NGINX Ingress Controller
echo "🌐 Installing NGINX Ingress Controller..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml

# Install cert-manager for SSL certificates
echo "🔒 Installing cert-manager..."
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.2/cert-manager.yaml

# Wait for cert-manager to be ready
echo "⏳ Waiting for cert-manager to be ready..."
kubectl wait --for=condition=ready pod -l app=cert-manager -n cert-manager --timeout=300s

# Create ClusterIssuer for Let's Encrypt
echo "📜 Creating ClusterIssuer for SSL certificates..."
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com  # Replace with your email
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

echo "✅ GCP setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Configure Docker to use Artifact Registry:"
echo "   gcloud auth configure-docker $REGION-docker.pkg.dev"
echo "2. Update the image name in gcp/k8s/app-deployment.yaml:"
echo "   $REGION-docker.pkg.dev/$PROJECT_ID/$REGISTRY_NAME/pos-system:latest"
echo "3. Update your domain in gcp/k8s/ingress.yaml"
echo "4. Update your email in the ClusterIssuer above"
echo "5. Build and push your Docker image:"
echo "   ./gcp/build-and-push.sh $PROJECT_ID $REGION"
echo "6. Deploy the application: ./gcp/deploy.sh"
echo ""
echo "💰 Cost optimization features enabled:"
echo "   - Cluster autoscaler (1-3 nodes)"
echo "   - Preemptible instances"
echo "   - Cost-effective machine types"
echo "   - Standard persistent disks"