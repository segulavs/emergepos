# POS & Inventory Management System

A comprehensive, multi-tenant Point of Sale (POS) and Inventory Management System built with FastAPI, React, and MongoDB. Designed for businesses in Zambia and Africa with support for local taxation, fiscal compliance, and offline-first operations.

## 🚀 Quick Start

### Option 1: Local Development (Recommended for testing)
```bash
# 1. Setup MongoDB (choose one method)
./setup-mongodb.sh

# 2. Start the application
./start-dev.sh
```

### Option 2: Docker Compose (Full local environment)
```bash
# Fix frontend dependencies (one-time setup)
./fix-dependencies.sh

# Start with Docker (requires Docker Desktop)
./local-start.sh
```

### Option 3: Backend-only Docker (Faster development)
```bash
# Start backend only (frontend runs separately)
./local-start-backend.sh

# In another terminal, start frontend
cd frontend && npm install --legacy-peer-deps && npm start
```

### Option 4: Cloud Deployment
See [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) for Azure, GCP, and AWS deployments.

## 📋 Features

### Core POS Features
- **Multi-tenant SaaS architecture** with organization isolation
- **Offline-first design** with sync capabilities
- **Role-based access control** (Super Admin, Org Admin, Store Admin, Cashier)
- **Real-time inventory tracking** with stock validation
- **Multiple payment methods** (Cash, Mobile Money, Card)
- **Receipt printing** with ESC/POS format support
- **Cashier session management** with shift tracking

### Inventory Management
- **Multi-store inventory** with centralized control
- **Warehouse management** with transfer workflows
- **Stock movements** tracking (in/out/adjustments)
- **Stock auditing** with approval workflows
- **Low stock alerts** and reorder management
- **Product variants** and category management

### Analytics & Reporting
- **Sales analytics** (daily/weekly/monthly/yearly)
- **Store performance** visualization
- **Interactive maps** with store locations
- **Top selling products** analysis
- **Financial reporting** with tax calculations
- **Export capabilities** for external analysis

### Zambia-Specific Features
- **VAT support** (16% standard rate)
- **TPIN integration** for tax compliance
- **ZMW currency** (Zambian Kwacha)
- **Fiscal receipt** requirements
- **Zero-rated and exempt** item support

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Frontend │    │   FastAPI Backend │    │   MongoDB       │
│   (Offline-first)│───▶│   (Multi-tenant)  │───▶│   (Document DB) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   IndexedDB     │    │   JWT Auth       │    │   Indexes       │
│   (Local Cache) │    │   (RBAC)         │    │   (Performance) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🛠️ Technology Stack

- **Frontend**: React 19, Tailwind CSS, Shadcn/ui, React Query
- **Backend**: FastAPI (Python), Motor (async MongoDB driver)
- **Database**: MongoDB with comprehensive indexing
- **Authentication**: JWT with role-based access control
- **Offline Storage**: IndexedDB with LocalForage
- **Deployment**: Kubernetes (AKS, GKE, EKS) with auto-scaling

## 📱 User Interfaces

### Cashier Interface (POS)
- Product search and barcode scanning
- Shopping cart with real-time calculations
- Multiple payment method support
- Receipt generation and printing
- Offline transaction queuing

### Store Manager Interface
- Inventory management and stock adjustments
- Product catalog management
- Sales reporting and analytics
- Staff management and permissions
- Store-specific pricing controls

### Organization Admin Interface
- Multi-store dashboard and analytics
- User and role management
- Organization settings and configuration
- Financial reporting and tax management
- Store performance monitoring

### Super Admin Interface
- Platform-wide organization management
- System monitoring and health checks
- User management across organizations
- Platform analytics and reporting

## 🔧 Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB (local or cloud)
- Docker (optional, for containerized development)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend Setup
```bash
cd frontend
npm install
npm start  # Development server on port 3000
```

### Environment Variables
Create `.env` files in both `backend/` and `frontend/` directories:

**Backend (.env)**:
```env
MONGO_URL=mongodb://localhost:27017/pos_system
JWT_SECRET=your-jwt-secret-here
SUPER_ADMIN_KEY=your-super-admin-key
CORS_ORIGINS=http://localhost:3000
```

