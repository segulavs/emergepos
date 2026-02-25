import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/product.dart';
import '../models/transaction.dart' as app_models;

class DatabaseService {
  static final DatabaseService instance = DatabaseService._init();
  static Database? _database;

  DatabaseService._init();

  Future<Database> get database async {
    if (kIsWeb) {
      throw UnsupportedError('Database not supported on web');
    }
    if (_database != null) return _database!;
    _database = await _initDB('pos_offline.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
    );
  }

  Future _createDB(Database db, int version) async {
    // Users table
    await db.execute('''
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        organization_id TEXT,
        store_ids TEXT,
        email TEXT UNIQUE,
        first_name TEXT,
        last_name TEXT,
        role TEXT,
        is_active INTEGER,
        created_at TEXT,
        updated_at TEXT
      )
    ''');

    // Products table
    await db.execute('''
      CREATE TABLE products (
        id TEXT PRIMARY KEY,
        organization_id TEXT,
        name TEXT,
        description TEXT,
        sku TEXT,
        barcode TEXT,
        brand TEXT,
        category TEXT,
        cost_price REAL,
        selling_price REAL,
        tax_type TEXT,
        unit TEXT,
        is_active INTEGER,
        image_base64 TEXT,
        stock_quantity REAL DEFAULT 0,
        reorder_level REAL DEFAULT 10,
        created_at TEXT,
        updated_at TEXT,
        last_synced TEXT
      )
    ''');

    // Transactions table
    await db.execute('''
      CREATE TABLE transactions (
        id TEXT PRIMARY KEY,
        organization_id TEXT,
        store_id TEXT,
        receipt_number TEXT,
        transaction_type TEXT,
        status TEXT,
        subtotal REAL,
        discount_amount REAL,
        tax_amount REAL,
        total REAL,
        cashier_id TEXT,
        cashier_name TEXT,
        customer_name TEXT,
        customer_phone TEXT,
        notes TEXT,
        created_at TEXT,
        updated_at TEXT,
        local_id TEXT,
        synced INTEGER DEFAULT 0
      )
    ''');

    // Transaction items table
    await db.execute('''
      CREATE TABLE transaction_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id TEXT,
        product_id TEXT,
        product_name TEXT,
        sku TEXT,
        quantity REAL,
        unit_price REAL,
        discount_amount REAL,
        tax_type TEXT,
        tax_amount REAL,
        line_total REAL,
        FOREIGN KEY (transaction_id) REFERENCES transactions (id)
      )
    ''');

    // Payments table
    await db.execute('''
      CREATE TABLE payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id TEXT,
        method TEXT,
        amount REAL,
        reference TEXT,
        FOREIGN KEY (transaction_id) REFERENCES transactions (id)
      )
    ''');

    // Sync queue table for offline operations
    await db.execute('''
      CREATE TABLE sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT,
        entity_id TEXT,
        operation TEXT,
        data TEXT,
        created_at TEXT,
        retry_count INTEGER DEFAULT 0
      )
    ''');

    // Create indexes for better performance
    await db.execute('CREATE INDEX idx_products_sku ON products(sku)');
    await db.execute('CREATE INDEX idx_products_barcode ON products(barcode)');
    await db.execute('CREATE INDEX idx_transactions_store ON transactions(store_id)');
    await db.execute('CREATE INDEX idx_transactions_synced ON transactions(synced)');
  }

  Future<void> initialize() async {
    if (kIsWeb) {
      // Skip database initialization on web
      return;
    }
    await database;
  }

  // Product operations
  Future<List<Product>> getProducts({String? search, String? category}) async {
    final db = await database;
    
    String whereClause = 'is_active = 1';
    List<dynamic> whereArgs = [];
    
    if (search != null && search.isNotEmpty) {
      whereClause += ' AND (name LIKE ? OR sku LIKE ? OR barcode = ?)';
      whereArgs.addAll(['%$search%', '%$search%', search]);
    }
    
    if (category != null && category.isNotEmpty) {
      whereClause += ' AND category = ?';
      whereArgs.add(category);
    }

    final result = await db.query(
      'products',
      where: whereClause,
      whereArgs: whereArgs,
      orderBy: 'name ASC',
    );

    return result.map((json) => Product.fromJson(_convertFromDb(json))).toList();
  }

  Future<Product?> getProductByBarcode(String barcode) async {
    final db = await database;
    final result = await db.query(
      'products',
      where: 'barcode = ? AND is_active = 1',
      whereArgs: [barcode],
      limit: 1,
    );

    if (result.isNotEmpty) {
      return Product.fromJson(_convertFromDb(result.first));
    }
    return null;
  }

