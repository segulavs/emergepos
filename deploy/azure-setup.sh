#!/bin/bash

# Azure AKS Setup Script for POS System
# This script creates a cost-optimized AKS cluster

set -e

# Configuration
RESOURCE_GROUP="pos-system-rg"
LOCATION="eastus"  # Choose a cost-effective region
CLUSTER_NAME="pos-aks-cluster"
ACR_NAME="posacr$(date +%s)"  # Unique ACR name
NODE_COUNT=2
NODE_SIZE="Standard_B2s"  # Cost-effective VM size

echo "🚀 Setting up Azure resources for POS System..."

# Login to Azure (if not already logged in)
echo "📝 Checking Azure login..."
az account show > /dev/null 2>&1 || az login

# Create resource group
echo "📦 Creating resource group..."
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Azure Container Registry
echo "🐳 Creating Azure Container Registry..."
az acr create --resource-group $RESOURCE_GROUP \
              --name $ACR_NAME \
              --sku Basic \
              --location $LOCATION

# Create AKS cluster with cost optimization
echo "☸️  Creating AKS cluster..."
az aks create \
    --resource-group $RESOURCE_GROUP \
    --name $CLUSTER_NAME \
    --node-count $NODE_COUNT \
    --node-vm-size $NODE_SIZE \
    --location $LOCATION \
    --attach-acr $ACR_NAME \
    --enable-managed-identity \
    --enable-cluster-autoscaler \
    --min-count 1 \
    --max-count 3 \
    --node-osdisk-size 30 \
    --enable-addons monitoring \
    --generate-ssh-keys

# Get AKS credentials
echo "🔑 Getting AKS credentials..."
az aks get-credentials --resource-group $RESOURCE_GROUP --name $CLUSTER_NAME --overwrite-existing

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

echo "✅ Azure setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update the ACR name in k8s/app-deployment.yaml: $ACR_NAME.azurecr.io"
echo "2. Update your domain in k8s/ingress.yaml"
echo "3. Update your email in the ClusterIssuer above"
echo "4. Build and push your Docker image:"
echo "   az acr login --name $ACR_NAME"
echo "   docker build -t $ACR_NAME.azurecr.io/pos-system:latest ."
echo "   docker push $ACR_NAME.azurecr.io/pos-system:latest"
echo "5. Deploy the application: ./deploy/deploy.sh"
echo ""
echo "💰 Cost optimization features enabled:"
echo "   - Cluster autoscaler (1-3 nodes)"
echo "   - HPA for pod scaling"
echo "   - Cost-effective VM sizes"
echo "   - Basic ACR tier"