**Frontend (.env)**:
```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

## 🚀 Deployment Options

### 1. Local Development
- **Setup**: `./setup-mongodb.sh && ./start-dev.sh`
- **Use Case**: Development and testing
- **Cost**: Free

### 2. Docker Compose
- **Setup**: `./local-start.sh`
- **Use Case**: Local production-like environment
- **Cost**: Free

### 3. Azure Kubernetes Service (AKS)
- **Setup**: See [deploy/README.md](deploy/README.md)
- **Use Case**: Production deployment with Azure
- **Cost**: ~$179/month

### 4. Google Kubernetes Engine (GKE)
- **Setup**: See [gcp/](gcp/) directory
- **Use Case**: Production deployment with Google Cloud
- **Cost**: ~$150/month (with preemptible instances)

### 5. Amazon Elastic Kubernetes Service (EKS)
- **Setup**: See [aws/](aws/) directory
- **Use Case**: Production deployment with AWS
- **Cost**: ~$200/month

## 📊 API Documentation

Once the backend is running, visit:
- **Interactive API Docs**: http://localhost:8000/docs
- **ReDoc Documentation**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/api/health

### Key API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

#### Products & Inventory
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `GET /api/stock/{store_id}` - Get store inventory
- `POST /api/stock/{store_id}/movement` - Record stock movement

#### Transactions (POS)
- `POST /api/transactions` - Create sale transaction
- `GET /api/transactions` - List transactions
- `POST /api/transactions/{id}/void` - Void transaction

#### Analytics
- `GET /api/analytics/dashboard` - Dashboard data
- `GET /api/analytics/sales-summary` - Sales summary
- `GET /api/analytics/top-products` - Top selling products

## 🔐 Security Features

- **JWT Authentication** with configurable expiration
- **Role-based access control** (RBAC) with granular permissions
- **Password hashing** with bcrypt
- **CORS protection** with configurable origins
- **Input validation** with Pydantic models
- **SQL injection protection** (NoSQL with MongoDB)
- **Rate limiting** (configurable)
- **HTTPS enforcement** in production deployments

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Integration Tests
```bash
# Start the full stack locally
./local-start.sh

# Run integration tests
npm run test:integration
```

## 📈 Performance Optimization

### Database Optimization
- Comprehensive indexing strategy
- Connection pooling with Motor
- Query optimization for multi-tenant data
- Aggregation pipelines for analytics

### Frontend Optimization
- Code splitting with React.lazy
- Image optimization and lazy loading
- Service worker for offline functionality
- React Query for efficient data fetching

### Deployment Optimization
- Multi-stage Docker builds
- Kubernetes horizontal pod autoscaling
- CDN integration for static assets
- Database connection pooling

## 🔄 Offline Functionality

The system is designed to work offline with automatic synchronization:

### Offline Capabilities
- **Transaction processing** with local storage
- **Product catalog** caching
- **Inventory lookups** from local cache
- **Receipt generation** without internet
- **Automatic sync** when connection restored

### Sync Strategy
- **Pull sync**: Download latest data on connection
- **Push sync**: Upload offline transactions
- **Conflict resolution**: Last-write-wins with timestamps
- **Incremental sync**: Only sync changed data

## 🌍 Internationalization

### Supported Regions
- **Zambia** (primary) - ZMW currency, 16% VAT
- **Kenya** - KES currency, 16% VAT
- **Uganda** - UGX currency, 18% VAT
- **Tanzania** - TZS currency, 18% VAT

### Localization Features
- Multi-currency support
- Configurable tax rates
- Date/time formatting
- Number formatting
- Receipt templates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow PEP 8 for Python code
- Use ESLint/Prettier for JavaScript/React code
- Write tests for new features
- Update documentation for API changes
- Use conventional commits for commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [Deployment Guide](DEPLOYMENT-GUIDE.md) - Multi-cloud deployment instructions
- [API Documentation](http://localhost:8000/docs) - Interactive API docs
- [Architecture Guide](docs/ARCHITECTURE.md) - System architecture details

## 🆘 Troubleshooting

### Common Issues

#### 1. Frontend Dependency Conflicts
If you encounter npm dependency resolution errors:
```bash
# Fix frontend dependencies
./fix-dependencies.sh

# Or manually
cd frontend
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

#### 2. Docker Build Failures
If Docker builds fail due to dependency issues:
```bash
# Use backend-only mode for faster development
./local-start-backend.sh

# Start frontend separately
cd frontend && npm install --legacy-peer-deps && npm start
```

#### 3. MongoDB Connection Issues
```bash
# Setup MongoDB
./setup-mongodb.sh

# Or use MongoDB Atlas (cloud)
# Update MONGO_URL in start-dev.sh with your Atlas connection string
```

#### 4. Port Already in Use
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Kill process on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9
```

#### 5. Docker Issues
```bash
# Reset Docker environment
docker-compose down -v
docker system prune -f

# Or use backend-only mode
./local-start-backend.sh
```

### Getting Help
- **Issues**: Create a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Email**: support@pos-system.com (for enterprise support)

### Troubleshooting
Common issues and solutions:

1. **MongoDB Connection Issues**
   ```bash
   # Check MongoDB status
   ./setup-mongodb.sh
   ```

2. **Port Already in Use**
   ```bash
   # Kill process on port 8000
   lsof -ti:8000 | xargs kill -9
   ```

3. **Docker Issues**
   ```bash
   # Reset Docker environment
   docker-compose down -v
   docker system prune -f
   ```

## 🎯 Roadmap

### Version 2.0 (Q2 2024)
- [ ] Mobile app (React Native)
- [ ] Advanced analytics with ML
- [ ] Multi-language support
- [ ] Advanced reporting engine
- [ ] Integration with accounting systems

### Version 2.1 (Q3 2024)
- [ ] Loyalty program management
- [ ] Advanced inventory forecasting
- [ ] Supplier management
- [ ] Purchase order management
- [ ] Barcode generation

### Version 3.0 (Q4 2024)
- [ ] E-commerce integration
- [ ] Customer relationship management (CRM)
- [ ] Advanced security features
- [ ] Audit trail and compliance
- [ ] Multi-warehouse optimization

---

**Built with ❤️ for African businesses**
