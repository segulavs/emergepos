import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../providers/auth_provider.dart';
import '../widgets/offline_cached_notice.dart';

class TransfersScreen extends StatefulWidget {
  const TransfersScreen({super.key});

  @override
  State<TransfersScreen> createState() => _TransfersScreenState();
}

class _TransfersScreenState extends State<TransfersScreen> {
  List<Map<String, dynamic>> _transfers = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadTransfers();
  }

  Future<void> _loadTransfers() async {
    setState(() => _isLoading = true);
    try {
      final apiService = context.read<ApiService>();
      final transfers = await apiService.getTransfers();
      setState(() {
        _transfers = transfers;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load transfers: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final canManage = authProvider.user?.isStoreAdmin == true || 
                      authProvider.user?.isOrgAdmin == true;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Transfers'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadTransfers,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: Column(
        children: [
          const OfflineCachedNotice(),
          Expanded(
            child: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _transfers.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.swap_horiz_outlined, size: 64, color: Colors.grey),
                      const SizedBox(height: 16),
                      Text(
                        'No transfers found',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadTransfers,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _transfers.length,
                    itemBuilder: (context, index) {
                      final transfer = _transfers[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          title: Text(
                            '#${transfer['transfer_number'] ?? 'N/A'}',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('From: ${transfer['source_store_id'] ?? 'N/A'}'),
                              Text('To: ${transfer['destination_store_id'] ?? 'N/A'}'),
                              Text('Items: ${transfer['items']?.length ?? 0}'),
                              if (transfer['created_at'] != null)
                                Text(DateFormat('MMM dd, yyyy').format(
                                  DateTime.parse(transfer['created_at']),
                                )),
                            ],
                          ),
                          trailing: _getStatusChip(transfer['status']),
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

  Widget _getStatusChip(String? status) {
    Color color;
    switch (status?.toLowerCase()) {
      case 'received':
        color = Colors.green;
        break;
      case 'dispatched':
        color = Colors.blue;
        break;
      case 'cancelled':
        color = Colors.red;
        break;
      default:
        color = Colors.grey;
    }

    return Chip(
      label: Text(
        (status ?? 'draft').toUpperCase(),
        style: const TextStyle(fontSize: 10, color: Colors.white),
      ),
      backgroundColor: color,
    );
  }
}
