import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../widgets/offline_cached_notice.dart';

class WarehousesScreen extends StatefulWidget {
  const WarehousesScreen({super.key});

  @override
  State<WarehousesScreen> createState() => _WarehousesScreenState();
}

class _WarehousesScreenState extends State<WarehousesScreen> {
  List<Map<String, dynamic>> _warehouses = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadWarehouses();
  }

  Future<void> _loadWarehouses() async {
    setState(() => _isLoading = true);
    try {
      final apiService = context.read<ApiService>();
      final warehouses = await apiService.getWarehouses();
      setState(() {
        _warehouses = warehouses;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load warehouses: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Warehouses'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadWarehouses,
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
          : _warehouses.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.warehouse_outlined, size: 64, color: Colors.grey),
                      const SizedBox(height: 16),
                      Text(
                        'No warehouses found',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadWarehouses,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _warehouses.length,
                    itemBuilder: (context, index) {
                      final warehouse = _warehouses[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: Icon(
                            Icons.warehouse,
                            color: warehouse['is_active'] == true ? Colors.green : Colors.grey,
                          ),
                          title: Text(
                            warehouse['name'] ?? 'Unknown',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Code: ${warehouse['code'] ?? 'N/A'}'),
                              if (warehouse['address'] != null)
                                Text('📍 ${warehouse['address']['city'] ?? ''}'),
                            ],
                          ),
                          trailing: warehouse['is_active'] == true
                              ? const Chip(
                                  label: Text('Active'),
                                  backgroundColor: Colors.green,
                                  labelStyle: TextStyle(color: Colors.white, fontSize: 11),
                                )
                              : const Chip(
                                  label: Text('Inactive'),
                                  backgroundColor: Colors.grey,
                                  labelStyle: TextStyle(color: Colors.white, fontSize: 11),
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
}
