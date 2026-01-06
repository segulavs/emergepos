// MongoDB initialization script for local development
db = db.getSiblingDB('pos_system');

// Create collections with indexes for better performance
db.createCollection('users');
db.createCollection('organizations');
db.createCollection('stores');
db.createCollection('products');
db.createCollection('stock');
db.createCollection('transactions');
db.createCollection('warehouses');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "organization_id": 1 });

db.organizations.createIndex({ "slug": 1 }, { unique: true });

db.stores.createIndex({ "organization_id": 1, "code": 1 }, { unique: true });

db.products.createIndex({ "organization_id": 1, "sku": 1 }, { unique: true });
db.products.createIndex({ "organization_id": 1, "barcode": 1 });

db.stock.createIndex({ "organization_id": 1, "store_id": 1, "product_id": 1 }, { unique: true });

db.transactions.createIndex({ "organization_id": 1, "store_id": 1, "created_at": -1 });
db.transactions.createIndex({ "local_id": 1 });
db.transactions.createIndex({ "receipt_number": 1 });

db.warehouses.createIndex({ "organization_id": 1, "code": 1 }, { unique: true });

print('Database initialized successfully for POS System');