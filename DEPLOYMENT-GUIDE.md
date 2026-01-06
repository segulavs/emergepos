# POS System - Multi-Cloud Deployment Guide

## 🎯 Overview

This POS & Inventory Management System can be deployed on multiple platforms:

- **Local Development**: Docker Compose
- **Azure**: Azure Kubernetes Service (AKS)
- **Google Cloud**: Google Kubernetes Engine (GKE)
- **AWS**: Amazon Elastic Kubernetes Service (EKS)

## 🏠 Local Development Setup

### Prerequisites
- Docker and Docker Compose
- 8GB+ RAM recommended

### Quick Start
```bash
# Start the application locally
./local-start.sh
```

### Access Points
- **Application**: http://localhost:8000
- **API Health**: http://localhost:8000/api/health
- **MongoDB**: mongodb://admin:pos-admin-2024@localhost:27017/pos_system

### Management Commands
```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Access app container
docker-compose exec pos-app bash

# Access MongoDB
docker-compose exec mongodb mongosh -u admin -p pos-admin-2024
```

## ☁️ Cloud Deployments

### Azure Kubernetes Service (AKS)

#### Prerequisites
- Azure CLI installed and configured
- kubectl installed
- Docker installed

#### Setup
```bash
# 1. Create AKS infrastructure
./deploy/azure-setup.sh

# 2. Build and push image (update ACR name from step 1)
./deploy/build-and-push.sh

# 3. Deploy application
./deploy/deploy-with-kustomize.sh production your-acr-name
```

#### Estimated Monthly Cost: ~$179

### Google Kubernetes Engine (GKE)

#### Prerequisites
- Google Cloud SDK (gcloud) installed and configured
- kubectl installed
- Docker installed

#### Setup
```bash
# 1. Create GKE infrastructure
./gcp/setup-gke.sh your-project-id

# 2. Build and push image
./gcp/build-and-push.sh your-project-id us-central1

# 3. Update image URI in gcp/k8s/app-deployment.yaml

# 4. Deploy application
./gcp/deploy.sh
```

#### Estimated Monthly Cost: ~$150 (with preemptible instances)

### Amazon Elastic Kubernetes Service (EKS)

#### Prerequisites
- AWS CLI installed and configured
- eksctl installed
- kubectl installed
- Helm installed
- Docker installed

#### Setup
```bash
# 1. Create EKS infrastructure (takes 15-20 minutes)
./aws/setup-eks.sh

# 2. Build and push image
./aws/build-and-push.sh us-east-1

# 3. Update image URI in aws/k8s/app-deployment.yaml

# 4. Deploy application
./aws/deploy.sh
```

#### Estimated Monthly Cost: ~$200

## 🔧 Configuration

### Environment Variables

All deployments use these core environment variables:

- `MONGO_URL`: MongoDB connection string
- `JWT_SECRET`: JWT signing secret
- `SUPER_ADMIN_KEY`: Super admin creation key
- `CORS_ORIGINS`: Allowed CORS origins

### Default Credentials

- **MongoDB**: admin / pos-admin-2024
- **Super Admin Key**: stockmaster-admin-2024

**⚠️ Change these in production!**

## 📊 Feature Comparison

| Feature | Local | AKS | GKE | EKS |
|---------|-------|-----|-----|-----|
| **Setup Time** | 2 min | 10 min | 15 min | 20 min |
| **Auto-scaling** | ❌ | ✅ | ✅ | ✅ |
| **Load Balancer** | ❌ | ✅ | ✅ | ✅ |
| **SSL/TLS** | ❌ | ✅ | ✅ | ✅ |
| **Monitoring** | Basic | Advanced | Advanced | Advanced |
| **Cost (Monthly)** | $0 | ~$179 | ~$150 | ~$200 |

## 🛠️ Management Commands

### Scaling
```bash
# Manual scaling
kubectl scale deployment pos-app --replicas=3 -n pos-system

# Check autoscaler
kubectl get hpa -n pos-system
```

