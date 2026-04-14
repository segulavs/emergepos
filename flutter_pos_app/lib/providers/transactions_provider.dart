import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';
import '../models/transaction.dart';
import '../services/api_service.dart';
import '../services/database_service.dart';

class TransactionsProvider extends ChangeNotifier {
  final ApiService _apiService;
  final DatabaseService? _databaseService;
  final Uuid _uuid = const Uuid();
  
  List<Transaction> _transactions = [];
  bool _isLoading = false;
  String? _error;

  TransactionsProvider(this._apiService, this._databaseService);

  List<Transaction> get transactions => _transactions;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<Transaction> createTransaction({
    required String storeId,
    required List<TransactionItem> items,
    required List<Payment> payments,
    String? customerName,
    String? customerPhone,
    double discountAmount = 0,
  }) async {
    try {
      final subtotal = items.fold(0.0, (sum, item) => sum + item.lineTotal);
      final taxAmount = items.fold(0.0, (sum, item) => sum + item.taxAmount);
      final total = subtotal - discountAmount + taxAmount;

      final transaction = Transaction(
        id: _uuid.v4(),
        organizationId: '', // Will be set by backend
        storeId: storeId,
        receiptNumber: _generateReceiptNumber(),
        transactionType: 'sale',
        status: 'completed',
        items: items,
        subtotal: subtotal,
        discountAmount: discountAmount,
        taxAmount: taxAmount,
        total: total,
        payments: payments,
        cashierId: '', // Will be set by backend
        cashierName: '', // Will be set by backend
        customerName: customerName,
        customerPhone: customerPhone,
        notes: '',
        createdAt: DateTime.now(),
        localId: _uuid.v4(),
        synced: false,
      );

      // Save locally first
      await _databaseService?.insertTransaction(transaction);

      // Try to sync immediately
      try {
        final syncedTransaction = await _apiService.createTransaction(transaction.toJson());
        // Mark as synced
        await _databaseService?.markTransactionSynced(transaction.id);
        
        // Update local transaction with server data
        final updatedTransaction = transaction.copyWith(
          id: syncedTransaction.id,
          organizationId: syncedTransaction.organizationId,
          receiptNumber: syncedTransaction.receiptNumber,
          cashierId: syncedTransaction.cashierId,
          cashierName: syncedTransaction.cashierName,
          synced: true,
        );

        _transactions.insert(0, updatedTransaction);
        notifyListeners();
        
        return updatedTransaction;
      } catch (e) {
        // If sync fails, keep local transaction
        _transactions.insert(0, transaction);
        notifyListeners();
        
        return transaction;
      }
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<void> loadTransactions({String? storeId}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Load from local database first
      if (_databaseService != null) {
        _transactions = await _databaseService!.getTransactions(storeId: storeId);
      }
      notifyListeners();

      // Try to load from API for latest data
      try {
        final apiTransactions = await _apiService.getTransactions(storeId: storeId);
        _transactions = apiTransactions;
        if (_databaseService != null) {
          for (final transaction in apiTransactions) {
            await _databaseService!.insertTransaction(
              transaction.copyWith(
                synced: true,
                localId: transaction.localId ?? transaction.id,
              ),
            );
          }
        }
        notifyListeners();
      } catch (e) {
        // API failed, but we have local data
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  String _generateReceiptNumber() {
    final now = DateTime.now();
    final dateStr = '${now.year}${now.month.toString().padLeft(2, '0')}${now.day.toString().padLeft(2, '0')}';
    final timeStr = '${now.hour.toString().padLeft(2, '0')}${now.minute.toString().padLeft(2, '0')}${now.second.toString().padLeft(2, '0')}';
    return 'LOCAL-$dateStr-$timeStr';
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}

extension TransactionCopyWith on Transaction {
  Transaction copyWith({
    String? id,
    String? organizationId,
    String? storeId,
    String? receiptNumber,
    String? transactionType,
    String? status,
    List<TransactionItem>? items,
    double? subtotal,
    double? discountAmount,
    double? taxAmount,
    double? total,
    List<Payment>? payments,
    String? cashierId,
    String? cashierName,
    String? customerName,
    String? customerPhone,
    String? notes,
    DateTime? createdAt,
    String? localId,
    bool? synced,
  }) {
    return Transaction(
      id: id ?? this.id,
      organizationId: organizationId ?? this.organizationId,
      storeId: storeId ?? this.storeId,
      receiptNumber: receiptNumber ?? this.receiptNumber,
      transactionType: transactionType ?? this.transactionType,
      status: status ?? this.status,
      items: items ?? this.items,
      subtotal: subtotal ?? this.subtotal,
      discountAmount: discountAmount ?? this.discountAmount,
      taxAmount: taxAmount ?? this.taxAmount,
      total: total ?? this.total,
      payments: payments ?? this.payments,
      cashierId: cashierId ?? this.cashierId,
      cashierName: cashierName ?? this.cashierName,
      customerName: customerName ?? this.customerName,
      customerPhone: customerPhone ?? this.customerPhone,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
      localId: localId ?? this.localId,
      synced: synced ?? this.synced,
    );
  }
}