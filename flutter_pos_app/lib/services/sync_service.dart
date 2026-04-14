import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'api_service.dart';
import 'database_service.dart';

class SyncService {
  final ApiService _apiService;
  final DatabaseService? _databaseService;
  final Connectivity _connectivity = Connectivity();
  
  bool _isSyncing = false;
  Timer? _syncTimer;
  StreamSubscription<ConnectivityResult>? _connectivitySubscription;

  SyncService(this._apiService, this._databaseService) {
    _startConnectivityListener();
    _startPeriodicSync();
  }

  void _startConnectivityListener() {
    _connectivitySubscription = _connectivity.onConnectivityChanged.listen((result) {
      final isConnected = result == ConnectivityResult.mobile || 
        result == ConnectivityResult.wifi ||
        result == ConnectivityResult.ethernet;
      
      if (isConnected && !_isSyncing) {
        syncPendingData();
      }
    });
  }

  void _startPeriodicSync() {
    _syncTimer = Timer.periodic(const Duration(minutes: 5), (timer) {
      if (!_isSyncing) {
        syncPendingData();
      }
    });
  }

  Future<bool> isConnected() async {
    final result = await _connectivity.checkConnectivity();
    return result == ConnectivityResult.mobile || 
      result == ConnectivityResult.wifi ||
      result == ConnectivityResult.ethernet;
  }

  Future<SyncResult> syncPendingData() async {
    if (_databaseService == null) {
      return SyncResult(success: false, message: 'Database not available on web');
    }
    
    if (_isSyncing) {
      return SyncResult(success: false, message: 'Sync already in progress');
    }

    _isSyncing = true;
    
    try {
      if (!await isConnected()) {
        return SyncResult(success: false, message: 'No internet connection');
      }

      // Check if API is healthy
      if (!await _apiService.checkHealth()) {
        return SyncResult(success: false, message: 'Server is not available');
      }

      int syncedCount = 0;
      List<String> errors = [];

      // Sync transactions
      final unsyncedTransactions = await _databaseService!.getUnsyncedTransactions();
      
      for (final transaction in unsyncedTransactions) {
        try {
          await _apiService.syncTransaction(transaction);
          await _databaseService!.markTransactionSynced(transaction.id);
          syncedCount++;
        } catch (e) {
          errors.add('Transaction ${transaction.receiptNumber}: $e');
        }
      }

      // Sync other pending operations from sync queue
      final syncQueue = await _databaseService!.getSyncQueue();
      
      for (final item in syncQueue) {
        try {
          await _syncQueueItem(item);
          await _databaseService!.removeSyncQueueItem(item['id']);
          syncedCount++;
        } catch (e) {
          errors.add('${item['entity_type']} ${item['entity_id']}: $e');
        }
      }

      // Download latest products if needed
      await _syncProducts();
      await _refreshReferenceData();

      final message = syncedCount > 0 
          ? 'Synced $syncedCount items successfully'
          : 'All data is up to date';

      return SyncResult(
        success: true,
        message: message,
        syncedCount: syncedCount,
        errors: errors,
      );

    } catch (e) {
      return SyncResult(success: false, message: 'Sync failed: $e');
    } finally {
      _isSyncing = false;
    }
  }

  Future<void> _syncQueueItem(Map<String, dynamic> item) async {
    final entityType = item['entity_type'];
    final operation = item['operation'];
    final data = jsonDecode(item['data']);

    switch (entityType) {
      case 'stock_movement':
        await _apiService.syncStockMovement(data);
        break;
      case 'product':
        if (operation == 'create') {
          await _apiService.createProduct(data);
        } else if (operation == 'update') {
          await _apiService.updateProduct(data['id'], data);
        }
        break;
      default:
        throw Exception('Unknown entity type: $entityType');
    }
  }

  Future<void> _syncProducts() async {
    try {
      // Get products from API (this should include stock levels)
      final products = await _apiService.getProducts();
      
      // Update local database
      if (_databaseService != null) {
        await _databaseService!.insertProducts(products);
      }
    } catch (e) {
      // Don't throw error for product sync failure
      if (kDebugMode) {
        print('Failed to sync products: $e');
      }
    }
  }

  Future<void> _refreshReferenceData() async {
    try {
      await _apiService.getStores();
    } catch (_) {}

    try {
      await _apiService.getUsers();
    } catch (_) {}

    try {
      await _apiService.getWarehouses();
    } catch (_) {}

    try {
      await _apiService.getTransfers();
    } catch (_) {}

    try {
      await _apiService.getDashboardData();
    } catch (_) {}
  }

  Future<void> queueForSync({
    required String entityType,
    required String entityId,
    required String operation,
    required Map<String, dynamic> data,
  }) async {
    await _databaseService?.addToSyncQueue(
      entityType: entityType,
      entityId: entityId,
      operation: operation,
      data: data,
    );
  }

  Future<SyncStatus> getSyncStatus() async {
    if (_databaseService == null) {
      return SyncStatus(
        pendingTransactions: 0,
        pendingOperations: 0,
        isConnected: await isConnected(),
        isSyncing: _isSyncing,
      );
    }
    
    final unsyncedTransactions = await _databaseService!.getUnsyncedTransactions();
    final syncQueue = await _databaseService!.getSyncQueue();
    
    return SyncStatus(
      pendingTransactions: unsyncedTransactions.length,
      pendingOperations: syncQueue.length,
      isConnected: await isConnected(),
      isSyncing: _isSyncing,
    );
  }

  Future<DateTime?> getLastCacheSyncAt() async {
    return _apiService.getLastCacheSyncAt();
  }

  void dispose() {
    _syncTimer?.cancel();
    _connectivitySubscription?.cancel();
  }
}

class SyncResult {
  final bool success;
  final String message;
  final int syncedCount;
  final List<String> errors;

  SyncResult({
    required this.success,
    required this.message,
    this.syncedCount = 0,
    this.errors = const [],
  });
}

class SyncStatus {
  final int pendingTransactions;
  final int pendingOperations;
  final bool isConnected;
  final bool isSyncing;

  SyncStatus({
    required this.pendingTransactions,
    required this.pendingOperations,
    required this.isConnected,
    required this.isSyncing,
  });

  int get totalPending => pendingTransactions + pendingOperations;
  bool get hasPendingData => totalPending > 0;
}