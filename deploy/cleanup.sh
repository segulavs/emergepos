#!/bin/bash

# Cleanup script for removing AKS resources

set -e

ENVIRONMENT=${1:-"all"}
RESOURCE_GROUP=${2:-"pos-system-rg"}

echo "🧹 Cleaning up POS System resources..."

if [ "$ENVIRONMENT" = "all" ] || [ "$ENVIRONMENT" = "development" ]; then
    echo "🗑️  Removing development environment..."
    kubectl delete namespace pos-system-dev --ignore-not-found=true
fi

if [ "$ENVIRONMENT" = "all" ] || [ "$ENVIRONMENT" = "production" ]; then
    echo "🗑️  Removing production environment..."
    kubectl delete namespace pos-system --ignore-not-found=true
fi

if [ "$ENVIRONMENT" = "all" ]; then
    echo "⚠️  Do you want to delete the entire Azure resource group? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo "🔥 Deleting Azure resource group..."
        az group delete --name $RESOURCE_GROUP --yes --no-wait
        echo "✅ Resource group deletion initiated (running in background)"
    else
        echo "ℹ️  Keeping Azure resource group. You can delete it manually:"
        echo "   az group delete --name $RESOURCE_GROUP --yes"
    fi
fi

echo "✅ Cleanup complete!"
echo ""
echo "💰 Cost savings:"
echo "  - Kubernetes resources deleted"
echo "  - Pods and services stopped"
if [ "$ENVIRONMENT" = "all" ]; then
    echo "  - AKS cluster will be deleted (if resource group was deleted)"
    echo "  - Storage and networking resources will be deleted"
fi