import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/sync_provider.dart';
import '../screens/pos_screen.dart';
import '../screens/products_screen.dart';
import '../screens/transactions_screen.dart';
import '../screens/analytics_screen.dart';
import '../screens/settings_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;
  
  final List<Widget> _screens = [
    const POSScreen(),
    const ProductsScreen(),
    const TransactionsScreen(),
    const AnalyticsScreen(),
    const SettingsScreen(),
  ];

  @override
  void initState() {
    super.initState();
    // Start sync when app opens
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SyncProvider>().startSync();
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final isTablet = MediaQuery.of(context).size.width >= 600;
    
    final navItems = [
      const NavigationDestination(
        icon: Icon(Icons.point_of_sale),
        label: 'POS',
      ),
      const NavigationDestination(
        icon: Icon(Icons.inventory),
        label: 'Products',
      ),
      const NavigationDestination(
        icon: Icon(Icons.receipt_long),
        label: 'Transactions',
      ),
      if (user?.isStoreAdmin == true || user?.isOrgAdmin == true)
        const NavigationDestination(
          icon: Icon(Icons.analytics),
          label: 'Analytics',
        ),
      const NavigationDestination(
        icon: Icon(Icons.settings),
        label: 'Settings',
      ),
    ];

    final railDestinations = [
      const NavigationRailDestination(
        icon: Icon(Icons.point_of_sale),
        label: Text('POS'),
      ),
      const NavigationRailDestination(
        icon: Icon(Icons.inventory),
        label: Text('Products'),
      ),
      const NavigationRailDestination(
        icon: Icon(Icons.receipt_long),
        label: Text('Transactions'),
      ),
      if (user?.isStoreAdmin == true || user?.isOrgAdmin == true)
        const NavigationRailDestination(
          icon: Icon(Icons.analytics),
          label: Text('Analytics'),
        ),
      const NavigationRailDestination(
        icon: Icon(Icons.settings),
        label: Text('Settings'),
      ),
    ];

    return Scaffold(
      body: Row(
        children: [
          if (isTablet)
            NavigationRail(
              selectedIndex: _selectedIndex,
              onDestinationSelected: (index) {
                setState(() {
                  _selectedIndex = index;
                });
              },
              labelType: NavigationRailLabelType.all,
              leading: Padding(
                padding: const EdgeInsets.symmetric(vertical: 20),
                child: Image.asset(
                  'assets/images/logo.png',
                  width: 40,
                  errorBuilder: (context, error, stackTrace) => const Icon(Icons.store, size: 40),
                ),
              ),
              destinations: railDestinations,
            ),
          Expanded(
            child: IndexedStack(
              index: _selectedIndex,
              children: _screens,
            ),
          ),
        ],
      ),
      bottomNavigationBar: isTablet ? null : NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) {
          setState(() {
            _selectedIndex = index;
          });
        },
        destinations: navItems,
      ),
      floatingActionButton: Consumer<SyncProvider>(
        builder: (context, syncProvider, child) {
          if (!syncProvider.hasPendingData) {
            return const SizedBox.shrink();
          }

          return FloatingActionButton.small(
            onPressed: syncProvider.isSyncing ? null : () {
              syncProvider.syncNow();
            },
            backgroundColor: syncProvider.isConnected ? Colors.blue : Colors.orange,
            child: syncProvider.isSyncing
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Icon(
                    syncProvider.isConnected ? Icons.sync : Icons.sync_disabled,
                    color: Colors.white,
                  ),
          );
        },
      ),
    );
  }
}

// Placeholder screens for other tabs
class ProductsScreen extends StatelessWidget {
  const ProductsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Products'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              // TODO: Add product functionality
            },
          ),
        ],
      ),
      body: const Center(
        child: Text('Products Screen - Coming Soon'),
      ),
    );
  }
}

class TransactionsScreen extends StatelessWidget {
  const TransactionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Transactions'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () {
              // TODO: Filter transactions
            },
          ),
        ],
      ),
      body: const Center(
        child: Text('Transactions Screen - Coming Soon'),
      ),
    );
  }
}

class AnalyticsScreen extends StatelessWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Analytics'),
      ),
      body: const Center(
        child: Text('Analytics Screen - Coming Soon'),
      ),
    );
  }
}

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: Consumer<AuthProvider>(
        builder: (context, authProvider, child) {
          final user = authProvider.user;
          
          return ListView(
            children: [
              // User Info
              ListTile(
                leading: const CircleAvatar(
                  child: Icon(Icons.person),
                ),
                title: Text(user?.fullName ?? 'Unknown User'),
                subtitle: Text(user?.email ?? ''),
              ),
              
              const Divider(),
              
              // Sync Status
              Consumer<SyncProvider>(
                builder: (context, syncProvider, child) {
                  return ListTile(
                    leading: Icon(
                      syncProvider.isConnected ? Icons.cloud_done : Icons.cloud_off,
                      color: syncProvider.isConnected ? Colors.green : Colors.red,
                    ),
                    title: const Text('Sync Status'),
                    subtitle: Text(
                      syncProvider.isConnected 
                          ? 'Connected - ${syncProvider.pendingCount} pending'
                          : 'Offline - ${syncProvider.pendingCount} pending',
                    ),
                    trailing: syncProvider.isSyncing
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : IconButton(
                            icon: const Icon(Icons.sync),
                            onPressed: () => syncProvider.syncNow(),
                          ),
                  );
                },
              ),
              
              const Divider(),
              
              // Logout
              ListTile(
                leading: const Icon(Icons.logout, color: Colors.red),
                title: const Text('Logout'),
                onTap: () {
                  showDialog(
                    context: context,
                    builder: (context) => AlertDialog(
                      title: const Text('Logout'),
                      content: const Text('Are you sure you want to logout?'),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.of(context).pop(),
                          child: const Text('Cancel'),
                        ),
                        TextButton(
                          onPressed: () {
                            Navigator.of(context).pop();
                            authProvider.logout();
                            Navigator.of(context).pushReplacementNamed('/login');
                          },
                          child: const Text('Logout'),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ],
          );
        },
      ),
    );
  }
}