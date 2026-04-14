import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../providers/auth_provider.dart';
import '../widgets/offline_cached_notice.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? _dashboardData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    setState(() => _isLoading = true);
    try {
      final apiService = context.read<ApiService>();
      final data = await apiService.getDashboardData();
      setState(() {
        _dashboardData = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load dashboard: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadDashboardData,
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
          : RefreshIndicator(
              onRefresh: _loadDashboardData,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Stats Cards
                    _buildStatsGrid(),
                    const SizedBox(height: 24),
                    
                    // Quick Stats
                    _buildQuickStats(),
                    const SizedBox(height: 24),
                    
                    // Low Stock Alerts
                    if (_dashboardData?['low_stock_alerts'] != null &&
                        (_dashboardData!['low_stock_alerts'] as List).isNotEmpty)
                      _buildLowStockAlerts(),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsGrid() {
    final today = _dashboardData?['today'] ?? {};
    final week = _dashboardData?['week'] ?? {};
    final month = _dashboardData?['month'] ?? {};

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      childAspectRatio: 1.5,
      children: [
        _buildStatCard(
          'Today\'s Sales',
          _formatCurrency(today['sales'] ?? 0),
          '${today['transactions'] ?? 0} transactions',
          Colors.green,
          Icons.today,
        ),
        _buildStatCard(
          'This Week',
          _formatCurrency(week['sales'] ?? 0),
          '${week['transactions'] ?? 0} transactions',
          Colors.blue,
          Icons.date_range,
        ),
        _buildStatCard(
          'This Month',
          _formatCurrency(month['sales'] ?? 0),
          '${month['transactions'] ?? 0} transactions',
          Colors.purple,
          Icons.calendar_month,
        ),
        _buildStatCard(
          'Tax Collected (Today)',
          _formatCurrency(today['tax'] ?? 0),
          'VAT @ 16%',
          Colors.orange,
          Icons.receipt,
        ),
      ],
    );
  }

  Widget _buildStatCard(String title, String value, String subtitle, Color color, IconData icon) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Icon(icon, color: color, size: 24),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade600,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 11,
                color: Colors.grey.shade600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickStats() {
    final storeCount = _dashboardData?['store_count'] ?? 0;
    final productCount = _dashboardData?['product_count'] ?? 0;
    final lowStockCount = _dashboardData?['low_stock_alerts']?.length ?? 0;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Quick Stats',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildQuickStatItem('Active Stores', storeCount.toString(), Icons.store, Colors.blue),
                ),
                Expanded(
                  child: _buildQuickStatItem('Products', productCount.toString(), Icons.inventory_2, Colors.green),
                ),
                Expanded(
                  child: _buildQuickStatItem('Low Stock Alerts', lowStockCount.toString(), Icons.warning, Colors.orange),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickStatItem(String label, String value, IconData icon, Color color) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: color, size: 32),
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey.shade600,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildLowStockAlerts() {
    final alerts = _dashboardData?['low_stock_alerts'] as List? ?? [];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.warning, color: Colors.red.shade600),
                const SizedBox(width: 8),
                Text(
                  'Low Stock Alerts',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: Colors.red.shade600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...alerts.take(5).map((alert) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          alert['product_name'] ?? 'Unknown',
                          style: const TextStyle(fontWeight: FontWeight.w500),
                        ),
                        Text(
                          'SKU: ${alert['sku'] ?? 'N/A'}',
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '${alert['quantity'] ?? 0} units',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.red.shade600,
                        ),
                      ),
                      Text(
                        'Reorder: ${alert['reorder_level'] ?? 0}',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                      ),
                    ],
                  ),
                ],
              ),
            )),
          ],
        ),
      ),
    );
  }

  String _formatCurrency(dynamic amount) {
    if (amount is num) {
      return 'K${amount.toStringAsFixed(2)}';
    }
    return 'K0.00';
  }
}
