import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../providers/auth_provider.dart';
import '../providers/store_selection_provider.dart';
import '../widgets/offline_cached_notice.dart';
import 'settings_screen.dart';

class InventoryScreen extends StatefulWidget {
  const InventoryScreen({super.key});

  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> {
  List<Map<String, dynamic>> _stock = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    // Load stores if not loaded
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final storeProvider = context.read<StoreSelectionProvider>();
      if (storeProvider.stores.isEmpty) {
        storeProvider.loadStores().then((_) {
          if (storeProvider.selectedStoreId != null) {
            _loadStock(storeProvider.selectedStoreId!);
          }
        });
      } else if (storeProvider.selectedStoreId != null) {
        _loadStock(storeProvider.selectedStoreId!);
      }
    });
  }

  Future<void> _loadStock(String storeId) async {
    setState(() => _isLoading = true);
    try {
      final apiService = context.read<ApiService>();
      final stock = await apiService.getStoreStock(storeId);
      setState(() {
        _stock = stock;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load stock: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Inventory'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              final storeId = context.read<StoreSelectionProvider>().selectedStoreId;
              if (storeId != null) _loadStock(storeId);
            },
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: Column(
        children: [
          const OfflineCachedNotice(),
          Expanded(
            child: Consumer<StoreSelectionProvider>(
        builder: (context, storeProvider, _) {
          final selectedStoreId = storeProvider.selectedStoreId;
          
          if (selectedStoreId == null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.store_outlined, size: 64, color: Colors.orange),
                  const SizedBox(height: 16),
                  const Text(
                    'No Store Selected',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Please select a store in Settings',
                    style: TextStyle(color: Colors.grey),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const SettingsScreen(),
                        ),
                      );
                    },
                    icon: const Icon(Icons.settings),
                    label: const Text('Go to Settings'),
                  ),
                ],
              ),
            );
          }

          // Load stock when store changes
          if (_stock.isEmpty && !_isLoading) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              _loadStock(selectedStoreId);
            });
          }

          return Column(
              children: [
                // Summary Cards
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Expanded(
                        child: _buildSummaryCard(
                          'Total Products',
                          _stock.length.toString(),
                          Colors.blue,
                          Icons.inventory_2,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _buildSummaryCard(
                          'In Stock',
                          _stock.where((s) => (s['quantity'] ?? 0) > (s['reorder_level'] ?? 0)).length.toString(),
                          Colors.green,
                          Icons.check_circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _buildSummaryCard(
                          'Low Stock',
                          _stock.where((s) {
                            final qty = s['quantity'] ?? 0;
                            final reorder = s['reorder_level'] ?? 0;
                            return qty > 0 && qty <= reorder;
                          }).length.toString(),
                          Colors.orange,
                          Icons.warning,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _buildSummaryCard(
                          'Out of Stock',
                          _stock.where((s) => (s['quantity'] ?? 0) <= 0).length.toString(),
                          Colors.red,
                          Icons.cancel,
                        ),
                      ),
                    ],
                  ),
                ),

                // Store Info
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Card(
                    color: Colors.blue.shade50,
                    child: ListTile(
                      leading: const Icon(Icons.store, color: Colors.blue),
                      title: Text(
                        'Current Store: ${storeProvider.selectedStoreName ?? 'Unknown'}',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      trailing: IconButton(
                        icon: const Icon(Icons.refresh),
                        onPressed: () => _loadStock(selectedStoreId),
                      ),
                    ),
                  ),
                ),

                // Stock List
                Expanded(
                  child: _isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : _stock.isEmpty
                          ? const Center(child: Text('No stock records found'))
                          : ListView.builder(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              itemCount: _stock.length,
                              itemBuilder: (context, index) {
                                final item = _stock[index];
                                final qty = item['quantity'] ?? 0.0;
                                final reorder = item['reorder_level'] ?? 0.0;
                                
                                Color statusColor;
                                String statusText;
                                if (qty <= 0) {
                                  statusColor = Colors.red;
                                  statusText = 'Out of Stock';
                                } else if (qty <= reorder) {
                                  statusColor = Colors.orange;
                                  statusText = 'Low Stock';
                                } else {
                                  statusColor = Colors.green;
                                  statusText = 'In Stock';
                                }

                                return Card(
                                  margin: const EdgeInsets.only(bottom: 8),
                                  child: ListTile(
                                    title: Text(item['product_name'] ?? 'Unknown'),
                                    subtitle: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('SKU: ${item['sku'] ?? 'N/A'}'),
                                        const SizedBox(height: 4),
                                        Row(
                                          children: [
                                            Text('Qty: '),
                                            Text(
                                              qty.toStringAsFixed(0),
                                              style: TextStyle(
                                                fontWeight: FontWeight.bold,
                                                color: statusColor,
                                              ),
                                            ),
                                            const SizedBox(width: 16),
                                            Text('Reorder: ${reorder.toStringAsFixed(0)}'),
                                          ],
                                        ),
                                      ],
                                    ),
                                    trailing: Chip(
                                      label: Text(statusText),
                                      backgroundColor: statusColor.withOpacity(0.1),
                                      labelStyle: TextStyle(color: statusColor, fontSize: 11),
                                    ),
                                  ),
                                );
                              },
                            ),
                ),
              ],
            );
        },
      ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard(String title, String value, Color color, IconData icon) {
    return Card(
      color: color.withOpacity(0.1),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              title,
              style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
