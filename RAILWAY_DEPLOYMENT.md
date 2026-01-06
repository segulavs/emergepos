# EmergePOS - Railway Deployment Guide

This guide will help you deploy EmergePOS to [Railway.com](https://railway.com).

## Prerequisites

- A Railway.com account
- Git repository with this codebase pushed
- MongoDB Atlas account (recommended) or Railway MongoDB plugin

## Quick Deploy

### Option 1: Deploy with Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize new project
railway init

# Add MongoDB plugin (optional - can use MongoDB Atlas instead)
railway add --plugin mongodb

# Deploy
railway up
```

### Option 2: Deploy via Railway Dashboard

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose this repository
5. Railway will automatically detect the `railway.toml` and `Dockerfile.railway`

## Environment Variables

Configure these environment variables in Railway:

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URL` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/pos_system?retryWrites=true&w=majority` |
| `JWT_SECRET` | Secret key for JWT tokens | Generate with: `openssl rand -hex 64` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_NAME` | Database name | `pos_system` |
| `CORS_ORIGINS` | Allowed CORS origins | `*` |
| `SUPER_ADMIN_KEY` | Key for super admin registration | `stockmaster-admin-2024` |

## Setting Up MongoDB

### Option A: MongoDB Atlas (Recommended for Production)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster (free tier available)
3. Click **"Connect"** → **"Connect your application"**
4. Copy the connection string
5. Replace `<password>` with your database user password
6. Add this as `MONGO_URL` in Railway environment variables

**Example connection string:**
```
mongodb+srv://posuser:yourpassword@cluster0.xxxxx.mongodb.net/pos_system?retryWrites=true&w=majority
```

### Option B: Railway MongoDB Plugin

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"MongoDB"**
3. Railway will automatically create a `MONGO_URL` variable
4. Update the variable name or reference it correctly in your app

## Project Structure for Railway

```
emergepos/
├── railway.toml          # Railway configuration
├── Dockerfile.railway    # Railway-optimized Dockerfile
├── backend/
│   ├── server.py        # FastAPI backend (serves API + static files)
│   └── requirements.txt
└── frontend/
    ├── package.json
    └── src/
```

## Configuration Files

### railway.toml
```toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile.railway"

[deploy]
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10
```

## Post-Deployment

### 1. Access Your Application

After deployment, Railway will provide a URL like:
```
https://your-app-name.railway.app
```

### 2. Default Login Credentials

The system automatically seeds default users on first run:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@posystem.com | SuperAdmin123! |
| Org Admin | orgadmin@posystem.com | OrgAdmin123! |
| Store Admin | storeadmin@posystem.com | StoreAdmin123! |
| Cashier | cashier@posystem.com | Cashier123! |

⚠️ **Important:** Change these passwords immediately after first login!

### 3. Verify Health Check

Visit `/api/health` to verify the API is running:
```
https://your-app-name.railway.app/api/health
```

## Custom Domain

1. In Railway project settings, go to **"Domains"**
2. Click **"Add Custom Domain"**
3. Add your domain (e.g., `pos.yourcompany.com`)
4. Configure DNS:
   - Add a CNAME record pointing to Railway's domain
   - Or add an A record with Railway's IP

## Scaling

Railway automatically scales based on usage. For more control:

1. Go to project **Settings** → **Deploy**
2. Adjust resources:
   - Memory limit
   - CPU allocation
   - Instance count

## Monitoring

Railway provides built-in monitoring:

1. **Logs:** View real-time logs in the Railway dashboard
2. **Metrics:** Monitor CPU, memory, and network usage
3. **Alerts:** Set up Discord/Slack notifications for downtime

## Troubleshooting

### Application won't start

1. Check logs in Railway dashboard
2. Verify `MONGO_URL` is correctly set
3. Ensure MongoDB is accessible from Railway

### Health check failing

```bash
# Test health endpoint
curl https://your-app.railway.app/api/health
```

### Database connection issues

1. Verify MongoDB connection string format
2. For Atlas: Ensure Railway's IP is whitelisted (or use 0.0.0.0/0 for all IPs)
3. Check database user credentials

### Build failures

1. Review build logs in Railway
2. Ensure all dependencies are in `requirements.txt` and `package.json`
3. Check Node.js and Python version compatibility

## Cost Estimation

Railway pricing (as of 2024):
- **Hobby Plan:** $5/month with $5 of usage included
- **Pro Plan:** $20/month + usage-based billing
- **Team Plan:** Custom pricing

Estimated monthly cost for EmergePOS:
- Small deployment: ~$10-20/month
- Medium (with MongoDB Atlas M0): ~$15-25/month
- Large scale: Contact Railway for enterprise pricing

## Environment-Specific Configurations

### Development
```env
MONGO_URL=mongodb://localhost:27017/pos_system
JWT_SECRET=dev-secret-key
CORS_ORIGINS=http://localhost:3000,http://localhost:8000
```

### Production (Railway)
```env
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/pos_system
JWT_SECRET=<generated-secure-key>
CORS_ORIGINS=https://your-app.railway.app,https://your-custom-domain.com
```

## Security Recommendations

1. **Change default passwords** immediately after deployment
2. **Use strong JWT_SECRET** - generate with `openssl rand -hex 64`
3. **Restrict CORS_ORIGINS** to your actual domains
4. **Enable MongoDB authentication** and use strong passwords
5. **Whitelist IPs** in MongoDB Atlas for production
6. **Enable HTTPS** (Railway provides this by default)

## Support

- Railway Documentation: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- MongoDB Atlas Docs: https://www.mongodb.com/docs/atlas/

---

## Quick Reference Commands

```bash
# Deploy to Railway
railway up

# View logs
railway logs

# Open project in browser
railway open

# View environment variables
railway variables

# Add environment variable
railway variables set JWT_SECRET=your-secret-key

# Connect to MongoDB shell (if using Railway MongoDB)
railway connect mongodb
```

