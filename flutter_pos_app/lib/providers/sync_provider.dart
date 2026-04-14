import 'package:flutter/foundation.dart';
import 'dart:async';
import '../services/sync_service.dart';

class SyncProvider extends ChangeNotifier {
  final SyncService _syncService;
  
  SyncStatus _status = SyncStatus(
    pendingTransactions: 0,
    pendingOperations: 0,
    isConnected: false,
    isSyncing: false,
  );
  DateTime? _lastCacheSyncAt;
  
  Timer? _statusTimer;

  SyncProvider(this._syncService) {
    _startStatusUpdates();
  }

  SyncStatus get status => _status;
  bool get isConnected => _status.isConnected;
  bool get isSyncing => _status.isSyncing;
  bool get hasPendingData => _status.hasPendingData;
  int get pendingCount => _status.totalPending;
  DateTime? get lastCacheSyncAt => _lastCacheSyncAt;

  void _startStatusUpdates() {
    _updateStatus();
    _statusTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      _updateStatus();
    });
  }

  Future<void> _updateStatus() async {
    try {
      _status = await _syncService.getSyncStatus();
      _lastCacheSyncAt = await _syncService.getLastCacheSyncAt();
      notifyListeners();
    } catch (e) {
      // Handle error silently
    }
  }

  Future<void> syncNow() async {
    if (_status.isSyncing) return;

    try {
      final result = await _syncService.syncPendingData();
      
      if (result.success && result.syncedCount > 0) {
        // Show success message or handle success
      }
      
      // Update status after sync
      await _updateStatus();
    } catch (e) {
      // Handle sync error
    }
  }

  void startSync() {
    // Start automatic sync when app opens
    syncNow();
  }

  @override
  void dispose() {
    _statusTimer?.cancel();
    _syncService.dispose();
    super.dispose();
  }
}