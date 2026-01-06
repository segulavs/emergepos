#!/bin/bash

# Enhanced deployment script with environment support

set -e

# Configuration
ENVIRONMENT=${1:-production}  # Default to production
ACR_NAME=${2:-""}

if [ -z "$ACR_NAME" ]; then
    echo "❌ Usage: $0 <environment> <acr-name>"
    echo "   environment: production or development"
    echo "   acr-name: Your Azure Container Registry name"
    exit 1
fi

if [ "$ENVIRONMENT" != "production" ] && [ "$ENVIRONMENT" != "development" ]; then
    echo "❌ Environment must be 'production' or 'development'"
    exit 1
fi

echo "🚀 Deploying POS System to AKS ($ENVIRONMENT environment)..."

# Check if kubectl is configured
kubectl cluster-info > /dev/null 2>&1 || {
    echo "❌ kubectl is not configured. Please run azure-setup.sh first."
    exit 1
}

# Update ACR name in kustomization
sed -i.bak "s/your-acr-name/$ACR_NAME/g" k8s/environments/$ENVIRONMENT/kustomization.yaml

# Deploy using kustomize
echo "📦 Deploying with kustomize..."
kubectl apply -k k8s/environments/$ENVIRONMENT/

# Wait for deployments to be ready
echo "⏳ Waiting for deployments to be ready..."
if [ "$ENVIRONMENT" = "production" ]; then
    NAMESPACE="pos-system"
else
    NAMESPACE="pos-system-dev"
fi

kubectl wait --for=condition=ready pod -l app=mongodb -n $NAMESPACE --timeout=300s
kubectl wait --for=condition=ready pod -l app=pos-app -n $NAMESPACE --timeout=300s

# Apply cost optimization for production
if [ "$ENVIRONMENT" = "production" ]; then
    echo "💰 Applying cost optimization..."
    kubectl apply -f deploy/cost-optimization.yaml
    kubectl apply -f deploy/monitoring.yaml
fi

# Restore original kustomization file
mv k8s/environments/$ENVIRONMENT/kustomization.yaml.bak k8s/environments/$ENVIRONMENT/kustomization.yaml

echo "✅ Deployment complete!"
echo ""
echo "📋 Environment: $ENVIRONMENT"
echo "📋 Namespace: $NAMESPACE"
echo ""
echo "🔍 Useful commands:"
echo "  Check status: kubectl get all -n $NAMESPACE"
echo "  View logs: kubectl logs -f deployment/pos-app -n $NAMESPACE"
echo "  Port forward: kubectl port-forward service/pos-app-service 8080:80 -n $NAMESPACE"

if [ "$ENVIRONMENT" = "production" ]; then
    echo "  Check ingress: kubectl get ingress -n $NAMESPACE"
fi

echo ""
echo "🌐 Access the application:"
if [ "$ENVIRONMENT" = "production" ]; then
    echo "  External: Check ingress external IP"
    echo "  kubectl get ingress pos-app-ingress -n $NAMESPACE"
else
    echo "  Local: kubectl port-forward service/dev-pos-app-service 8080:80 -n $NAMESPACE"
    echo "  Then visit: http://localhost:8080"
fi