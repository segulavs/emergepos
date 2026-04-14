import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../providers/auth_provider.dart';
import '../widgets/offline_cached_notice.dart';

class StoresScreen extends StatefulWidget {
  const StoresScreen({super.key});

  @override
  State<StoresScreen> createState() => _StoresScreenState();
}

class _StoresScreenState extends State<StoresScreen> {
  List<Map<String, dynamic>> _stores = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadStores();
  }

  Future<void> _loadStores() async {
    setState(() => _isLoading = true);
    try {
      final apiService = context.read<ApiService>();
      final stores = await apiService.getStores();
      setState(() {
        _stores = stores;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load stores: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final canEdit = authProvider.user?.isOrgAdmin == true;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Stores'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadStores,
            tooltip: 'Refresh',
          ),
          if (canEdit)
            IconButton(
              icon: const Icon(Icons.add),
              onPressed: () => _showStoreDialog(context, null),
              tooltip: 'Add Store',
            ),
        ],
      ),
      body: Column(
        children: [
          const OfflineCachedNotice(),
          Expanded(
            child: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _stores.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.store_outlined, size: 64, color: Colors.grey),
                      const SizedBox(height: 16),
                      Text(
                        'No stores found',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadStores,
                  child: GridView.builder(
                    padding: const EdgeInsets.all(16),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16,
                      childAspectRatio: 1.1,
                    ),
                    itemCount: _stores.length,
                    itemBuilder: (context, index) {
                      final store = _stores[index];
                      return Card(
                        child: InkWell(
                          onTap: canEdit ? () => _showStoreDialog(context, store) : null,
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        store['name'] ?? 'Unknown',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16,
                                        ),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    Chip(
                                      label: Text(
                                        store['is_active'] == true ? 'Active' : 'Inactive',
                                        style: const TextStyle(fontSize: 10),
                                      ),
                                      backgroundColor: store['is_active'] == true
                                          ? Colors.green.shade50
                                          : Colors.grey.shade200,
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Code: ${store['code'] ?? 'N/A'}',
                                  style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                                ),
                                if (store['address'] != null) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    store['address']['city'] ?? '',
                                    style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                                  ),
                                ],
                                if (store['phone'] != null) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    '📞 ${store['phone']}',
                                    style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
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

  void _showStoreDialog(BuildContext context, Map<String, dynamic>? store) {
    // TODO: Implement store create/edit dialog
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Store dialog coming soon')),
    );
  }
}
