# POS System - Azure Kubernetes Service (AKS) Deployment

This guide helps you deploy the POS & Inventory Management System to Azure Kubernetes Service with cost optimization.

## 🏗️ Architecture Overview

```
Internet → Azure Load Balancer → NGINX Ingress → POS App Pods → MongoDB Pod
                                                      ↓
                                              Azure Managed Disk (PVC)
```

## 💰 Cost Optimization Features

- **Cluster Autoscaler**: Scales nodes from 1-3 based on demand
- **Horizontal Pod Autoscaler**: Scales pods from 1-5 based on CPU/memory
- **Resource Quotas**: Prevents cost overruns
- **Right-sized VMs**: Uses Standard_B2s (cost-effective)
- **Basic ACR**: Uses Basic tier for container registry
- **Spot Instances**: Optional for non-production workloads

## 📋 Prerequisites

1. **Azure CLI** installed and configured
2. **Docker** installed
3. **kubectl** installed
4. **Azure subscription** with appropriate permissions
5. **Domain name** (optional, for custom domain)

## 🚀 Quick Start

### Step 1: Setup Azure Infrastructure

```bash
# Make scripts executable
chmod +x deploy/*.sh

# Run Azure setup (creates AKS cluster, ACR, etc.)
./deploy/azure-setup.sh
```

This script will:
- Create resource group
- Create Azure Container Registry (ACR)
- Create AKS cluster with autoscaling
- Install NGINX Ingress Controller
- Install cert-manager for SSL certificates

### Step 2: Build and Push Docker Image

```bash
# Update ACR name in the script (from azure-setup.sh output)
nano deploy/build-and-push.sh

# Build and push image
./deploy/build-and-push.sh
```

### Step 3: Update Configuration

1. **Update ACR image name** in `k8s/app-deployment.yaml`:
   ```yaml
   image: your-acr-name.azurecr.io/pos-system:latest
   ```

2. **Update domain** in `k8s/ingress.yaml` (optional):
   ```yaml
   - host: your-domain.com
   ```

3. **Update secrets** in `k8s/secrets.yaml` for production:
   ```bash
   # Generate new base64 encoded secrets
   echo -n "your-new-password" | base64
   ```

### Step 4: Deploy Application

```bash
# Deploy to AKS
./deploy/deploy.sh
```

### Step 5: Apply Cost Optimization

```bash
# Apply resource quotas and limits
kubectl apply -f deploy/cost-optimization.yaml

# Apply monitoring (optional)
kubectl apply -f deploy/monitoring.yaml
```

## 🔍 Verification

### Check Deployment Status

```bash
# Check all resources
kubectl get all -n pos-system

# Check pods
kubectl get pods -n pos-system

# Check services
kubectl get svc -n pos-system

# Check ingress
kubectl get ingress -n pos-system
```

### Get External IP

```bash
# Get NGINX Ingress external IP
kubectl get svc -n ingress-nginx

# Or check ingress directly
kubectl get ingress pos-app-ingress -n pos-system
```

### View Logs

```bash
# Application logs
kubectl logs -f deployment/pos-app -n pos-system

# MongoDB logs
kubectl logs -f deployment/mongodb -n pos-system
```

## 🔧 Configuration

### Environment Variables

The application uses these environment variables (configured via ConfigMap and Secrets):

- `MONGO_URL`: MongoDB connection string
- `JWT_SECRET`: JWT signing secret
- `SUPER_ADMIN_KEY`: Super admin creation key
- `CORS_ORIGINS`: Allowed CORS origins

### Scaling

```bash
# Manual scaling
kubectl scale deployment pos-app --replicas=3 -n pos-system

# Check HPA status
kubectl get hpa -n pos-system

# Check cluster autoscaler
kubectl get nodes
```

## 💾 Database Management

### Backup MongoDB

```bash
# Create backup job
kubectl create job --from=cronjob/mongodb-backup mongodb-backup-manual -n pos-system

# Or manual backup
kubectl exec -it deployment/mongodb -n pos-system -- mongodump --out /tmp/backup
```

