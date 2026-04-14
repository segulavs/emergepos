import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/transactions_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/store_selection_provider.dart';
import '../services/api_service.dart';
import '../models/transaction.dart';
import '../widgets/offline_cached_notice.dart';

class TransactionsScreen extends StatefulWidget {
  const TransactionsScreen({super.key});

  @override
  State<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends State<TransactionsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final storeProvider = context.read<StoreSelectionProvider>();
      if (storeProvider.stores.isEmpty) {
        storeProvider.loadStores().then((_) {
          if (storeProvider.selectedStoreId != null) {
            context.read<TransactionsProvider>().loadTransactions(
              storeId: storeProvider.selectedStoreId,
            );
          }
        });
      } else if (storeProvider.selectedStoreId != null) {
        context.read<TransactionsProvider>().loadTransactions(
          storeId: storeProvider.selectedStoreId,
        );
      } else {
        context.read<TransactionsProvider>().loadTransactions();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final transactionsProvider = context.watch<TransactionsProvider>();
    final authProvider = context.watch<AuthProvider>();
    final storeProvider = context.watch<StoreSelectionProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Transactions'),
        actions: [
          if (storeProvider.selectedStoreName != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8.0),
              child: Center(
                child: Chip(
                  avatar: const Icon(Icons.store, size: 18),
                  label: Text(
                    storeProvider.selectedStoreName ?? '',
                    style: const TextStyle(fontSize: 12),
                  ),
                  backgroundColor: Colors.blue.shade100,
                ),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              transactionsProvider.loadTransactions(
                storeId: storeProvider.selectedStoreId,
              );
            },
            tooltip: 'Refresh',
          ),
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () => _showFilterDialog(context),
            tooltip: 'Filter',
          ),
        ],
      ),
      body: Column(
        children: [
          const OfflineCachedNotice(),
          Expanded(
            child: transactionsProvider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : transactionsProvider.transactions.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.receipt_long_outlined, size: 64, color: Colors.grey),
                      const SizedBox(height: 16),
                      Text(
                        'No transactions found',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: () => transactionsProvider.loadTransactions(),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: transactionsProvider.transactions.length,
                    itemBuilder: (context, index) {
                      final transaction = transactionsProvider.transactions[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: InkWell(
                          onTap: () => _showTransactionDetails(context, transaction),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      '#${transaction.receiptNumber}',
                                      style: const TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    _getStatusBadge(transaction.status),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          DateFormat('MMM dd, yyyy HH:mm').format(transaction.createdAt),
                                          style: TextStyle(
                                            color: Colors.grey.shade600,
                                            fontSize: 12,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '${transaction.items.length} items',
                                          style: TextStyle(
                                            color: Colors.grey.shade600,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Text(
                                          'K${transaction.total.toStringAsFixed(2)}',
                                          style: TextStyle(
                                            fontSize: 20,
                                            fontWeight: FontWeight.bold,
                                            color: transaction.transactionType == 'refund'
                                                ? Colors.red
                                                : Colors.green,
                                          ),
                                        ),
                                        if (transaction.payments.isNotEmpty)
                                          Chip(
                                            label: Text(
                                              transaction.payments.first.method.toUpperCase(),
                                              style: const TextStyle(fontSize: 10),
                                            ),
                                            backgroundColor: Colors.blue.shade50,
                                          ),
                                      ],
                                    ),
                                  ],
                                ),
                                if (transaction.cashierName != null) ...[
                                  const SizedBox(height: 8),
                                  Text(
                                    'Cashier: ${transaction.cashierName}',
                                    style: TextStyle(
                                      color: Colors.grey.shade600,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
          ),
        ],
      ),
    );
  }

  Widget _getStatusBadge(String status) {
    Color color;
    switch (status.toLowerCase()) {
      case 'completed':
        color = Colors.green;
        break;
      case 'voided':
        color = Colors.red;
        break;
      case 'refunded':
        color = Colors.orange;
        break;
      default:
        color = Colors.grey;
    }

    return Chip(
      label: Text(
        status.toUpperCase(),
        style: const TextStyle(fontSize: 10, color: Colors.white),
      ),
      backgroundColor: color,
      padding: EdgeInsets.zero,
    );
  }

  void _showTransactionDetails(BuildContext context, Transaction transaction) {
    final apiService = context.read<ApiService>();
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (context, scrollController) => Container(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Transaction Details',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const Divider(),
              Expanded(
                child: SingleChildScrollView(
                  controller: scrollController,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildDetailRow('Receipt Number', '#${transaction.receiptNumber}'),
                      _buildDetailRow('Date', DateFormat('MMM dd, yyyy HH:mm').format(transaction.createdAt)),
                      if (transaction.cashierName != null)
                        _buildDetailRow('Cashier', transaction.cashierName!),
                      _buildDetailRow('Status', transaction.status.toUpperCase()),
                      const SizedBox(height: 16),
                      const Text(
                        'Items',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      ...transaction.items.map((item) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(item.productName, style: const TextStyle(fontWeight: FontWeight.w500)),
                                  if (item.brand != null)
                                    Text(
                                      'Brand: ${item.brand}',
                                      style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                                    ),
                                ],
                              ),
                            ),
                            Text(
                              '${item.quantity} x K${item.unitPrice.toStringAsFixed(2)}',
                              style: const TextStyle(fontWeight: FontWeight.w500),
                            ),
                            Text(
                              'K${item.lineTotal.toStringAsFixed(2)}',
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      )),
                      const Divider(),
                      _buildDetailRow('Subtotal', 'K${transaction.subtotal.toStringAsFixed(2)}'),
                      if (transaction.discountAmount > 0)
                        _buildDetailRow('Discount', '-K${transaction.discountAmount.toStringAsFixed(2)}'),
                      _buildDetailRow('Tax (VAT)', 'K${transaction.taxAmount.toStringAsFixed(2)}'),
                      const SizedBox(height: 8),
                      _buildDetailRow(
                        'Total',
                        'K${transaction.total.toStringAsFixed(2)}',
                        isBold: true,
                        isLarge: true,
                      ),
                      if (transaction.payments.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        const Text(
                          'Payment',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        _buildDetailRow(
                          'Method',
                          transaction.payments.first.method.toUpperCase(),
                        ),
                        _buildDetailRow(
                          'Amount',
                          'K${transaction.payments.first.amount.toStringAsFixed(2)}',
                        ),
                        if (transaction.payments.first.amount > transaction.total)
                          _buildDetailRow(
                            'Change',
                            'K${(transaction.payments.first.amount - transaction.total).toStringAsFixed(2)}',
                          ),
                      ],
                      if (transaction.voidedReason != null) ...[
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.red.shade50,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Void Reason:',
                                style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red),
                              ),
                              const SizedBox(height: 4),
                              Text(transaction.voidedReason!),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              if (transaction.status == 'completed' && transaction.transactionType == 'sale')
                Padding(
                  padding: const EdgeInsets.only(top: 16),
                  child: Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            Navigator.pop(context);
                            _voidTransaction(context, transaction);
                          },
                          icon: const Icon(Icons.cancel),
                          label: const Text('Void Transaction'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.red,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, {bool isBold = false, bool isLarge = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: Colors.grey.shade600,
              fontSize: isLarge ? 18 : 14,
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: isLarge ? 20 : 14,
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }

  void _showFilterDialog(BuildContext context) {
    // TODO: Implement date range and status filters
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Filter Transactions'),
        content: const Text('Filter functionality coming soon'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _voidTransaction(BuildContext context, Transaction transaction) {
    final reasonController = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Void Transaction'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('This action cannot be undone. Please provide a reason:'),
            const SizedBox(height: 16),
            TextField(
              controller: reasonController,
              decoration: const InputDecoration(
                labelText: 'Reason',
                hintText: 'Enter reason for voiding...',
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (reasonController.text.trim().isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Please provide a reason')),
                );
                return;
              }

              final apiService = context.read<ApiService>();
              final transactionsProvider = context.read<TransactionsProvider>();
              
              try {
                await apiService.voidTransaction(transaction.id, reasonController.text);
                transactionsProvider.loadTransactions();
                if (context.mounted) {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Transaction voided')),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error: ${e.toString()}')),
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Void'),
          ),
        ],
      ),
    );
  }
}
