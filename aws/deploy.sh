#!/bin/bash

# Deployment script for POS System on EKS

set -e

echo "🚀 Deploying POS System to EKS..."

# Check if kubectl is configured
kubectl cluster-info > /dev/null 2>&1 || {
    echo "❌ kubectl is not configured. Please run setup-eks.sh first."
    exit 1
}

# Apply shared Kubernetes manifests
echo "📦 Creating namespace..."
kubectl apply -f k8s/namespace.yaml

echo "🔐 Creating secrets and config..."
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml

echo "🗄️  Deploying MongoDB..."
kubectl apply -f aws/k8s/mongodb-deployment.yaml

# Wait for MongoDB to be ready
echo "⏳ Waiting for MongoDB to be ready..."
kubectl wait --for=condition=ready pod -l app=mongodb -n pos-system --timeout=300s

echo "🖥️  Deploying application..."
kubectl apply -f aws/k8s/app-deployment.yaml

# Wait for app to be ready
echo "⏳ Waiting for application to be ready..."
kubectl wait --for=condition=ready pod -l app=pos-app -n pos-system --timeout=300s

echo "📈 Setting up autoscaling..."
kubectl apply -f k8s/hpa.yaml

echo "🌐 Setting up ingress..."
kubectl apply -f aws/k8s/ingress.yaml

echo "💰 Applying cost optimization..."
kubectl apply -f deploy/cost-optimization.yaml

echo "✅ Deployment complete!"
echo ""
echo "📋 Useful commands:"
echo "  Check pods: kubectl get pods -n pos-system"
echo "  Check services: kubectl get svc -n pos-system"
echo "  Check ingress: kubectl get ingress -n pos-system"
echo "  View logs: kubectl logs -f deployment/pos-app -n pos-system"
echo "  Scale manually: kubectl scale deployment pos-app --replicas=3 -n pos-system"
echo ""
echo "🔍 Get ALB DNS name:"
echo "  kubectl get ingress pos-app-ingress -n pos-system -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'"