### Restore MongoDB

```bash
# Copy backup to pod
kubectl cp backup.tar.gz pos-system/mongodb-pod:/tmp/

# Restore
kubectl exec -it deployment/mongodb -n pos-system -- mongorestore /tmp/backup
```

## 🔒 Security

### Update Secrets

```bash
# Update MongoDB password
kubectl patch secret mongodb-secret -n pos-system -p='{"data":{"password":"bmV3LXBhc3N3b3Jk"}}'

# Update JWT secret
kubectl patch secret app-secret -n pos-system -p='{"data":{"jwt-secret":"bmV3LWp3dC1zZWNyZXQ="}}'

# Restart deployments to pick up new secrets
kubectl rollout restart deployment/pos-app -n pos-system
kubectl rollout restart deployment/mongodb -n pos-system
```

### Network Security

The deployment includes:
- Network policies for pod-to-pod communication
- RBAC for service accounts
- Resource quotas and limits
- Pod security standards

## 📊 Monitoring & Cost Tracking

### Resource Usage

```bash
# Check resource usage
kubectl top nodes
kubectl top pods -n pos-system

# Check resource quotas
kubectl describe quota pos-system-quota -n pos-system
```

### Cost Monitoring

1. **Azure Cost Management**: Monitor costs in Azure portal
2. **Resource tagging**: All resources are tagged for cost tracking
3. **Alerts**: Set up budget alerts in Azure

### Performance Monitoring

```bash
# Check HPA metrics
kubectl describe hpa pos-app-hpa -n pos-system

# Check VPA recommendations (if enabled)
kubectl describe vpa pos-app-vpa -n pos-system
```

## 🛠️ Troubleshooting

### Common Issues

1. **Pods not starting**:
   ```bash
   kubectl describe pod <pod-name> -n pos-system
   kubectl logs <pod-name> -n pos-system
   ```

2. **Image pull errors**:
   ```bash
   # Check ACR integration
   az aks check-acr --name pos-aks-cluster --resource-group pos-system-rg --acr your-acr-name
   ```

3. **MongoDB connection issues**:
   ```bash
   # Test MongoDB connectivity
   kubectl exec -it deployment/pos-app -n pos-system -- curl mongodb-service:27017
   ```

4. **Ingress not working**:
   ```bash
   # Check NGINX Ingress Controller
   kubectl get pods -n ingress-nginx
   kubectl logs -f deployment/ingress-nginx-controller -n ingress-nginx
   ```

### Debugging Commands

```bash
# Get events
kubectl get events -n pos-system --sort-by='.lastTimestamp'

# Describe resources
kubectl describe deployment pos-app -n pos-system
kubectl describe service pos-app-service -n pos-system

# Port forward for local testing
kubectl port-forward service/pos-app-service 8080:80 -n pos-system
```

## 🔄 Updates and Maintenance

### Update Application

```bash
# Build new image
./deploy/build-and-push.sh

# Update deployment
kubectl set image deployment/pos-app pos-app=your-acr-name.azurecr.io/pos-system:new-tag -n pos-system

# Check rollout status
kubectl rollout status deployment/pos-app -n pos-system
```

### Update Kubernetes Manifests

```bash
# Apply updated manifests
kubectl apply -f k8s/

# Restart deployments if needed
kubectl rollout restart deployment/pos-app -n pos-system
```

## 💡 Cost Optimization Tips

1. **Use Spot Instances** for development environments
2. **Schedule downtime** for non-production environments
3. **Monitor resource usage** and adjust requests/limits
4. **Use Azure Reserved Instances** for production
5. **Enable cluster autoscaler** to scale down during low usage
6. **Use Azure Dev/Test pricing** for development subscriptions

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review Kubernetes and Azure documentation
3. Check application logs for specific errors
4. Monitor Azure Cost Management for unexpected costs

## 📚 Additional Resources

- [Azure Kubernetes Service Documentation](https://docs.microsoft.com/en-us/azure/aks/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Azure Cost Management](https://docs.microsoft.com/en-us/azure/cost-management-billing/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)