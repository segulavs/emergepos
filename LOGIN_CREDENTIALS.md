# POS System Login Credentials

## 🔐 User Accounts Created

### 1. Super Admin (SaaS Admin)
- **Email**: `superadmin@posystem.com`
- **Password**: `SuperAdmin123!`
- **Role**: Super Admin
- **Permissions**: Full system access, manage all organizations
- **Login URL**: http://localhost:3000

### 2. Organization Admin
- **Email**: `orgadmin@posystem.com`
- **Password**: `OrgAdmin123!`
- **Role**: Organization Admin
- **Organization**: Organization's Organization (auto-created)
- **Permissions**: Manage organization settings, stores, users, products
- **Login URL**: http://localhost:3000

### 3. Store Admin
- **Email**: `storeadmin@posystem.com`
- **Password**: `StoreAdmin123!`
- **Role**: Store Admin
- **Store**: Main Store (MAIN001)
- **Permissions**: Manage store operations, inventory, staff, transactions
- **Login URL**: http://localhost:3000

### 4. Cashier (Store Keeper)
- **Email**: `cashier@posystem.com`
- **Password**: `Cashier123!`
- **Role**: Cashier
- **Store**: Main Store (MAIN001)
- **PIN**: `1234` (for quick login)
- **Permissions**: Process transactions, view inventory, basic operations
- **Login URL**: http://localhost:3000

## 🏪 Store Information

### Main Store
- **Name**: Main Store
- **Code**: MAIN001
- **Address**: 123 Main Street, Lusaka, Lusaka Province, 10101, Zambia
- **Phone**: +260-97-123-4567
- **Email**: mainstore@posystem.com

## 🔗 System URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/health

## 📋 Role Hierarchy & Permissions

### Super Admin
- Manage all organizations
- Create/delete organizations
- View system-wide analytics
- Manage platform settings

### Organization Admin
- Manage organization settings
- Create/manage stores
- Create/manage users (except Super Admin)
- View organization analytics
- Manage products and inventory

### Store Admin
- Manage store operations
- Create cashier accounts
- Manage store inventory
- Process transactions
- View store analytics
- Manage store-specific pricing

### Cashier
- Process sales transactions
- View product inventory
- Handle returns/refunds
- Generate receipts
- Basic customer management

## 🧪 Testing the System

### 1. Test Login for Each Role
```bash
# Test Super Admin Login
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "superadmin@posystem.com", "password": "SuperAdmin123!"}'

# Test Org Admin Login
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "orgadmin@posystem.com", "password": "OrgAdmin123!"}'

# Test Store Admin Login
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "storeadmin@posystem.com", "password": "StoreAdmin123!"}'

# Test Cashier Login
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "cashier@posystem.com", "password": "Cashier123!"}'
```

### 2. Access Frontend
1. Open http://localhost:3000 in your browser
2. Use any of the credentials above to login
3. Each role will see different interfaces and permissions

### 3. Sample Data Created
- **Product**: Coca Cola 500ml (SKU: COKE-500ML, Barcode: 1234567890123)
- **Stock**: 100 units in Main Store
- **Category**: Beverages
- **Brand**: Coca Cola
- **Cost Price**: K2.50, **Selling Price**: K5.00

## 🔧 Next Steps

1. **Login to Frontend**: Use http://localhost:3000 with any of the credentials above
2. **Test POS**: Login as Cashier to process a test transaction with the Coca Cola product
3. **Add More Products**: Login as Org Admin or Store Admin to add more products
4. **Set Up More Inventory**: Add stock levels for additional products
5. **Configure Settings**: Adjust organization and store settings
6. **View Analytics**: Check sales reports and analytics after making some transactions

## 📝 Notes

- All passwords follow strong password requirements
- The system uses JWT tokens for authentication
- Cashier has a PIN (1234) for quick access in POS mode
- The organization was automatically created when the Org Admin registered
- Store assignments determine which stores users can access