### Monitoring
```bash
# Check pods
kubectl get pods -n pos-system

# View logs
kubectl logs -f deployment/pos-app -n pos-system

# Resource usage
kubectl top pods -n pos-system
```

### Updates
```bash
# Update application image
kubectl set image deployment/pos-app pos-app=new-image:tag -n pos-system

# Check rollout status
kubectl rollout status deployment/pos-app -n pos-system
```

## 🧹 Cleanup

### Local
```bash
docker-compose down -v  # Removes volumes too
```

### Cloud Platforms
```bash
# Azure
./deploy/cleanup.sh all

# GCP
gcloud container clusters delete pos-gke-cluster --region=us-central1

# AWS
eksctl delete cluster --name pos-eks-cluster --region us-east-1
```

## 🔒 Security Considerations

### Production Checklist
- [ ] Change default passwords in `k8s/secrets.yaml`
- [ ] Update JWT secret
- [ ] Configure proper CORS origins
- [ ] Set up SSL certificates
- [ ] Enable network policies
- [ ] Configure backup strategy
- [ ] Set up monitoring and alerting

### Secret Management
```bash
# Update MongoDB password
kubectl patch secret mongodb-secret -n pos-system -p='{"data":{"password":"bmV3LXBhc3N3b3Jk"}}'

# Update JWT secret
kubectl patch secret app-secret -n pos-system -p='{"data":{"jwt-secret":"bmV3LWp3dC1zZWNyZXQ="}}'

# Restart deployments
kubectl rollout restart deployment/pos-app -n pos-system
kubectl rollout restart deployment/mongodb -n pos-system
```

## 📈 Performance Tuning

### Resource Optimization
```bash
# Check resource usage
kubectl top nodes
kubectl top pods -n pos-system

# Adjust resource limits
kubectl patch deployment pos-app -n pos-system -p='{"spec":{"template":{"spec":{"containers":[{"name":"pos-app","resources":{"limits":{"memory":"1Gi","cpu":"1000m"}}}]}}}}'
```

### Database Optimization
```bash
# Access MongoDB shell
kubectl exec -it deployment/mongodb -n pos-system -- mongosh -u admin -p pos-admin-2024

# Create additional indexes for performance
db.transactions.createIndex({"store_id": 1, "created_at": -1})
db.products.createIndex({"organization_id": 1, "category": 1})
```

## 🆘 Troubleshooting

### Common Issues

1. **Pods not starting**
   ```bash
   kubectl describe pod <pod-name> -n pos-system
   kubectl logs <pod-name> -n pos-system
   ```

2. **Database connection issues**
   ```bash
   kubectl exec -it deployment/pos-app -n pos-system -- curl mongodb-service:27017
   ```

3. **Image pull errors**
   ```bash
   # Check image URI and registry access
   kubectl describe pod <pod-name> -n pos-system
   ```

4. **Ingress not working**
   ```bash
   kubectl get ingress -n pos-system
   kubectl describe ingress pos-app-ingress -n pos-system
   ```

### Debug Commands
```bash
# Get all resources
kubectl get all -n pos-system

# Check events
kubectl get events -n pos-system --sort-by='.lastTimestamp'

# Port forward for local testing
kubectl port-forward service/pos-app-service 8080:80 -n pos-system
```

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Azure AKS Documentation](https://docs.microsoft.com/en-us/azure/aks/)
- [Google GKE Documentation](https://cloud.google.com/kubernetes-engine/docs)
- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## 🎉 Getting Started

Choose your deployment method:

1. **Quick Local Testing**: Run `./local-start.sh`
2. **Azure Production**: Follow the AKS setup guide
3. **Google Cloud**: Follow the GKE setup guide
4. **AWS Production**: Follow the EKS setup guide

Each deployment includes cost optimization, auto-scaling, and production-ready features!