  Future<void> insertProduct(Product product) async {
    final db = await database;
    await db.insert(
      'products',
      _convertToDb(product.toJson()),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> insertProducts(List<Product> products) async {
    final db = await database;
    final batch = db.batch();
    
    for (final product in products) {
      batch.insert(
        'products',
        _convertToDb(product.toJson()),
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }
    
    await batch.commit();
  }

  Future<void> updateProductStock(String productId, double quantity) async {
    final db = await database;
    await db.update(
      'products',
      {'stock_quantity': quantity},
      where: 'id = ?',
      whereArgs: [productId],
    );
  }

  // Transaction operations
  Future<String> insertTransaction(app_models.Transaction transaction) async {
    final db = await database;
    
    // Insert transaction
    await db.insert(
      'transactions',
      _convertToDb(transaction.toJson()),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );

    // Insert transaction items
    for (final item in transaction.items) {
      await db.insert('transaction_items', {
        'transaction_id': transaction.id,
        'product_id': item.productId,
        'product_name': item.productName,
        'sku': item.sku,
        'quantity': item.quantity,
        'unit_price': item.unitPrice,
        'discount_amount': item.discountAmount,
        'tax_type': item.taxType,
        'tax_amount': item.taxAmount,
        'line_total': item.lineTotal,
      });
    }

    // Insert payments
    for (final payment in transaction.payments) {
      await db.insert('payments', {
        'transaction_id': transaction.id,
        'method': payment.method,
        'amount': payment.amount,
        'reference': payment.reference,
      });
    }

    return transaction.id;
  }

  Future<List<app_models.Transaction>> getUnsyncedTransactions() async {
    final db = await database;
    final result = await db.query(
      'transactions',
      where: 'synced = 0',
      orderBy: 'created_at ASC',
    );

    List<app_models.Transaction> transactions = [];
    for (final transactionData in result) {
      final transaction = await _buildTransactionFromDb(transactionData);
      transactions.add(transaction);
    }

    return transactions;
  }

  Future<List<app_models.Transaction>> getTransactions({
    String? storeId,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final db = await database;
    
    String whereClause = '1=1';
    List<dynamic> whereArgs = [];
    
    if (storeId != null) {
      whereClause += ' AND store_id = ?';
      whereArgs.add(storeId);
    }
    
    if (startDate != null) {
      whereClause += ' AND created_at >= ?';
      whereArgs.add(startDate.toIso8601String());
    }
    
    if (endDate != null) {
      whereClause += ' AND created_at <= ?';
      whereArgs.add(endDate.toIso8601String());
    }

    final result = await db.query(
      'transactions',
      where: whereClause,
      whereArgs: whereArgs,
      orderBy: 'created_at DESC',
    );

    List<app_models.Transaction> transactions = [];
    for (final transactionData in result) {
      final transaction = await _buildTransactionFromDb(transactionData);
      transactions.add(transaction);
    }

    return transactions;
  }

  Future<void> markTransactionSynced(String transactionId) async {
    final db = await database;
    await db.update(
      'transactions',
      {'synced': 1},
      where: 'id = ?',
      whereArgs: [transactionId],
    );
  }

  // Sync queue operations
  Future<void> addToSyncQueue({
    required String entityType,
    required String entityId,
    required String operation,
    required Map<String, dynamic> data,
  }) async {
    final db = await database;
    await db.insert('sync_queue', {
      'entity_type': entityType,
      'entity_id': entityId,
      'operation': operation,
      'data': data.toString(),
      'created_at': DateTime.now().toIso8601String(),
      'retry_count': 0,
    });
  }

  Future<List<Map<String, dynamic>>> getSyncQueue() async {
    final db = await database;
    return await db.query(
      'sync_queue',
      orderBy: 'created_at ASC',
    );
  }

  Future<void> removeSyncQueueItem(int id) async {
    final db = await database;
    await db.delete(
      'sync_queue',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  // Helper methods
  Future<app_models.Transaction> _buildTransactionFromDb(Map<String, dynamic> transactionData) async {
    final db = await database;
    
    // Get transaction items
    final itemsResult = await db.query(
      'transaction_items',
      where: 'transaction_id = ?',
      whereArgs: [transactionData['id']],
    );
    
    final items = itemsResult.map((item) => app_models.TransactionItem.fromJson({
      'product_id': item['product_id'],
      'product_name': item['product_name'],
      'sku': item['sku'],
      'quantity': item['quantity'],
      'unit_price': item['unit_price'],
      'discount_amount': item['discount_amount'],
      'tax_type': item['tax_type'],
      'tax_amount': item['tax_amount'],
      'line_total': item['line_total'],
    })).toList();

    // Get payments
    final paymentsResult = await db.query(
      'payments',
      where: 'transaction_id = ?',
      whereArgs: [transactionData['id']],
    );
    
    final payments = paymentsResult.map((payment) => app_models.Payment.fromJson({
      'method': payment['method'],
      'amount': payment['amount'],
      'reference': payment['reference'],
    })).toList();

    return app_models.Transaction.fromJson({
      ...transactionData,
      'items': items.map((e) => e.toJson()).toList(),
      'payments': payments.map((e) => e.toJson()).toList(),
      'created_at': transactionData['created_at'],
    });
  }

  Map<String, dynamic> _convertToDb(Map<String, dynamic> json) {
    final result = Map<String, dynamic>.from(json);
    
    // Convert boolean to int for SQLite
    result.forEach((key, value) {
      if (value is bool) {
        result[key] = value ? 1 : 0;
      } else if (value is List) {
        result[key] = value.join(',');
      }
    });
    
    return result;
  }

  Map<String, dynamic> _convertFromDb(Map<String, dynamic> dbData) {
    final result = Map<String, dynamic>.from(dbData);
    
    // Convert int back to boolean
    result.forEach((key, value) {
      if (key.contains('is_') || key == 'synced') {
        result[key] = value == 1;
      } else if (key.contains('_ids') && value is String) {
        result[key] = value.split(',').where((s) => s.isNotEmpty).toList();
      }
    });
    
    return result;
  }

  Future<void> clearAllData() async {
    final db = await database;
    await db.delete('users');
    await db.delete('products');
    await db.delete('transactions');
    await db.delete('transaction_items');
    await db.delete('payments');
    await db.delete('sync_queue');
  }

  Future<void> close() async {
    final db = await database;
    await db.close();
  }
}